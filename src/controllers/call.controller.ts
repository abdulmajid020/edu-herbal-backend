import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";
import { normalizePhone, phonesMatch } from "../utils/phoneFormatter";

export class CallController {
  public static async getCalls(req: Request, res: Response) {
    const { search, type, status } = req.query;

    try {
      let dbCalls: any[] = [];
      try {
        const whereClause: any = {};
        if (type && typeof type === "string") {
          whereClause.type = type.toLowerCase();
        }
        if (status && typeof status === "string") {
          whereClause.status = status.toLowerCase();
        }
        if (search && typeof search === "string") {
          whereClause.OR = [
            { patientName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { note: { contains: search, mode: "insensitive" } },
          ];
        }

        dbCalls = await prisma.callLog.findMany({
          where: whereClause,
          orderBy: { id: "desc" },
        });
      } catch (dbErr) {
        console.warn("[CALL LOGS DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      let list = dbCalls.length > 0
        ? dbCalls.map((c) => ({
            id: c.id,
            patient: c.patientName,
            phone: c.phone,
            time: c.timeLabel,
            type: c.type,
            duration: c.duration || "0:00",
            status: c.status,
            note: c.note,
            createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
          }))
        : [...MemoryStore.callLogs];

      if (dbCalls.length === 0) {
        if (type && typeof type === "string") {
          list = list.filter((c) => c.type.toLowerCase() === type.toLowerCase());
        }
        if (status && typeof status === "string") {
          list = list.filter((c) => c.status.toLowerCase() === status.toLowerCase());
        }
        if (search && typeof search === "string") {
          const q = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.patient.toLowerCase().includes(q) ||
              c.phone.includes(q) ||
              (c.note && c.note.toLowerCase().includes(q))
          );
        }
      }

      const stats = {
        incoming: list.filter((c) => c.type === "incoming").length,
        missed: list.filter((c) => c.type === "missed").length,
        returned: list.filter((c) => c.type === "returned").length,
      };

      return res.status(200).json({
        success: true,
        stats,
        count: list.length,
        data: list,
      });
    } catch (err: any) {
      console.error("Get calls error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch call logs." });
    }
  }

  public static async logCall(req: Request, res: Response) {
    const { patientName, phone, mode, attemptedAt, note, type, status } = req.body;

    const normalizedNumber = normalizePhone(phone || "");
    const timeLabel = attemptedAt || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const callType = (type || (mode === "WhatsApp" ? "incoming" : "returned")) as "incoming" | "missed" | "returned";
    const callStatus = (status || "unresolved") as "resolved" | "unresolved";
    const logNote = note || `Staff dialed ${patientName || "Patient"} via ${mode || "Phone"}.`;

    try {
      let createdLog: any = null;

      try {
        const dbEntry = await prisma.callLog.create({
          data: {
            patientName: (patientName || "Patient").trim(),
            phone: normalizedNumber,
            timeLabel,
            type: callType,
            duration: "0:00",
            status: callStatus,
            note: logNote,
          },
        });

        createdLog = {
          id: dbEntry.id,
          patient: dbEntry.patientName,
          phone: dbEntry.phone,
          time: dbEntry.timeLabel,
          type: dbEntry.type,
          duration: dbEntry.duration,
          status: dbEntry.status,
          note: dbEntry.note,
          createdAt: dbEntry.createdAt.toISOString(),
        };

        // Update patient call count in DB
        await prisma.patient.updateMany({
          where: { phone: normalizedNumber },
          data: {
            callCount: { increment: 1 },
            lastCallAt: timeLabel,
            lastCallMode: mode || "Phone",
          },
        }).catch(() => null);
      } catch (dbErr) {
        console.warn("[LOG CALL DB CREATE WARNING]", dbErr);
      }

      const newLog = createdLog || {
        id: Date.now(),
        patient: (patientName || "Patient").trim(),
        phone: normalizedNumber,
        time: timeLabel,
        type: callType,
        duration: "0:00",
        status: callStatus,
        note: logNote,
        createdAt: new Date().toISOString(),
      };

      MemoryStore.callLogs.unshift(newLog);

      // Update in MemoryStore
      const patient = MemoryStore.patients.find((p) => phonesMatch(p.phone, normalizedNumber));
      if (patient) {
        patient.callCount += 1;
        patient.lastCallAt = timeLabel;
        patient.lastCallMode = mode || "Phone";
      }

      return res.status(201).json({
        success: true,
        message: `${mode || "Call"} logged for ${patientName || "patient"}.`,
        data: newLog,
      });
    } catch (err: any) {
      console.error("Log call error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to log call." });
    }
  }

  public static async updateNote(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { note } = req.body;

    try {
      try {
        await prisma.callLog.update({
          where: { id },
          data: { note },
        }).catch(() => null);
      } catch {}

      const call = MemoryStore.callLogs.find((c) => c.id === id);
      if (call) {
        call.note = note;
      }

      return res.status(200).json({
        success: true,
        message: "Call note updated.",
        data: call || { id, note },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to update call note." });
    }
  }

  public static async toggleStatus(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);

    try {
      let currentStatus: "resolved" | "unresolved" = "unresolved";

      try {
        const dbEntry = await prisma.callLog.findUnique({ where: { id } });
        if (dbEntry) {
          currentStatus = dbEntry.status;
          const nextStatus = currentStatus === "resolved" ? "unresolved" : "resolved";
          await prisma.callLog.update({
            where: { id },
            data: { status: nextStatus },
          });
          currentStatus = nextStatus;
        }
      } catch {}

      const call = MemoryStore.callLogs.find((c) => c.id === id);
      if (call) {
        call.status = call.status === "resolved" ? "unresolved" : "resolved";
        currentStatus = call.status;
      }

      return res.status(200).json({
        success: true,
        message: `Call status toggled to ${currentStatus}.`,
        newStatus: currentStatus,
        data: call || { id, status: currentStatus },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to toggle call status." });
    }
  }

  public static async markQrScan(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const attemptedAt = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const scanNote = `QR scan completed at ${attemptedAt}.`;

    try {
      try {
        const existing = await prisma.callLog.findUnique({ where: { id } });
        if (existing) {
          const updatedNote = existing.note ? `${existing.note} ${scanNote}` : scanNote;
          await prisma.callLog.update({
            where: { id },
            data: { note: updatedNote },
          });
        }
      } catch {}

      const call = MemoryStore.callLogs.find((c) => c.id === id);
      if (call) {
        call.note = call.note ? `${call.note} ${scanNote}` : scanNote;
      }

      return res.status(200).json({
        success: true,
        message: "QR scan recorded.",
        data: call || { id, note: scanNote },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to record QR scan." });
    }
  }
}

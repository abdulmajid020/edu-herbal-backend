import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";

export class CallController {
  public static async getCalls(req: Request, res: Response) {
    const { search, type, status } = req.query;
    let list = [...MemoryStore.callLogs];

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

    const stats = {
      incoming: MemoryStore.callLogs.filter((c) => c.type === "incoming").length,
      missed: MemoryStore.callLogs.filter((c) => c.type === "missed").length,
      returned: MemoryStore.callLogs.filter((c) => c.type === "returned").length,
    };

    return res.status(200).json({
      success: true,
      stats,
      count: list.length,
      data: list,
    });
  }

  public static async logCall(req: Request, res: Response) {
    const { patientName, phone, mode, attemptedAt } = req.body;

    const normalizedNumber = normalizePhone(phone || "");
    const timeLabel = attemptedAt || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const newLog = {
      id: Date.now(),
      patient: patientName || "Patient",
      phone: normalizedNumber,
      time: timeLabel,
      type: "returned" as const,
      duration: "0:00",
      status: "resolved" as const,
      note: `Staff dialed ${patientName || "Patient"} via ${mode || "Phone"}.`,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.callLogs.unshift(newLog);

    // Update patient call count if exists
    const patient = MemoryStore.patients.find((p) => p.phone === normalizedNumber);
    if (patient) {
      patient.callCount += 1;
      patient.lastCallAt = timeLabel;
      patient.lastCallMode = mode || "Phone";
    }

    return res.status(200).json({
      success: true,
      message: `${mode || "Call"} logged for ${patientName || "patient"}.`,
      data: newLog,
    });
  }

  public static async updateNote(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { note } = req.body;

    const call = MemoryStore.callLogs.find((c) => c.id === id);
    if (!call) {
      return res.status(404).json({ success: false, error: "Call log entry not found." });
    }

    call.note = note || "";
    return res.status(200).json({
      success: true,
      message: "Call note updated.",
      data: call,
    });
  }

  public static async toggleStatus(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const call = MemoryStore.callLogs.find((c) => c.id === id);

    if (!call) {
      return res.status(404).json({ success: false, error: "Call log entry not found." });
    }

    call.status = call.status === "resolved" ? "unresolved" : "resolved";
    return res.status(200).json({
      success: true,
      newStatus: call.status,
      data: call,
    });
  }

  public static async markQrScan(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const call = MemoryStore.callLogs.find((c) => c.id === id);

    if (!call) {
      return res.status(404).json({ success: false, error: "Call log not found." });
    }

    const timestamp = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    call.note = `${call.note || ""} · QR code scanned by patient at ${timestamp}`.trim();
    call.status = "unresolved";

    return res.status(200).json({
      success: true,
      message: "QR scan logged. WhatsApp channel activated.",
      data: call,
    });
  }
}

import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";
import { normalizePhone, phonesMatch } from "../utils/phoneFormatter";
import { SmsService } from "../services/sms.service";

export class AppointmentController {
  public static async getDoctors(req: Request, res: Response) {
    try {
      let dbDoctors: any[] = [];
      try {
        dbDoctors = await prisma.doctor.findMany({
          where: { isActive: true },
          orderBy: { id: "asc" },
        });
      } catch (dbErr) {
        console.warn("[DOCTORS DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      const list = dbDoctors.length > 0
        ? dbDoctors.map((d) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            initials: d.initials,
            slots: d.availableSlots && d.availableSlots.length > 0 ? d.availableSlots : ["09:00 AM", "10:00 AM", "02:00 PM", "03:00 PM"],
          }))
        : MemoryStore.doctors;

      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch doctors." });
    }
  }

  public static async getAppointments(req: Request, res: Response) {
    const { date, status, doctorId } = req.query;

    try {
      let list = [...MemoryStore.appointments];

      if (date && typeof date === "string") {
        list = list.filter((a) => a.date === date);
      }
      if (status && typeof status === "string") {
        list = list.filter((a) => a.status.toLowerCase() === status.toLowerCase());
      }
      if (doctorId) {
        list = list.filter((a) => a.doctorId === Number(doctorId));
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch appointments." });
    }
  }

  public static async getTodayAppointments(req: Request, res: Response) {
    const today = new Date().toISOString().split("T")[0];
    const todayList = MemoryStore.appointments.filter((a) => a.date === today || a.date === "Today");

    return res.status(200).json({
      success: true,
      count: todayList.length,
      data: todayList,
    });
  }

  public static async createAppointment(req: Request, res: Response) {
    const { service, doctorId, fullName, phone, email, notes, date, time } = req.body;

    if (!service || !fullName || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "Service, doctor, full name, phone number, date, and time slot are required.",
      });
    }

    const normalizedPhone = normalizePhone(phone);
    const doctor = MemoryStore.doctors.find((d) => d.id === Number(doctorId)) || MemoryStore.doctors[0];
    const isTelemedicine = service.toLowerCase().includes("telemedicine") || service.toLowerCase().includes("video");

    const newAppointment = {
      id: Date.now(),
      patientName: fullName.trim(),
      phone: normalizedPhone,
      email: email ? email.trim() : null,
      service: service.trim(),
      doctorId: doctor.id,
      doctorName: doctor.name,
      date,
      time,
      status: "Confirmed" as const,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.appointments.unshift(newAppointment);

    // Save to PostgreSQL if available
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        await prisma.appointment.create({
          data: {
            patientName: fullName.trim(),
            phone: normalizedPhone,
            email: email ? email.trim() : null,
            service: service.trim(),
            doctorId: doctor.id,
            doctorName: doctor.name,
            date: parsedDate,
            time,
            status: "Confirmed",
            notes: notes || null,
          },
        }).catch(() => null);
      }
    } catch (dbErr) {
      console.warn("[APPOINTMENT DB CREATE WARNING]", dbErr);
    }

    let routedTo: "crm" | "callcentre" = "crm";

    if (isTelemedicine) {
      // ─── Route to Call Centre ─────────────────────────────────────────────
      routedTo = "callcentre";
      const callEntry = {
        id: Date.now() + 2,
        patient: fullName.trim(),
        phone: normalizedPhone,
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        type: "incoming" as const,
        duration: "0:00",
        status: "unresolved" as const,
        note: `Telemedicine request received for ${service}. Patient phone: ${normalizedPhone}. Preferred slot: ${date} at ${time}. ${notes ? `Note: ${notes}` : ""}`.trim(),
        createdAt: new Date().toISOString(),
      };

      MemoryStore.callLogs.unshift(callEntry);

      try {
        await prisma.callLog.create({
          data: {
            patientName: fullName.trim(),
            phone: normalizedPhone,
            callType: "incoming",
            duration: "0:00",
            status: "unresolved",
            note: callEntry.note,
          },
        }).catch(() => null);
      } catch {}
    } else {
      // ─── Route to CRM Patients Directory ──────────────────────────────────
      routedTo = "crm";
      const existingPatient = MemoryStore.patients.find(
        (p) => phonesMatch(p.phone, normalizedPhone) || p.name.toLowerCase() === fullName.trim().toLowerCase()
      );

      if (existingPatient) {
        existingPatient.condition = service.trim();
        existingPatient.nextAppt = `${date} · ${time}`;
        existingPatient.doctor = doctor.name;
        existingPatient.status = "Active";
      } else {
        const newPatient = {
          id: Date.now() + 1,
          name: fullName.trim(),
          phone: normalizedPhone,
          condition: service.trim(),
          lastVisit: "Just booked",
          nextAppt: `${date} · ${time}`,
          doctor: doctor.name,
          status: "Active" as const,
          balance: 0,
          products: [service.trim()],
          callCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        MemoryStore.patients.unshift(newPatient);

        try {
          await prisma.patient.upsert({
            where: { phone: normalizedPhone },
            update: {
              condition: service.trim(),
              nextAppt: `${date} · ${time}`,
            },
            create: {
              name: fullName.trim(),
              phone: normalizedPhone,
              condition: service.trim(),
              status: "Active",
              balance: 0,
              lastVisit: "Just booked",
              nextAppt: `${date} · ${time}`,
            },
          }).catch(() => null);
        } catch {}
      }
    }

    // Auto-dispatch confirmation SMS
    const smsResult = await SmsService.sendAppointmentConfirmation({
      fullName: fullName.trim(),
      phone: normalizedPhone,
      doctorName: doctor.name,
      date,
      time,
    });

    return res.status(201).json({
      success: true,
      message: isTelemedicine
        ? "Telemedicine session requested and routed to Call Centre. Confirmation SMS prepared."
        : "Appointment confirmed and recorded in Patient CRM. Confirmation SMS prepared.",
      data: newAppointment,
      routedTo,
      sms: smsResult,
    });
  }

  public static async updateStatus(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;

    const appt = MemoryStore.appointments.find((a) => a.id === id);
    if (!appt) {
      return res.status(404).json({ success: false, error: "Appointment not found." });
    }

    appt.status = status;
    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appt,
    });
  }

  public static async deleteAppointment(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const index = MemoryStore.appointments.findIndex((a) => a.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "Appointment not found." });
    }

    MemoryStore.appointments.splice(index, 1);
    return res.status(200).json({
      success: true,
      message: "Appointment cancelled and removed.",
    });
  }
}

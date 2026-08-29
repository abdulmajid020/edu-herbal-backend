import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";
import { SmsService } from "../services/sms.service";

export class AppointmentController {
  public static async getDoctors(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: MemoryStore.doctors,
    });
  }

  public static async getAppointments(req: Request, res: Response) {
    const { date, status, doctorId } = req.query;
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

    const newAppointment = {
      id: Date.now(),
      patientName: fullName.trim(),
      phone: normalizedPhone,
      email: email ? email.trim() : null,
      service,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date,
      time,
      status: "Confirmed" as const,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.appointments.unshift(newAppointment);

    // If telemedicine is requested, auto-route entry to Call Centre
    if (service.toLowerCase().includes("telemedicine") || service.toLowerCase().includes("video")) {
      MemoryStore.callLogs.unshift({
        id: Date.now() + 2,
        patient: fullName.trim(),
        phone: normalizedPhone,
        time: time,
        type: "incoming",
        duration: "0:00",
        status: "unresolved",
        note: `Telemedicine booking: ${service} with ${doctor.name} on ${date}. Send WhatsApp link.`,
        createdAt: new Date().toISOString(),
      });
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
      message: "Appointment confirmed successfully.",
      data: newAppointment,
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

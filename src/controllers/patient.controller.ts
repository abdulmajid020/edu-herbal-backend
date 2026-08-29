import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";
import { SmsService } from "../services/sms.service";

export class PatientController {
  public static async getPatients(req: Request, res: Response) {
    const { search, status } = req.query;
    let list = [...MemoryStore.patients];

    if (status && typeof status === "string") {
      list = list.filter((p) => p.status.toLowerCase() === status.toLowerCase());
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.condition.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
      groups: {
        active: list.filter((p) => p.status === "Active"),
        followUp: list.filter((p) => p.status === "Follow-up"),
        pending: list.filter((p) => p.status === "Pending"),
      },
    });
  }

  public static async getPatientById(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const patient = MemoryStore.patients.find((p) => p.id === id);

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    const patientAppointments = MemoryStore.appointments.filter(
      (a) => a.phone === patient.phone || a.patientName === patient.name
    );
    const patientCalls = MemoryStore.callLogs.filter(
      (c) => c.phone === patient.phone || c.patient === patient.name
    );
    const patientPayments = MemoryStore.payments.filter(
      (p) => p.recipientNumber === patient.phone || p.recipientName === patient.name
    );

    return res.status(200).json({
      success: true,
      data: {
        ...patient,
        appointments: patientAppointments,
        callLogs: patientCalls,
        payments: patientPayments,
      },
    });
  }

  public static async createPatient(req: Request, res: Response) {
    const { name, phone, condition, doctorId, date, time } = req.body;

    if (!name || !phone || !condition) {
      return res.status(400).json({ success: false, error: "Name, phone, and condition are required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const doctor = MemoryStore.doctors.find((d) => d.id === Number(doctorId)) || MemoryStore.doctors[0];

    const newPatient = {
      id: Date.now(),
      name: name.trim(),
      phone: normalizedPhone,
      condition: condition.trim(),
      status: "Pending" as const,
      assignedDoctorId: doctor.id,
      assignedDoctorName: doctor.name,
      balance: 0,
      lastVisit: "Just added",
      nextAppt: date && time ? `${date} · ${time}` : "Pending",
      callCount: 0,
      products: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MemoryStore.patients.unshift(newPatient);

    // If appointment details provided, schedule appointment and dispatch confirmation SMS
    let smsResult = null;
    if (date && time) {
      const newAppointment = {
        id: Date.now() + 1,
        patientName: newPatient.name,
        phone: normalizedPhone,
        service: condition,
        doctorId: doctor.id,
        doctorName: doctor.name,
        date,
        time,
        status: "Confirmed" as const,
        patientId: newPatient.id,
        createdAt: new Date().toISOString(),
      };
      MemoryStore.appointments.unshift(newAppointment);

      smsResult = await SmsService.sendAppointmentConfirmation({
        fullName: newPatient.name,
        phone: normalizedPhone,
        doctorName: doctor.name,
        date,
        time,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      data: newPatient,
      sms: smsResult,
    });
  }

  public static async updatePatient(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const patientIndex = MemoryStore.patients.findIndex((p) => p.id === id);

    if (patientIndex === -1) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    const current = MemoryStore.patients[patientIndex];
    const { name, condition, status, balance, assignedDoctorId, nextAppt } = req.body;

    const doctor = assignedDoctorId
      ? MemoryStore.doctors.find((d) => d.id === Number(assignedDoctorId))
      : undefined;

    const updated = {
      ...current,
      ...(name && { name }),
      ...(condition && { condition }),
      ...(status && { status }),
      ...(balance !== undefined && { balance: Number(balance) }),
      ...(doctor && { assignedDoctorId: doctor.id, assignedDoctorName: doctor.name }),
      ...(nextAppt && { nextAppt }),
      updatedAt: new Date().toISOString(),
    };

    MemoryStore.patients[patientIndex] = updated;

    return res.status(200).json({
      success: true,
      message: "Patient record updated successfully.",
      data: updated,
    });
  }

  public static async deletePatient(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const patientIndex = MemoryStore.patients.findIndex((p) => p.id === id);

    if (patientIndex === -1) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    const removed = MemoryStore.patients.splice(patientIndex, 1)[0];

    return res.status(200).json({
      success: true,
      message: `Patient ${removed.name} removed successfully.`,
    });
  }
}

import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";
import { SmsService } from "../services/sms.service";
import { comparePassword, hashPassword } from "../utils/password";

export class PatientController {
  public static async getPatients(req: Request, res: Response) {
    const { search, status } = req.query;

    try {
      let dbPatients: any[] = [];
      try {
        dbPatients = await prisma.patient.findMany({
          orderBy: { createdAt: "desc" },
          include: { assignedDoctor: true },
        });
      } catch (dbErr) {
        console.warn("[PATIENTS DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      let list = dbPatients.length > 0
        ? dbPatients.map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            email: p.email,
            condition: p.condition,
            status: p.status === "Follow_up" ? "Follow-up" : p.status,
            assignedDoctorId: p.assignedDoctorId,
            assignedDoctorName: p.assignedDoctor?.name || "Dr. Edu Mohammed",
            balance: Number(p.balance || 0),
            lastVisit: p.lastVisit || "Active",
            nextAppt: p.nextAppt || "Pending",
            callCount: p.callCount || 0,
            lastCallAt: p.lastCallAt,
            lastCallMode: p.lastCallMode,
            createdAt: p.createdAt?.toISOString?.() || p.createdAt,
            updatedAt: p.updatedAt?.toISOString?.() || p.updatedAt,
          }))
        : [...MemoryStore.patients];

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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch patients." });
    }
  }

  public static async getPatientById(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    let patient = MemoryStore.patients.find((p) => p.id === id);

    if (!patient) {
      try {
        const dbPatient = await prisma.patient.findUnique({
          where: { id },
          include: { appointments: true, callLogs: true, payments: true, assignedDoctor: true },
        });
        if (dbPatient) {
          patient = {
            id: dbPatient.id,
            name: dbPatient.name,
            phone: dbPatient.phone,
            email: dbPatient.email,
            condition: dbPatient.condition,
            status: (dbPatient.status === "Follow_up" ? "Follow-up" : dbPatient.status) as any,
            assignedDoctorId: dbPatient.assignedDoctorId || undefined,
            assignedDoctorName: dbPatient.assignedDoctor?.name || undefined,
            balance: Number(dbPatient.balance || 0),
            lastVisit: dbPatient.lastVisit || undefined,
            nextAppt: dbPatient.nextAppt || undefined,
            callCount: dbPatient.callCount,
            lastCallAt: dbPatient.lastCallAt || undefined,
            lastCallMode: dbPatient.lastCallMode as any,
            createdAt: dbPatient.createdAt.toISOString(),
            updatedAt: dbPatient.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn("[PATIENT BY ID DB ERROR]", err);
      }
    }

    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found." });
    }

    const patientAppointments = MemoryStore.appointments.filter(
      (a) => a.phone === patient!.phone || a.patientName === patient!.name
    );
    const patientCalls = MemoryStore.callLogs.filter(
      (c) => c.phone === patient!.phone || c.patient === patient!.name
    );
    const patientPayments = MemoryStore.payments.filter(
      (p) => p.recipientNumber === patient!.phone || p.recipientName === patient!.name
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

    // Save to PostgreSQL DB
    try {
      await prisma.patient.upsert({
        where: { phone: normalizedPhone },
        update: {
          name: newPatient.name,
          condition: newPatient.condition,
          assignedDoctorId: doctor.id,
          nextAppt: newPatient.nextAppt,
        },
        create: {
          name: newPatient.name,
          phone: normalizedPhone,
          condition: newPatient.condition,
          status: "Pending",
          assignedDoctorId: doctor.id,
          balance: 0,
          lastVisit: "Just added",
          nextAppt: newPatient.nextAppt,
        },
      });
    } catch (dbErr) {
      console.warn("[CREATE PATIENT DB WARNING]", dbErr);
    }

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

      try {
        await prisma.appointment.create({
          data: {
            patientName: newPatient.name,
            phone: normalizedPhone,
            service: condition,
            doctorId: doctor.id,
            doctorName: doctor.name,
            date: new Date(date),
            time,
            status: "Confirmed",
          },
        });
      } catch (apptDbErr) {
        console.warn("[CREATE APPT DB WARNING]", apptDbErr);
      }

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

    // Sync update to DB
    try {
      const mappedStatus = status === "Follow-up" ? "Follow_up" : status;
      await prisma.patient.updateMany({
        where: { phone: current.phone },
        data: {
          ...(name && { name }),
          ...(condition && { condition }),
          ...(mappedStatus && { status: mappedStatus as any }),
          ...(balance !== undefined && { balance: Number(balance) }),
          ...(doctor && { assignedDoctorId: doctor.id }),
          ...(nextAppt && { nextAppt }),
        },
      });
    } catch (dbErr) {
      console.warn("[UPDATE PATIENT DB WARNING]", dbErr);
    }

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

    try {
      await prisma.patient.deleteMany({
        where: { phone: removed.phone },
      });
    } catch (dbErr) {
      console.warn("[DELETE PATIENT DB WARNING]", dbErr);
    }

    return res.status(200).json({
      success: true,
      message: `Patient ${removed.name} removed successfully.`,
    });
  }

  public static async patientLogin(req: Request, res: Response) {
    const { email, phone, password } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();
    const rawPhone = String(phone || "").trim();
    const trimmedPassword = (password || "").trim();

    if (!cleanedEmail || !rawPhone || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        error: "Email address, phone number, and password are all required to sign in.",
      });
    }

    const normalized = normalizePhone(rawPhone);

    // Look up in memory store
    let patient = MemoryStore.patients.find(
      (p) =>
        (p.email && p.email.toLowerCase() === cleanedEmail) ||
        normalizePhone(p.phone) === normalized ||
        (p.phone && p.phone.replace(/\D/g, "") === normalized.replace(/\D/g, ""))
    );

    // If not in memory store, look up in PostgreSQL DB
    if (!patient) {
      try {
        const dbPatient = await prisma.patient.findFirst({
          where: {
            OR: [
              { email: cleanedEmail },
              { phone: normalized },
            ],
          },
          include: { assignedDoctor: true },
        });

        if (dbPatient) {
          patient = {
            id: dbPatient.id,
            name: dbPatient.name,
            email: dbPatient.email || cleanedEmail,
            phone: dbPatient.phone,
            condition: dbPatient.condition,
            status: (dbPatient.status === "Follow_up" ? "Follow-up" : dbPatient.status) as any,
            assignedDoctorId: dbPatient.assignedDoctorId || undefined,
            assignedDoctorName: dbPatient.assignedDoctor?.name || "Dr. Edu Mohammed",
            balance: Number(dbPatient.balance || 0),
            lastVisit: dbPatient.lastVisit || "Active",
            nextAppt: dbPatient.nextAppt || "Not scheduled",
            callCount: dbPatient.callCount || 0,
            products: [],
            createdAt: dbPatient.createdAt.toISOString(),
            updatedAt: dbPatient.updatedAt.toISOString(),
          };
          MemoryStore.patients.unshift(patient);
        }
      } catch (dbErr) {
        console.warn("[PATIENT LOGIN DB SEARCH ERROR]", dbErr);
      }
    }

    if (!patient) {
      return res.status(401).json({
        success: false,
        error: "Invalid email, phone number, or password. If you are new, please Sign Up.",
      });
    }

    const storedHash = (patient as any).passwordHash || MemoryStore.passwords[cleanedEmail] || MemoryStore.passwords[patient.phone];
    let isMatch = false;

    if (storedHash) {
      isMatch = await comparePassword(trimmedPassword, storedHash);
    } else {
      isMatch = trimmedPassword.length >= 6;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Incorrect password. Please verify your credentials or reset your password.",
      });
    }

    // Ensure email is attached to patient record
    if (!patient.email && cleanedEmail) {
      patient.email = cleanedEmail;
      prisma.patient.updateMany({
        where: { phone: patient.phone },
        data: { email: cleanedEmail },
      }).catch(() => null);
    }

    const appointments = MemoryStore.appointments.filter(
      (a) =>
        normalizePhone(a.phone) === normalized ||
        (a.email && a.email.toLowerCase() === cleanedEmail) ||
        a.patientName.toLowerCase() === patient!.name.toLowerCase()
    );
    const payments = MemoryStore.payments.filter(
      (p) =>
        normalizePhone(p.recipientNumber) === normalized ||
        p.recipientName.toLowerCase() === patient!.name.toLowerCase()
    );
    const orders = MemoryStore.orders.filter(
      (o) =>
        normalizePhone(o.recipientNumber) === normalized ||
        o.recipientName.toLowerCase() === patient!.name.toLowerCase()
    );

    return res.status(200).json({
      success: true,
      message: `Welcome back to your Patient Portal, ${patient.name}!`,
      patient,
      appointments,
      payments,
      orders,
    });
  }

  public static async patientSignup(req: Request, res: Response) {
    const { name, email, phone, password, confirmPassword, condition } = req.body;
    const cleanedName = (name || "").trim();
    const cleanedEmail = (email || "").trim().toLowerCase();
    const rawPhone = String(phone || "").trim();
    const trimmedPassword = (password || "").trim();

    if (!cleanedName || !cleanedEmail || !rawPhone || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        error: "Full name, email address, phone number, and password are required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    if (confirmPassword && trimmedPassword !== confirmPassword.trim()) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
    }

    const normalized = normalizePhone(rawPhone);
    const existing = MemoryStore.patients.find(
      (p) =>
        (p.email && p.email.toLowerCase() === cleanedEmail) ||
        normalizePhone(p.phone) === normalized
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "A patient account is already registered with this email or phone number. Please Sign In.",
      });
    }

    const hashedPassword = await hashPassword(trimmedPassword);
    const doctor = MemoryStore.doctors[0];

    const newPatient = {
      id: Date.now(),
      name: cleanedName,
      email: cleanedEmail,
      phone: normalized,
      passwordHash: hashedPassword,
      condition: condition?.trim() || "General Wellness",
      status: "Active" as const,
      assignedDoctorId: doctor?.id,
      assignedDoctorName: doctor?.name,
      balance: 0,
      lastVisit: "Today",
      nextAppt: "Not scheduled",
      callCount: 0,
      products: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MemoryStore.patients.unshift(newPatient);
    MemoryStore.passwords[cleanedEmail] = hashedPassword;
    MemoryStore.passwords[normalized] = hashedPassword;

    // ── Save directly to PostgreSQL Database ──
    try {
      await prisma.patient.upsert({
        where: { phone: normalized },
        update: {
          name: cleanedName,
          email: cleanedEmail,
          condition: newPatient.condition,
          status: "Active",
          assignedDoctorId: doctor?.id,
        },
        create: {
          name: cleanedName,
          email: cleanedEmail,
          phone: normalized,
          condition: newPatient.condition,
          status: "Active",
          assignedDoctorId: doctor?.id,
          balance: 0,
          lastVisit: "Today",
          nextAppt: "Not scheduled",
        },
      });
      console.log(`[DB SUCCESS] Patient ${cleanedName} persisted in PostgreSQL database.`);
    } catch (dbErr) {
      console.warn("[PATIENT SIGNUP DB WARNING]", dbErr);
    }

    return res.status(201).json({
      success: true,
      message: "Patient account registered successfully! You can now sign in.",
      patient: newPatient,
    });
  }

  public static async patientResetPassword(req: Request, res: Response) {
    const { email, phone, newPassword, confirmPassword } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();
    const rawPhone = String(phone || "").trim();
    const trimmedNewPassword = (newPassword || "").trim();

    if (!cleanedEmail || !rawPhone || !trimmedNewPassword) {
      return res.status(400).json({
        success: false,
        error: "Email, phone number, and a new password are required.",
      });
    }

    if (trimmedNewPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    if (confirmPassword && trimmedNewPassword !== confirmPassword.trim()) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
    }

    const normalized = normalizePhone(rawPhone);
    const patient = MemoryStore.patients.find(
      (p) =>
        (p.email && p.email.toLowerCase() === cleanedEmail) ||
        normalizePhone(p.phone) === normalized
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: "No patient account was found matching that email and phone number.",
      });
    }

    const hashedPassword = await hashPassword(trimmedNewPassword);
    (patient as any).passwordHash = hashedPassword;
    MemoryStore.passwords[cleanedEmail] = hashedPassword;
    MemoryStore.passwords[normalized] = hashedPassword;

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now sign in with your new password.",
    });
  }
}



import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";
import bcrypt from "bcryptjs";

interface StaffAnnouncement {
  id: number;
  title: string;
  message: string;
  author?: string;
  createdAt: string;
}

let staffAnnouncements: StaffAnnouncement[] = [
  {
    id: 1,
    title: "Monthly All-Staff Clinical Briefing",
    message: "Reminder: All clinical and dispensary staff are requested to attend the monthly patient care review this Friday at 4:30 PM.",
    author: "Dr. Edu Mohammed",
    createdAt: new Date().toISOString(),
  },
];

export class StaffController {
  public static async getStaffList(req: Request, res: Response) {
    const { status } = req.query;

    try {
      let dbStaff: any[] = [];
      try {
        const whereClause: any = {};
        if (status && typeof status === "string") {
          const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          whereClause.status = formattedStatus;
        }

        dbStaff = await prisma.staffAccount.findMany({
          where: whereClause,
          orderBy: { id: "asc" },
        });
      } catch (dbErr) {
        console.warn("[STAFF DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      let list = dbStaff.length > 0
        ? dbStaff.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            role: s.role,
            dept: s.department,
            department: s.department,
            schedule: s.schedule,
            status: s.status as "Present" | "Leave" | "Remote",
          }))
        : [...MemoryStore.staff];

      if (dbStaff.length === 0 && status && typeof status === "string") {
        list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
      }

      const allList: any[] = dbStaff.length > 0 ? list : MemoryStore.staff;
      const counts = {
        present: allList.filter((s: any) => s.status === "Present").length,
        leave: allList.filter((s: any) => s.status === "Leave").length,
        remote: allList.filter((s: any) => s.status === "Remote").length,
      };

      return res.status(200).json({
        success: true,
        counts,
        data: list,
        announcements: staffAnnouncements,
      });
    } catch (err: any) {
      console.error("Get staff list error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch staff members." });
    }
  }

  public static async createStaff(req: Request, res: Response) {
    const { name, email, phone, role, department, dept, schedule, status, password } = req.body;

    if (!name || !role) {
      return res.status(400).json({ success: false, error: "Staff name and role are required." });
    }

    const assignedDept = department || dept || "Clinical";
    const assignedSchedule = schedule || "8AM–5PM";
    const assignedStatus = (status || "Present") as "Present" | "Leave" | "Remote";
    const formattedEmail = email ? email.trim().toLowerCase() : `${name.toLowerCase().replace(/\s+/g, ".")}@eduherbal.com`;
    const formattedPhone = phone ? phone.trim() : "+233240000000";
    const defaultPassword = password || "EduHerbal@2026";

    try {
      let createdStaff: any = null;

      try {
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const dbEntry = await prisma.staffAccount.create({
          data: {
            name: name.trim(),
            email: formattedEmail,
            phone: formattedPhone,
            passwordHash,
            role: role.trim(),
            department: assignedDept.trim(),
            schedule: assignedSchedule.trim(),
            status: assignedStatus,
          },
        });

        createdStaff = {
          id: dbEntry.id,
          name: dbEntry.name,
          email: dbEntry.email,
          phone: dbEntry.phone,
          role: dbEntry.role,
          dept: dbEntry.department,
          department: dbEntry.department,
          schedule: dbEntry.schedule,
          status: dbEntry.status,
        };
      } catch (dbErr) {
        console.warn("[STAFF CREATE DB WARNING]", dbErr);
      }

      const newStaff = createdStaff || {
        id: Date.now(),
        name: name.trim(),
        email: formattedEmail,
        phone: formattedPhone,
        role: role.trim(),
        dept: assignedDept.trim(),
        department: assignedDept.trim(),
        schedule: assignedSchedule.trim(),
        status: assignedStatus,
      };

      MemoryStore.staff.push(newStaff as any);

      return res.status(201).json({
        success: true,
        message: `Staff member ${name} added successfully.`,
        data: newStaff,
      });
    } catch (err: any) {
      console.error("Create staff error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to create staff member." });
    }
  }

  public static async updateStaff(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { name, email, phone, role, department, dept, schedule, status } = req.body;

    try {
      const assignedDept = department || dept;

      try {
        const updateData: any = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone) updateData.phone = phone.trim();
        if (role) updateData.role = role.trim();
        if (assignedDept) updateData.department = assignedDept.trim();
        if (schedule) updateData.schedule = schedule.trim();
        if (status) updateData.status = status;

        await prisma.staffAccount.update({
          where: { id },
          data: updateData,
        }).catch(() => null);
      } catch {}

      const staffMember = MemoryStore.staff.find((s) => s.id === id);
      if (staffMember) {
        if (name) staffMember.name = name.trim();
        if (email) staffMember.email = email.trim().toLowerCase();
        if (phone) staffMember.phone = phone.trim();
        if (role) staffMember.role = role.trim();
        if (assignedDept) {
          staffMember.department = assignedDept.trim();
        }
        if (schedule) staffMember.schedule = schedule.trim();
        if (status) staffMember.status = status;
      }

      return res.status(200).json({
        success: true,
        message: `Staff profile updated.`,
        data: staffMember || { id, name, role, department: assignedDept, schedule, status },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to update staff member." });
    }
  }

  public static async deleteStaff(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);

    try {
      try {
        await prisma.staffAccount.delete({
          where: { id },
        }).catch(() => null);
      } catch {}

      const index = MemoryStore.staff.findIndex((s) => s.id === id);
      if (index !== -1) {
        MemoryStore.staff.splice(index, 1);
      }

      return res.status(200).json({
        success: true,
        message: "Staff member deleted successfully.",
        deletedId: id,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to delete staff member." });
    }
  }

  public static async updateStatus(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { status, schedule } = req.body;

    try {
      try {
        const updateData: any = {};
        if (status) updateData.status = status;
        if (schedule) updateData.schedule = schedule;

        await prisma.staffAccount.update({
          where: { id },
          data: updateData,
        }).catch(() => null);
      } catch {}

      const staffMember = MemoryStore.staff.find((s) => s.id === id);
      if (staffMember) {
        if (status) staffMember.status = status;
        if (schedule) staffMember.schedule = schedule;
      }

      return res.status(200).json({
        success: true,
        message: `Updated status for ${staffMember?.name || "staff"}.`,
        data: staffMember || { id, status, schedule },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to update staff status." });
    }
  }

  public static async postAnnouncement(req: Request, res: Response) {
    const { title, message, author } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Title and message are required." });
    }

    const newAnnouncement: StaffAnnouncement = {
      id: Date.now(),
      title: title.trim(),
      message: message.trim(),
      author: author || "Management",
      createdAt: new Date().toISOString(),
    };

    staffAnnouncements.unshift(newAnnouncement);

    return res.status(201).json({
      success: true,
      message: "Announcement broadcasted to staff portal.",
      announcement: newAnnouncement,
    });
  }

  public static async getAnnouncements(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: staffAnnouncements,
    });
  }
}

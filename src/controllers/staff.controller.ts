import { Request, Response } from "express";
import { MemoryStore } from "../config/database";

export class StaffController {
  public static async getStaffList(req: Request, res: Response) {
    const { status } = req.query;
    let list = [...MemoryStore.staff];

    if (status && typeof status === "string") {
      list = list.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    const counts = {
      present: MemoryStore.staff.filter((s) => s.status === "Present").length,
      leave: MemoryStore.staff.filter((s) => s.status === "Leave").length,
      remote: MemoryStore.staff.filter((s) => s.status === "Remote").length,
    };

    return res.status(200).json({
      success: true,
      counts,
      data: list,
    });
  }

  public static async updateStatus(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const { status, schedule } = req.body;

    const staffMember = MemoryStore.staff.find((s) => s.id === id);
    if (!staffMember) {
      return res.status(404).json({ success: false, error: "Staff member not found." });
    }

    if (status) staffMember.status = status;
    if (schedule) staffMember.schedule = schedule;
    staffMember.updatedAt = new Date().toISOString();

    return res.status(200).json({
      success: true,
      message: `Updated status for ${staffMember.name}.`,
      data: staffMember,
    });
  }

  public static async postAnnouncement(req: Request, res: Response) {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Title and message are required." });
    }

    return res.status(201).json({
      success: true,
      message: "Announcement broadcasted to staff portal.",
      announcement: {
        id: Date.now(),
        title,
        message,
        createdAt: new Date().toISOString(),
      },
    });
  }
}

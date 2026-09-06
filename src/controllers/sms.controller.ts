import { Request, Response } from "express";
import { SmsService } from "../services/sms.service";
import { prisma, MemoryStore } from "../config/database";
import { formatArkeselPhone, formatArkeselPhoneList } from "../utils/phoneFormatter";
import { logger } from "../utils/logger";

export class SmsController {
  // Check Arkesel SMS balance
  public static async getBalance(req: Request, res: Response) {
    try {
      const balanceInfo = await SmsService.checkBalance();
      return res.status(200).json({
        success: balanceInfo.success,
        data: balanceInfo.data,
        error: balanceInfo.error,
        mocked: balanceInfo.mocked,
      });
    } catch (err: any) {
      logger.error("Error retrieving SMS balance:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve SMS balance",
      });
    }
  }

  // Send a test SMS to verify connection
  public static async sendTestSms(req: Request, res: Response) {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Recipient phone number is required.",
      });
    }

    try {
      const result = await SmsService.sendTestSms(phone, message);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      logger.error("Error sending test SMS:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to send test SMS",
      });
    }
  }

  // Send custom bulk/broadcast SMS
  public static async sendBroadcast(req: Request, res: Response) {
    const { recipients, message, targetGroup, customSender } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message body is required.",
      });
    }

    try {
      let recipientPhones: string[] = [];

      if (Array.isArray(recipients) && recipients.length > 0) {
        recipientPhones = recipients;
      } else if (targetGroup === "all_staff") {
        try {
          const dbStaff = await prisma.staffAccount.findMany({ select: { phone: true } });
          recipientPhones = dbStaff.map((s) => s.phone);
        } catch {
          recipientPhones = MemoryStore.staff.map((s) => s.phone);
        }
      } else if (targetGroup === "all_patients") {
        try {
          const dbPatients = await prisma.patient.findMany({ select: { phone: true } });
          recipientPhones = dbPatients.map((p) => p.phone);
        } catch {
          recipientPhones = MemoryStore.patients.map((p) => p.phone);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: "Either 'recipients' list or a valid 'targetGroup' (all_staff, all_patients) must be specified.",
        });
      }

      const formattedList = formatArkeselPhoneList(recipientPhones);
      if (formattedList.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid recipient phone numbers found in the targeted group.",
        });
      }

      const result = await SmsService.sendSms(formattedList, message.trim(), customSender);
      return res.status(result.success ? 200 : 400).json({
        ...result,
        totalRecipients: formattedList.length,
      });
    } catch (err: any) {
      logger.error("Error in SMS broadcast:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to broadcast SMS",
      });
    }
  }

  // Automated appointment reminders (e.g. for tomorrow's appointments)
  public static async sendDailyReminders(req: Request, res: Response) {
    const { targetDate } = req.body;

    // Default target date is tomorrow
    let dateStr = targetDate;
    if (!dateStr) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateStr = tomorrow.toISOString().split("T")[0];
    }

    try {
      let upcomingAppts: any[] = [];

      try {
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
        upcomingAppts = await prisma.appointment.findMany({
          where: {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ["Confirmed", "Upcoming", "Pending"],
            },
          },
        });
      } catch {
        upcomingAppts = MemoryStore.appointments.filter(
          (a) => a.date === dateStr && a.status !== "Cancelled" && a.status !== "Completed"
        );
      }

      if (upcomingAppts.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No upcoming appointments found for ${dateStr}.`,
          remindersSent: 0,
        });
      }

      let successCount = 0;
      let failCount = 0;
      const results: any[] = [];

      for (const appt of upcomingAppts) {
        const resDispatch = await SmsService.sendAppointmentReminder({
          fullName: appt.patientName,
          phone: appt.phone,
          doctorName: appt.doctorName,
          date: dateStr,
          time: appt.time,
        });

        if (resDispatch.success) {
          successCount++;
        } else {
          failCount++;
        }
        results.push({
          patient: appt.patientName,
          phone: appt.phone,
          status: resDispatch.success ? "sent" : "failed",
          error: resDispatch.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Processed ${upcomingAppts.length} appointment reminder(s) for ${dateStr}. (${successCount} sent, ${failCount} failed)`,
        date: dateStr,
        totalFound: upcomingAppts.length,
        remindersSent: successCount,
        remindersFailed: failCount,
        details: results,
      });
    } catch (err: any) {
      logger.error("Error triggering daily appointment reminders:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to trigger appointment reminders",
      });
    }
  }
}

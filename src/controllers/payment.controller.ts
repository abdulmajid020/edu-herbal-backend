import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";

export class PaymentController {
  public static async getPayments(req: Request, res: Response) {
    const { status, limit } = req.query;
    let list = [...MemoryStore.payments];

    if (status && typeof status === "string") {
      list = list.filter((p) => p.status.toLowerCase() === status.toLowerCase());
    }

    if (limit) {
      list = list.slice(0, Number(limit));
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
    });
  }

  public static async createPayment(req: Request, res: Response) {
    const { description, amount, method, recipientName, recipientNumber } = req.body;

    if (!description || !amount || !recipientName || !recipientNumber) {
      return res.status(400).json({ success: false, error: "Description, amount, recipient name, and number are required." });
    }

    const orderDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const newPayment = {
      id: Date.now(),
      description,
      amount: Number(amount),
      method: method || "Mobile Money",
      status: "Paid" as const,
      recipientName: recipientName.trim(),
      recipientNumber: normalizePhone(recipientNumber),
      date: orderDate,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.payments.unshift(newPayment);

    return res.status(201).json({
      success: true,
      message: "Payment transaction recorded successfully.",
      data: newPayment,
    });
  }

  public static async getSalesMetrics(req: Request, res: Response) {
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const todayRevenue = MemoryStore.payments
      .filter((p) => p.status === "Paid" && p.date === today)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRevenue = MemoryStore.payments
      .filter((p) => p.status === "Paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return res.status(200).json({
      success: true,
      todayRevenue,
      yesterdayRevenue: 0,
      weekRevenue: totalRevenue,
      lastWeekRevenue: 0,
      monthRevenue: totalRevenue,
      consultationsThisMonth: MemoryStore.appointments.length,
      bestDay: "Today",
      bestDayAvg: todayRevenue,
      revenueDelta: todayRevenue > 0 ? "+100%" : "GHS 0",
    });
  }
}

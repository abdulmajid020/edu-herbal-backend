import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { ReportService } from "../services/report.service";

export class ReportController {
  public static async closeMonth(req: Request, res: Response) {
    const report = ReportService.generateMonthlyClose(MemoryStore.orders, MemoryStore.inventory);
    MemoryStore.monthlyReports.unshift(report);

    return res.status(201).json({
      success: true,
      message: `Month closed successfully for ${report.month} ${report.year}.`,
      report,
    });
  }

  public static async getReports(req: Request, res: Response) {
    // If no reports generated yet, generate one for demo purposes
    if (MemoryStore.monthlyReports.length === 0) {
      const demo = ReportService.generateMonthlyClose(MemoryStore.orders, MemoryStore.inventory);
      MemoryStore.monthlyReports.push(demo);
    }

    return res.status(200).json({
      success: true,
      count: MemoryStore.monthlyReports.length,
      data: MemoryStore.monthlyReports,
    });
  }

  public static async exportSingle(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const report = MemoryStore.monthlyReports.find((r) => r.id === id) || MemoryStore.monthlyReports[0];

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    const csvContent = ReportService.exportReportToCsv(report);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=monthly-report-${report.month.toLowerCase()}-${report.year}.csv`);

    return res.status(200).send(csvContent);
  }

  public static async exportAll(req: Request, res: Response) {
    if (MemoryStore.monthlyReports.length === 0) {
      const demo = ReportService.generateMonthlyClose(MemoryStore.orders, MemoryStore.inventory);
      MemoryStore.monthlyReports.push(demo);
    }

    const csvContent = ReportService.exportAllReportsToCsv(MemoryStore.monthlyReports);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=monthly-report-history.csv");

    return res.status(200).send(csvContent);
  }
}

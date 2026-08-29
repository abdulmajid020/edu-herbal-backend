import { Router } from "express";
import { ReportController } from "../controllers/report.controller";

const router = Router();

router.post("/monthly-close", ReportController.closeMonth);
router.get("/monthly", ReportController.getReports);
router.get("/monthly/export-all", ReportController.exportAll);
router.get("/monthly/:id/export", ReportController.exportSingle);

export default router;

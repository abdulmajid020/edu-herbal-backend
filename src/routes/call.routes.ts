import { Router } from "express";
import { CallController } from "../controllers/call.controller";

const router = Router();

router.get("/", CallController.getCalls);
router.post("/", CallController.logCall);
router.put("/:id/note", CallController.updateNote);
router.put("/:id/toggle-status", CallController.toggleStatus);
router.post("/:id/qr-scan", CallController.markQrScan);

export default router;

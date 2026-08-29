import { Router } from "express";
import { StaffController } from "../controllers/staff.controller";

const router = Router();

router.get("/", StaffController.getStaffList);
router.put("/:id/status", StaffController.updateStatus);
router.post("/announcements", StaffController.postAnnouncement);

export default router;

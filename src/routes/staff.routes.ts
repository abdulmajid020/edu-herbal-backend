import { Router } from "express";
import { StaffController } from "../controllers/staff.controller";

const router = Router();

router.get("/", StaffController.getStaffList);
router.post("/", StaffController.createStaff);
router.put("/:id", StaffController.updateStaff);
router.delete("/:id", StaffController.deleteStaff);
router.put("/:id/status", StaffController.updateStatus);
router.get("/announcements", StaffController.getAnnouncements);
router.post("/announcements", StaffController.postAnnouncement);

export default router;

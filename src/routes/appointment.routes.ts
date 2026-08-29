import { Router } from "express";
import { AppointmentController } from "../controllers/appointment.controller";

const router = Router();

router.get("/doctors", AppointmentController.getDoctors);
router.get("/today", AppointmentController.getTodayAppointments);
router.get("/", AppointmentController.getAppointments);
router.post("/", AppointmentController.createAppointment);
router.put("/:id/status", AppointmentController.updateStatus);
router.delete("/:id", AppointmentController.deleteAppointment);

export default router;

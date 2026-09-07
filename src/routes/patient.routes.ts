import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", PatientController.getPatients);
router.post("/login", PatientController.patientLogin);
router.post("/signup", PatientController.patientSignup);
router.post("/reset", PatientController.patientResetPassword);
router.get("/:id", PatientController.getPatientById);
router.post("/", PatientController.createPatient);
router.put("/:id", PatientController.updatePatient);
router.delete("/:id", PatientController.deletePatient);

export default router;

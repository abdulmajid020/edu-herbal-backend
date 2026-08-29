import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", AuthController.login);
router.post("/signup", AuthController.signup);
router.post("/reset-request", AuthController.resetRequest);
router.post("/reset-confirm", AuthController.resetConfirm);
router.get("/me", authenticateToken, AuthController.me);
router.post("/logout", AuthController.logout);

export default router;

import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";

const router = Router();

router.get("/", PaymentController.getPayments);
router.post("/", PaymentController.createPayment);
router.get("/metrics", PaymentController.getSalesMetrics);

export default router;

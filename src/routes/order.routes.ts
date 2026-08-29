import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { PaymentController } from "../controllers/payment.controller";

const router = Router();

router.post("/checkout", OrderController.checkout);
router.get("/top-selling", OrderController.getTopSelling);
router.get("/metrics", PaymentController.getSalesMetrics);
router.get("/", OrderController.getOrders);

export default router;

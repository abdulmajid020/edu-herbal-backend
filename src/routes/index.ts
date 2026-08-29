import { Router } from "express";
import authRoutes from "./auth.routes";
import patientRoutes from "./patient.routes";
import appointmentRoutes from "./appointment.routes";
import productRoutes from "./product.routes";
import inventoryRoutes from "./inventory.routes";
import orderRoutes from "./order.routes";
import paymentRoutes from "./payment.routes";
import callRoutes from "./call.routes";
import chatRoutes from "./chat.routes";
import contentRoutes from "./content.routes";
import reportRoutes from "./report.routes";
import staffRoutes from "./staff.routes";
import { CallController } from "../controllers/call.controller";
import { PaymentController } from "../controllers/payment.controller";
import { OrderController } from "../controllers/order.controller";

const router = Router();

// Health Check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "edu-herbal-backend",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular sub-routers
router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/calls", callRoutes);
router.use("/chat", chatRoutes);
router.use("/content", contentRoutes);
router.use("/reports", reportRoutes);
router.use("/staff", staffRoutes);

// Direct compatibility endpoints matching frontend
router.post("/call", CallController.logCall);
router.get("/sales/metrics", PaymentController.getSalesMetrics);
router.get("/sales/top-selling", OrderController.getTopSelling);

export default router;

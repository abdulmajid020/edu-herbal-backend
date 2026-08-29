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

// API Root / Documentation Index
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🌿 Welcome to the Edu-Herbal Clinic REST API",
    version: "1.0.0",
    healthCheck: "/api/health",
    endpoints: {
      auth: "/api/auth/*",
      patients: "/api/patients",
      appointments: "/api/appointments",
      doctors: "/api/appointments/doctors",
      products: "/api/products",
      inventory: "/api/inventory",
      orders: "/api/orders",
      payments: "/api/payments",
      salesMetrics: "/api/sales/metrics",
      topSelling: "/api/sales/top-selling",
      calls: "/api/calls",
      chat: "/api/chat/*",
      content: "/api/content/hero-slides & /api/content/blog-posts",
      reports: "/api/reports/*",
      staff: "/api/staff",
    },
    documentation: "Import postman/Edu-Herbal-API.postman_collection.json in Postman to test all endpoints.",
  });
});

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

/**
 * Comprehensive Automated End-to-End API Test Runner for Edu-Herbal Clinic Backend
 */
import { createApp } from "../app";
import http from "http";

const app = createApp();
const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let server: http.Server;
let passed = 0;
let failed = 0;
let authToken = "";

async function assertTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (error: any) {
    console.error(`  ❌ [FAIL] ${name} - ${error.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 STARTING EDU-HERBAL CLINIC BACKEND API TEST SUITE");
  console.log("=======================================================\n");

  server = app.listen(PORT);

  try {
    // 1. Health check
    await assertTest("Health Check Endpoint (/api/health)", async () => {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (data.status !== "ok") throw new Error(`Expected status ok, got ${data.status}`);
    });

    // 2. Auth Login
    await assertTest("Staff Login (/api/auth/login)", async () => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "edhecman2@gmail.com",
          phone: "0558379545",
          password: "SecurePassword123",
        }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.token) throw new Error("No token returned in login response");
      authToken = data.token;
    });

    // 3. Auth Me
    await assertTest("Get Current Staff Profile (/api/auth/me)", async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.user || data.user.email !== "edhecman2@gmail.com") {
        throw new Error("Invalid user profile returned");
      }
    });

    // 4. Patients CRM List
    await assertTest("Get CRM Patients Directory (/api/patients)", async () => {
      const res = await fetch(`${BASE_URL}/patients`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error("Expected array of patients");
      }
    });

    // 5. Create Patient with SMS Confirmation
    await assertTest("Create New Patient (/api/patients)", async () => {
      const res = await fetch(`${BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Kofi Test Patient",
          phone: "0241112233",
          condition: "Malaria & Fever",
          doctorId: 1,
          date: "2026-09-20",
          time: "10:00 AM",
        }),
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.data || data.data.name !== "Kofi Test Patient") {
        throw new Error("Patient not created properly");
      }
    });

    // 6. Doctors & Appointment Booking
    await assertTest("Get Doctors List (/api/appointments/doctors)", async () => {
      const res = await fetch(`${BASE_URL}/appointments/doctors`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error("Expected doctors list");
      }
    });

    await assertTest("Book Online Appointment (/api/appointments)", async () => {
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "Herbal Consultation",
          doctorId: 1,
          fullName: "Ama Test Booking",
          phone: "0558379545",
          date: "2026-09-22",
          time: "02:00 PM",
          notes: "Routine checkup",
        }),
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.data || data.data.status !== "Confirmed") {
        throw new Error("Appointment not confirmed");
      }
    });

    // 7. Products & Inventory
    await assertTest("Get Products Catalogue (/api/products)", async () => {
      const res = await fetch(`${BASE_URL}/products`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!Array.isArray(data.data) || data.data.length < 7) {
        throw new Error("Expected 7 FDA products");
      }
    });

    await assertTest("Get Inventory & Low Stock Alerts (/api/inventory)", async () => {
      const res = await fetch(`${BASE_URL}/inventory`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (typeof data.lowStockCount !== "number") throw new Error("Expected lowStockCount");
    });

    // 8. Orders & Checkout
    await assertTest("Cart Checkout with Mobile Money (/api/orders/checkout)", async () => {
      const res = await fetch(`${BASE_URL}/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { productId: 1, quantity: 2 },
            { productId: 2, quantity: 1 },
          ],
          paymentMethod: "Mobile Money",
          recipientName: "Ama Owusu",
          recipientNumber: "0244567890",
        }),
      });
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.order || data.order.amount !== 180) {
        throw new Error("Order amount calculation incorrect");
      }
    });

    // 9. Sales Metrics & Top Selling
    await assertTest("Get Sales KPIs & Top Selling (/api/sales/metrics)", async () => {
      const res = await fetch(`${BASE_URL}/sales/metrics`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.todayRevenue) throw new Error("Missing todayRevenue");
    });

    // 10. Call Centre Logs
    await assertTest("Log Call Action (/api/call)", async () => {
      const res = await fetch(`${BASE_URL}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: "Ama Owusu",
          phone: "0244567890",
          mode: "WhatsApp",
        }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // 11. EduBot AI Chat & Handover Trigger
    await assertTest("EduBot Handover Detection (/api/chat/send)", async () => {
      const res = await fetch(`${BASE_URL}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "0244567890",
          patientName: "Ama Owusu",
          text: "I need to talk to a human doctor right now.",
        }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!data.handoverTriggered) throw new Error("EduBot failed to detect handover intent");
    });

    // 12. Monthly Reports & CSV Export
    await assertTest("Monthly Close & CSV Export (/api/reports/monthly-close)", async () => {
      const closeRes = await fetch(`${BASE_URL}/reports/monthly-close`, { method: "POST" });
      if (closeRes.status !== 201) throw new Error(`Expected 201, got ${closeRes.status}`);

      const exportRes = await fetch(`${BASE_URL}/reports/monthly/export-all`);
      if (exportRes.status !== 200) throw new Error(`Expected 200 on CSV export, got ${exportRes.status}`);
      const csv = await exportRes.text();
      if (!csv.includes("Monthly Report") && !csv.includes("Month")) {
        throw new Error("Invalid CSV content returned");
      }
    });

    // 13. CMS Hero & Blog Posts
    await assertTest("Get CMS Content (/api/content/hero-slides)", async () => {
      const res = await fetch(`${BASE_URL}/content/hero-slides`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const data = (await res.json()) as any;
      if (!Array.isArray(data.data) || data.data.length === 0) {
        throw new Error("Expected hero slides array");
      }
    });

    console.log("\n=======================================================");
    console.log(`🎉 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("=======================================================\n");
  } finally {
    server.close();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

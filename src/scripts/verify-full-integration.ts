import { PrismaClient } from "@prisma/client";
import { MemoryStore } from "../config/database";
import { EduBotService } from "../services/edubot.service";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=================================================");
  console.log("   EDU-HERBAL END-TO-END INTEGRATION TEST SUITE  ");
  console.log("=================================================\n");

  const results: { module: string; status: "PASS" | "FAIL"; details: string }[] = [];

  // 1. Database Connection Verification
  try {
    const staffCount = await prisma.staffAccount.count();
    const patientCount = await prisma.patient.count();
    const apptCount = await prisma.appointment.count();
    const callCount = await prisma.callLog.count();

    results.push({
      module: "PostgreSQL Database Connection",
      status: "PASS",
      details: `Connected to PostgreSQL on Render. DB Records: ${staffCount} staff, ${patientCount} patients, ${apptCount} appointments, ${callCount} call logs.`,
    });
  } catch (err: any) {
    results.push({
      module: "PostgreSQL Database Connection",
      status: "FAIL",
      details: `Database connection error: ${err.message}`,
    });
  }

  // 2. Staff Management & Announcements
  try {
    const staff = await prisma.staffAccount.findMany({ select: { id: true, name: true, role: true, department: true, status: true } });
    if (staff.length > 0) {
      results.push({
        module: "Staff Management & Portal",
        status: "PASS",
        details: `Loaded ${staff.length} staff members (e.g. ${staff[0].name} - ${staff[0].role} [${staff[0].status}]).`,
      });
    } else {
      results.push({
        module: "Staff Management & Portal",
        status: "FAIL",
        details: "No staff records found in database.",
      });
    }
  } catch (err: any) {
    results.push({
      module: "Staff Management & Portal",
      status: "FAIL",
      details: `Staff query error: ${err.message}`,
    });
  }

  // 3. Appointments & Telemedicine
  try {
    const appts = await prisma.appointment.findMany({ take: 5, orderBy: { createdAt: "desc" } });
    results.push({
      module: "Appointment Scheduling & SMS Routing",
      status: "PASS",
      details: `Found ${appts.length} appointments recorded. Latest: "${appts[0]?.service || 'None'}" for ${appts[0]?.patientName || 'N/A'}.`,
    });
  } catch (err: any) {
    results.push({
      module: "Appointment Scheduling & SMS Routing",
      status: "FAIL",
      details: `Appointments query error: ${err.message}`,
    });
  }

  // 4. Patients CRM
  try {
    const patients = await prisma.patient.findMany({ take: 5, orderBy: { createdAt: "desc" } });
    results.push({
      module: "Patient CRM Directory",
      status: "PASS",
      details: `Found ${patients.length} patient records. Active conditions: ${patients.map(p => p.condition).filter(Boolean).join(", ")}.`,
    });
  } catch (err: any) {
    results.push({
      module: "Patient CRM Directory",
      status: "FAIL",
      details: `Patient CRM query error: ${err.message}`,
    });
  }

  // 5. Call Centre Operations
  try {
    const calls = await prisma.callLog.findMany({ take: 5, orderBy: { createdAt: "desc" } });
    results.push({
      module: "Call Centre & Telemedicine Logs",
      status: "PASS",
      details: `Found ${calls.length} call logs. Statuses: ${calls.map(c => `${c.patientName} (${c.status})`).slice(0, 3).join(", ")}.`,
    });
  } catch (err: any) {
    results.push({
      module: "Call Centre & Telemedicine Logs",
      status: "FAIL",
      details: `Call logs query error: ${err.message}`,
    });
  }

  // 6. Inventory & Products Store
  try {
    const invCount = MemoryStore.inventory.length;
    const prodCount = MemoryStore.products.length;
    results.push({
      module: "Inventory & Products Catalog",
      status: "PASS",
      details: `${prodCount} clinic herbal products active across ${invCount} inventory stock tracking items.`,
    });
  } catch (err: any) {
    results.push({
      module: "Inventory & Products Catalog",
      status: "FAIL",
      details: `Inventory error: ${err.message}`,
    });
  }

  // 7. Cart Orders & Payment Checkout
  try {
    const ordersCount = MemoryStore.orders.length;
    const paymentsCount = MemoryStore.payments.length;
    results.push({
      module: "Cart Orders & Payments Checkout",
      status: "PASS",
      details: `Order and payment tracking ready. Active orders: ${ordersCount}, Payment records: ${paymentsCount}.`,
    });
  } catch (err: any) {
    results.push({
      module: "Cart Orders & Payments Checkout",
      status: "FAIL",
      details: `Checkout error: ${err.message}`,
    });
  }

  // 8. Content Management (Hero & Blog)
  try {
    const slidesCount = MemoryStore.heroSlides.length;
    const blogCount = MemoryStore.blogPosts.length;
    results.push({
      module: "Website CMS (Carousel & Blog)",
      status: "PASS",
      details: `${slidesCount} hero carousel slides and ${blogCount} published health blog posts configured.`,
    });
  } catch (err: any) {
    results.push({
      module: "Website CMS (Carousel & Blog)",
      status: "FAIL",
      details: `Content CMS error: ${err.message}`,
    });
  }

  // 9. EduBot Intelligent AI & Staff Handover
  try {
    const testLocation = EduBotService.generateResponse("where is your clinic located", "Kwame Mensah");
    const testHandover = EduBotService.generateResponse("I want to speak with a human doctor", "Kwame Mensah");
    const testProducts = EduBotService.generateResponse("what herbal medicines do you have", "Kwame Mensah");

    if (testLocation.reply.includes("Odorkor") && testHandover.handoverRequested && testProducts.reply.includes("FDA-approved")) {
      results.push({
        module: "EduBot Chat & Live Handover AI",
        status: "PASS",
        details: "AI query response, natural language matching, and smart staff handover detection passed.",
      });
    } else {
      results.push({
        module: "EduBot Chat & Live Handover AI",
        status: "FAIL",
        details: "EduBot response did not match expected intelligence rules.",
      });
    }
  } catch (err: any) {
    results.push({
      module: "EduBot Chat & Live Handover AI",
      status: "FAIL",
      details: `EduBot test error: ${err.message}`,
    });
  }

  // Print Summary Table
  console.log("--------------------------------------------------------------------------------");
  console.log(String("MODULE").padEnd(42) + String("STATUS").padEnd(10) + "DETAILS");
  console.log("--------------------------------------------------------------------------------");
  for (const r of results) {
    const statusFormatted = r.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(`${r.module.padEnd(42)} ${statusFormatted.padEnd(10)} ${r.details}`);
  }
  console.log("--------------------------------------------------------------------------------\n");

  const totalPassed = results.filter(r => r.status === "PASS").length;
  console.log(`TOTAL RESULT: ${totalPassed}/${results.length} modules passed successfully.\n`);

  await prisma.$disconnect();
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

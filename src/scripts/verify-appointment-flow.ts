import { prisma } from "../config/database";

const API_BASE = "https://edu-herbal-backend.onrender.com/api";

async function verifyAppointmentFlow() {
  console.log("=======================================================");
  console.log("🏥 VERIFYING FULL END-TO-END APPOINTMENTS INTEGRATION");
  console.log("=======================================================\n");

  const timestamp = Date.now().toString().slice(-4);

  // 1. Test Clinical Booking (Herbal Consultation) -> CRM Routing
  console.log("1️⃣ [TEST] Booking Clinical Appointment (Herbal Consultation)...");
  const clinicalPayload = {
    service: "Herbal Consultation",
    doctorId: 1,
    fullName: `Test Patient CRM ${timestamp}`,
    phone: `+23324${timestamp}1122`,
    date: "2026-09-25",
    time: "10:30 AM",
    notes: "Chronic joint pains and morning stiffness.",
  };

  const clinicalRes = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clinicalPayload),
  });

  const clinicalData: any = await clinicalRes.json();
  console.log(`   Response (${clinicalRes.status}):`, clinicalData.message);
  console.log(`   Routed To: ${clinicalData.routedTo}`);

  // 2. Test Telemedicine Booking -> Call Centre Routing
  console.log("\n2️⃣ [TEST] Booking Telemedicine (Video) Consultation...");
  const telemedPayload = {
    service: "Telemedicine (Video)",
    doctorId: 2,
    fullName: `Telemed Patient ${timestamp}`,
    phone: `+23355${timestamp}3344`,
    date: "2026-09-28",
    time: "02:00 PM",
    notes: "Follow-up video consultation requested for skin rash.",
  };

  const telemedRes = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(telemedPayload),
  });

  const telemedData: any = await telemedRes.json();
  console.log(`   Response (${telemedRes.status}):`, telemedData.message);
  console.log(`   Routed To: ${telemedData.routedTo}`);

  // 3. Query PostgreSQL to verify real-time persistence
  console.log("\n3️⃣ [DB VERIFICATION] Querying PostgreSQL Database directly...");

  const latestAppts = await prisma.appointment.findMany({
    where: {
      phone: { in: [clinicalPayload.phone, telemedPayload.phone] },
    },
  });

  const latestPatients = await prisma.patient.findMany({
    where: { phone: clinicalPayload.phone },
  });

  const latestCallLogs = await prisma.callLog.findMany({
    where: { phone: telemedPayload.phone },
  });

  console.log(`\n📅 APPOINTMENTS TABLE (${latestAppts.length} records created):`);
  console.table(
    latestAppts.map((a) => ({
      ID: a.id,
      Patient: a.patientName,
      Phone: a.phone,
      Service: a.service,
      Doctor: a.doctorName,
      Date: a.date,
      Time: a.time,
      Status: a.status,
    }))
  );

  console.log(`\n👥 CRM PATIENTS TABLE (Clinical patient routed to CRM):`);
  console.table(
    latestPatients.map((p) => ({
      ID: p.id,
      Name: p.name,
      Phone: p.phone,
      Condition: p.condition,
      Status: p.status,
      NextAppt: p.nextAppt,
    }))
  );

  console.log(`\n📞 CALL CENTRE TABLE (Telemedicine patient routed to Call Centre):`);
  console.table(
    latestCallLogs.map((c) => ({
      ID: c.id,
      Patient: c.patientName,
      Phone: c.phone,
      Type: c.type,
      Status: c.status,
      Note: c.note,
    }))
  );

  console.log("\n=======================================================");
  if (latestAppts.length === 2 && latestPatients.length === 1 && latestCallLogs.length === 1) {
    console.log("🎉 ALL APPOINTMENT INTEGRATION TESTS PASSED 100%!");
  } else {
    console.warn("⚠️ Note: Completed with counts:", {
      appts: latestAppts.length,
      patients: latestPatients.length,
      callLogs: latestCallLogs.length,
    });
  }
  console.log("=======================================================");

  await prisma.$disconnect();
}

verifyAppointmentFlow().catch(console.error);

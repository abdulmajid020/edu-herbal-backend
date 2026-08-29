import { prisma } from "../config/database";

async function main() {
  console.log("\n=======================================================");
  console.log("📊 LIVE POSTGRESQL DATABASE SNAPSHOT (Render)");
  console.log("=======================================================\n");

  try {
    const staff = await prisma.staffAccount.findMany();
    console.log(`\n👨‍⚕️ 1. STAFF ACCOUNTS (${staff.length} records):`);
    console.table(
      staff.map((s) => ({
        ID: s.id,
        Name: s.name,
        Email: s.email,
        Phone: s.phone,
        Role: s.role,
        Dept: s.department,
        Status: s.status,
        Locked: s.isLocked,
        ResetReq: s.resetRequested,
      }))
    );

    const doctors = await prisma.doctor.findMany();
    console.log(`\n🩺 2. DOCTORS (${doctors.length} records):`);
    console.table(
      doctors.map((d) => ({
        ID: d.id,
        Name: d.name,
        Specialty: d.specialty,
        Initials: d.initials,
        Slots: d.availableSlots.join(", "),
      }))
    );

    const products = await prisma.product.findMany({
      include: { inventory: true },
      orderBy: { id: "asc" },
    });
    console.log(`\n🌿 3. PRODUCTS & INVENTORY (${products.length} records):`);
    console.table(
      products.map((p) => ({
        ID: p.id,
        Name: p.name,
        Category: p.category,
        Price: `GHS ${p.price}`,
        Stock: p.inventory ? `${p.inventory.stock} ${p.inventory.unit}` : "N/A",
        MinLevel: p.inventory ? p.inventory.minLevel : "N/A",
        Active: p.isActive,
      }))
    );

    const patients = await prisma.patient.findMany({
      orderBy: { id: "desc" },
    });
    console.log(`\n👥 4. PATIENTS CRM DIRECTORY (${patients.length} records):`);
    console.table(
      patients.map((p) => ({
        ID: p.id,
        Name: p.name,
        Phone: p.phone,
        Condition: p.condition,
        Status: p.status,
        Balance: `GHS ${p.balance}`,
        NextAppt: p.nextAppt || "None",
      }))
    );

    const appointments = await prisma.appointment.findMany({
      orderBy: { id: "desc" },
    });
    console.log(`\n📅 5. APPOINTMENTS QUEUE (${appointments.length} records):`);
    console.table(
      appointments.map((a) => ({
        ID: a.id,
        Patient: a.patientName,
        Phone: a.phone,
        Service: a.service,
        Doctor: a.doctorName,
        Date: a.date.toISOString().split("T")[0],
        Time: a.time,
        Status: a.status,
      }))
    );

    const callLogs = await prisma.callLog.findMany({
      orderBy: { id: "desc" },
    });
    console.log(`\n📞 6. CALL CENTRE LOGS (${callLogs.length} records):`);
    console.table(
      callLogs.map((c) => ({
        ID: c.id,
        Patient: c.patientName,
        Phone: c.phone,
        Type: c.type,
        Status: c.status,
        Note: c.note ? (c.note.length > 50 ? `${c.note.slice(0, 47)}...` : c.note) : "None",
      }))
    );

    const payments = await prisma.payment.findMany({
      orderBy: { id: "desc" },
    });
    console.log(`\n💳 7. PAYMENTS & TRANSACTIONS (${payments.length} records):`);
    console.table(
      payments.map((p) => ({
        ID: p.id,
        Recipient: p.recipientName,
        Phone: p.recipientNumber,
        Amount: `GHS ${p.amount}`,
        Method: p.method,
        Status: p.status,
      }))
    );

    const chats = await prisma.chatConversation.findMany({
      include: { messages: true },
      orderBy: { id: "desc" },
    });
    console.log(`\n💬 8. EDUBOT CHAT CONVERSATIONS (${chats.length} conversations):`);
    console.table(
      chats.map((ch) => ({
        ID: ch.id,
        Patient: ch.patientName,
        Phone: ch.phone,
        Handover: ch.handoverActive ? "ACTIVE" : "No",
        Messages: ch.messages.length,
      }))
    );

    console.log("\n=======================================================\n");
  } catch (err) {
    console.error("❌ Error querying database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

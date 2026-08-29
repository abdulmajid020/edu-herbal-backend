import { prisma, MemoryStore } from "../config/database";

async function seedCalls() {
  console.log("Seeding initial historical call logs to PostgreSQL...");

  const count = await prisma.callLog.count();
  if (count <= 2) {
    for (const call of MemoryStore.callLogs) {
      await prisma.callLog.create({
        data: {
          patientName: call.patient,
          phone: call.phone,
          timeLabel: call.time,
          type: call.type,
          duration: call.duration,
          status: call.status,
          note: call.note,
        },
      });
    }
    console.log("✅ Seeded initial Call Centre logs to database!");
  } else {
    console.log(`Call logs already exist (${count} records).`);
  }

  await prisma.$disconnect();
}

seedCalls();

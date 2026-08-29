import { prisma, MemoryStore } from "../config/database";

async function cleanDuplicates() {
  console.log("Cleaning duplicate call logs from database...");

  const allCalls = await prisma.callLog.findMany({ orderBy: { id: "desc" } });
  const seen = new Set<string>();
  const toDelete: number[] = [];

  for (const call of allCalls) {
    const key = `${call.patientName}_${call.phone}_${call.timeLabel}_${(call.note || "").slice(0, 30)}`.toLowerCase();
    if (seen.has(key)) {
      toDelete.push(call.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    await prisma.callLog.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`Deleted ${toDelete.length} duplicate call records.`);
  } else {
    console.log("No duplicate call records found.");
  }

  // Also clean MemoryStore
  const memSeen = new Set<string>();
  MemoryStore.callLogs = MemoryStore.callLogs.filter((c) => {
    const key = `${c.patient}_${c.phone}_${c.time}_${(c.note || "").slice(0, 30)}`.toLowerCase();
    if (memSeen.has(key)) return false;
    memSeen.add(key);
    return true;
  });

  const remaining = await prisma.callLog.findMany({ orderBy: { id: "desc" } });
  console.log(`\nRemaining unique call records (${remaining.length}):`);
  console.table(
    remaining.map((c) => ({
      ID: c.id,
      Patient: c.patientName,
      Phone: c.phone,
      Time: c.timeLabel,
      Status: c.status,
      Note: c.note,
    }))
  );

  await prisma.$disconnect();
}

cleanDuplicates();

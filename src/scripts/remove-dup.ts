import { prisma } from "../config/database";

async function removeDuplicates() {
  await prisma.callLog.deleteMany({
    where: { id: { in: [10, 8, 2, 1] } },
  });
  console.log("Deleted duplicate call logs.");
  await prisma.$disconnect();
}

removeDuplicates();

import { PrismaClient } from "@prisma/client";
import { MemoryStore } from "../src/config/database";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Edu-Herbal Clinic Database Seeding...");

  // Seed Doctors
  for (const doc of MemoryStore.doctors) {
    await prisma.doctor.upsert({
      where: { id: doc.id },
      update: {},
      create: {
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        initials: doc.initials,
        availableSlots: doc.slots,
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.doctors.length} doctors.`);

  // Seed Products & Inventory
  for (const prod of MemoryStore.products) {
    const createdProduct = await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        description: prod.description,
        imageUrl: prod.imageUrl,
        isActive: true,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: createdProduct.id },
      update: {},
      create: {
        productId: createdProduct.id,
        item: prod.name,
        category: prod.category,
        stock: 10,
        minLevel: 5,
        safetyThreshold: 35,
        unit: "units",
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.products.length} products & inventory items.`);

  // Seed Staff
  for (const staff of MemoryStore.staff) {
    await prisma.staffAccount.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        passwordHash: "$2a$10$w8T0Mv14G5m7p9Y2xKz8IeG3rP4T8uY7kK2mO1L7xM3pQ5W1sT6N.",
        role: staff.role,
        department: staff.department,
        schedule: staff.schedule,
        status: staff.status as any,
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.staff.length} staff accounts.`);

  // Seed Patients
  for (const patient of MemoryStore.patients) {
    const mappedStatus = patient.status === "Follow-up" ? "Follow_up" : patient.status;
    await prisma.patient.upsert({
      where: { phone: patient.phone },
      update: {},
      create: {
        name: patient.name,
        phone: patient.phone,
        condition: patient.condition,
        status: mappedStatus as any,
        balance: patient.balance,
        lastVisit: patient.lastVisit,
        nextAppt: patient.nextAppt,
        callCount: patient.callCount,
        lastCallAt: patient.lastCallAt,
        lastCallMode: patient.lastCallMode,
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.patients.length} CRM patients.`);

  // Seed Hero Slides
  for (const slide of MemoryStore.heroSlides) {
    await prisma.heroSlide.upsert({
      where: { id: slide.id },
      update: {},
      create: {
        id: slide.id,
        badge: slide.badge,
        eyebrow: slide.eyebrow,
        title: slide.title,
        description: slide.description,
        panelTitle: slide.panelTitle,
        panelSubtitle: slide.panelSubtitle,
        panelAccent: slide.panelAccent,
        background: slide.background,
        imageUrl: slide.image,
        overlayText: slide.overlayText,
        subText: slide.subText,
        smallText: slide.smallText,
        statsJson: slide.stats as any,
        displayOrder: slide.displayOrder,
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.heroSlides.length} hero slides.`);

  // Seed Blog Posts
  for (const post of MemoryStore.blogPosts) {
    await prisma.blogPost.upsert({
      where: { id: post.id },
      update: {},
      create: {
        id: post.id,
        title: post.title,
        category: post.category,
        dateLabel: post.date,
        readTime: post.readTime,
        excerpt: post.excerpt,
        imageUrl: post.image,
        isPublished: true,
      },
    });
  }
  console.log(`✅ Seeded ${MemoryStore.blogPosts.length} blog posts.`);

  console.log("🎉 Live Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  StaffAccountDTO,
  Doctor,
  PatientDTO,
  AppointmentDTO,
  ProductDTO,
  InventoryItemDTO,
  OrderDTO,
  PaymentDTO,
  CallLogDTO,
  ChatMessageDTO,
  HeroSlideDTO,
  BlogPostDTO,
  MonthlyReportDTO,
} from "../types";

export const prisma = new PrismaClient();

const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("SecurePassword123", 10);

// In-memory data store cache pre-seeded with initial data for high-speed local testing & fallback
export class MemoryStore {
  public static staff: StaffAccountDTO[] = [
    {
      id: 1,
      name: "Dr Edu Mohammed",
      email: "edhecman2@gmail.com",
      phone: "+2330558379545",
      role: "Chief Herbalist",
      department: "Clinical",
      schedule: "8AM–5PM",
      status: "Present",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Dr Prince",
      email: "prince@eduherbal.com",
      phone: "+233241000001",
      role: "Cardiologist",
      department: "Clinical",
      schedule: "9AM–6PM",
      status: "Present",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Dr. Kwame Asante",
      email: "asante@eduherbal.com",
      phone: "+233241000002",
      role: "Dermatologist",
      department: "Clinical",
      schedule: "–",
      status: "Leave",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 4,
      name: "Abena Tawiah",
      email: "abena@eduherbal.com",
      phone: "+233241000003",
      role: "Pharmacist",
      department: "Dispensary",
      schedule: "8AM–4PM",
      status: "Present",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 5,
      name: "Kofi Boateng",
      email: "kofi@eduherbal.com",
      phone: "+233241000004",
      role: "Lab Technician",
      department: "Laboratory",
      schedule: "7AM–3PM",
      status: "Present",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 6,
      name: "Grace Nyarko",
      email: "grace@eduherbal.com",
      phone: "+233241000005",
      role: "Call Agent",
      department: "CRM",
      schedule: "8AM–5PM",
      status: "Present",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 7,
      name: "Michael Adu",
      email: "michael@eduherbal.com",
      phone: "+233241000006",
      role: "IT & Systems",
      department: "Admin",
      schedule: "Flexible",
      status: "Remote",
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  public static passwords: Record<string, string> = {
    "edhecman2@gmail.com": DEFAULT_PASSWORD_HASH,
    "prince@eduherbal.com": DEFAULT_PASSWORD_HASH,
    "asante@eduherbal.com": DEFAULT_PASSWORD_HASH,
    "abena@eduherbal.com": DEFAULT_PASSWORD_HASH,
    "kofi@eduherbal.com": DEFAULT_PASSWORD_HASH,
    "grace@eduherbal.com": DEFAULT_PASSWORD_HASH,
    "michael@eduherbal.com": DEFAULT_PASSWORD_HASH,
  };

  public static doctors: Doctor[] = [
    { id: 1, name: "Dr. Edu Mohammed", specialty: "Special General Consultation", initials: "AO", slots: ["09:00 AM", "10:00 AM", "02:00 PM", "03:00 PM"] },
    { id: 2, name: "Dr. Opoku", specialty: "Stroke Specialist", initials: "FA", slots: ["08:30 AM", "11:00 AM", "01:00 PM", "04:00 PM"] },
    { id: 3, name: "Mr. Eric", specialty: "Reflexology, Physiotherapy and Massage Unit", initials: "KA", slots: ["09:30 AM", "10:30 AM", "02:30 PM", "04:30 PM"] },
  ];

  public static products: ProductDTO[] = [
    { id: 1, name: "Edhec SM Bitters", category: "Bitters", price: 70, description: "Edhec SM Bitters is a potent herbal remedy known for effectively relieving waist pain and enhancing overall well-being.", imageUrl: "/imports/product-1.jpg", isActive: true },
    { id: 2, name: "Edhec Herbal Mixture", category: "Tincture", price: 40, description: "Edhec Herbal Mixture is a powerful natural solution for relieving abdominal and body pains.", imageUrl: "/imports/product-2.jpg", isActive: true },
    { id: 3, name: "Edhec Herbal Tonic", category: "Topical", price: 40, description: "Edhec Herbal Tonic is an excellent solution for loss of appetite and anemia.", imageUrl: "/imports/product-3.jpg", isActive: true },
    { id: 4, name: "Edhec Be Stronge", category: "Capsules", price: 40, description: "Edhec Be Stronge is highly effective for general body pain, offering quick and lasting relief.", imageUrl: "/imports/product-4.jpg", isActive: true },
    { id: 5, name: "Edhec Malacure Mixture", category: "Raw Herbs", price: 40, description: "Edhec Herbal Malacure is a powerful solution for malaria, crafted to support effective recovery.", imageUrl: "/imports/product-5.jpg", isActive: true },
    { id: 6, name: "Edhec Herbal Laxative", category: "Syrup", price: 40, description: "Edhec Herbal Laxative is highly effective for relieving constipation and menstrual disorders.", imageUrl: "/imports/product-6.jpg", isActive: true },
    { id: 7, name: "Edhec Herbal Cough Mixture", category: "Tea", price: 30, description: "Edhec Herbal Cough Mixture is highly effective for relieving coughs.", imageUrl: "/imports/product-7.jpg", isActive: true },
  ];

  public static inventory: InventoryItemDTO[] = MemoryStore.products.map((p) => ({
    id: p.id,
    productId: p.id,
    item: p.name,
    category: p.category,
    stock: 10,
    min: 5,
    safetyThreshold: 35,
    unit: "units",
    isLowStock: true,
    updatedAt: new Date().toISOString(),
  }));

  public static patients: PatientDTO[] = [
    { id: 1, name: "Ama Owusu", phone: "+233244567890", condition: "Diabetes Type 2", lastVisit: "30 Jun 2025", nextAppt: "14 Jul 2025", assignedDoctorName: "Dr. Edu Mohammed", status: "Active", balance: 0, products: ["Edhec SM Bitters", "Edhec Herbal Mixture"], callCount: 2, lastCallAt: "Jul 8, 09:14 AM", lastCallMode: "Phone", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, name: "Kofi Agyeman", phone: "+233201234567", condition: "Hypertension", lastVisit: "28 Jun 2025", nextAppt: "12 Jul 2025", assignedDoctorName: "Dr. Opoku", status: "Active", balance: 150, products: ["Edhec Be Stronge"], callCount: 1, lastCallAt: "Jul 8, 10:47 AM", lastCallMode: "Phone", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 3, name: "Akosua Frimpong", phone: "+233267890123", condition: "Eczema", lastVisit: "25 Jun 2025", nextAppt: "9 Jul 2025", assignedDoctorName: "Dr. Kwame Asante", status: "Follow-up", balance: 0, products: ["Edhec Herbal Tonic"], callCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 4, name: "Yaw Darko", phone: "+233542345678", condition: "Liver Disease", lastVisit: "20 Jun 2025", nextAppt: "Pending", assignedDoctorName: "Dr. Edu Mohammed", status: "Pending", balance: 250, products: ["Edhec Malacure Mixture", "Edhec Herbal Tonic"], callCount: 1, lastCallAt: "Jul 8, 12:08 PM", lastCallMode: "Phone", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 5, name: "Abena Mensah", phone: "+233278901234", condition: "Arthritis", lastVisit: "18 Jun 2025", nextAppt: "16 Jul 2025", assignedDoctorName: "Dr. Kwame Asante", status: "Active", balance: 0, products: ["Edhec Be Stronge", "Edhec Herbal Laxative"], callCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 6, name: "Kwesi Appiah", phone: "+233233456789", condition: "Stroke Recovery", lastVisit: "15 Jun 2025", nextAppt: "8 Jul 2025", assignedDoctorName: "Dr. Opoku", status: "Active", balance: 80, products: ["Edhec Herbal Tonic", "Edhec SM Bitters"], callCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  public static appointments: AppointmentDTO[] = [
    { id: 1, patientName: "Ama Owusu", phone: "+233244567890", service: "Diabetes Type 2", doctorId: 1, doctorName: "Dr. Edu Mohammed", date: new Date().toISOString().split("T")[0], time: "09:00 AM", status: "Confirmed", createdAt: new Date().toISOString() },
    { id: 2, patientName: "Kofi Agyeman", phone: "+233201234567", service: "Hypertension", doctorId: 2, doctorName: "Dr. Opoku", date: new Date().toISOString().split("T")[0], time: "11:00 AM", status: "Pending", createdAt: new Date().toISOString() },
    { id: 3, patientName: "Yaw Darko", phone: "+233542345678", service: "Liver Disease", doctorId: 1, doctorName: "Dr. Edu Mohammed", date: new Date().toISOString().split("T")[0], time: "02:00 PM", status: "Completed", createdAt: new Date().toISOString() },
  ];

  public static orders: OrderDTO[] = [
    {
      id: 1,
      patientId: 1,
      description: "Edhec SM Bitters (x2), Edhec Herbal Mixture (x1)",
      amount: 180,
      method: "Mobile Money",
      status: "Paid",
      recipientName: "Ama Owusu",
      recipientNumber: "+233244567890",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      items: [
        { productId: 1, name: "Edhec SM Bitters", quantity: 2, price: 70, subtotal: 140 },
        { productId: 2, name: "Edhec Herbal Mixture", quantity: 1, price: 40, subtotal: 40 },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  public static payments: PaymentDTO[] = [
    {
      id: 1,
      orderId: 1,
      patientId: 1,
      description: "Edhec SM Bitters (x2), Edhec Herbal Mixture (x1)",
      amount: 180,
      method: "Mobile Money",
      status: "Paid",
      recipientName: "Ama Owusu",
      recipientNumber: "+233244567890",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      createdAt: new Date().toISOString(),
    },
  ];

  public static callLogs: CallLogDTO[] = [
    { id: 1, patient: "Ama Owusu", phone: "+233244567890", time: "09:14 AM", type: "incoming", duration: "4:32", status: "resolved", note: "Called re Edhec SM Bitters refill. Confirmed pickup Thursday.", createdAt: new Date().toISOString() },
    { id: 2, patient: "Kofi Agyeman", phone: "+233201234567", time: "10:47 AM", type: "incoming", duration: "2:15", status: "resolved", note: "Confirmed appointment. Reminded about medication timing.", createdAt: new Date().toISOString() },
    { id: 3, patient: "Yaw Darko", phone: "+233542345678", time: "12:08 PM", type: "returned", duration: "6:50", status: "resolved", note: "Discussed liver test results with Dr. Edu Mohammed.", createdAt: new Date().toISOString() },
    { id: 4, patient: "New Enquiry", phone: "+233275543322", time: "01:35 PM", type: "missed", duration: "0:00", status: "unresolved", note: "Inquired about stroke rehab support.", createdAt: new Date().toISOString() },
  ];

  public static chatMessages: ChatMessageDTO[] = [];

  public static heroSlides: HeroSlideDTO[] = [
    {
      id: 1,
      badge: "EDHEC 'NKWA SOMBO'",
      eyebrow: "Evidence-based care",
      title: "Your Good\nHealth Is\nOur Concern",
      description: "Evidence-based herbal medicine for diabetes, hypertension, skin conditions and more. Expert herbalists, digital records, 24/7 support.",
      stats: [["5,200+", "Patients Treated", "#1C7A3A"], ["16 yrs", "In Practice", "#E07820"], ["200+", "Herbal Formulas", "#8B2E1A"]],
      panelTitle: "Today at 2:00 PM",
      panelSubtitle: "Dr Edu Mohammed · Herbal Consult",
      panelAccent: "#1C7A3A",
      background: "#1C7A3A",
      image: "/imports/carousel-1.jpg",
      overlayText: "EDHEC",
      subText: "Edu Herbal Clinic",
      smallText: "\"Your Good Health Is Our Concern\"",
      displayOrder: 1,
    },
    {
      id: 2,
      badge: "Personalised Treatment Plans",
      eyebrow: "Book with confidence",
      title: "Modern herbal care, tailored to your needs.",
      description: "Choose your preferred doctor, book in minutes, and receive follow-up support through our connected care platform.",
      stats: [["24/7", "Support", "#1C7A3A"], ["Same Day", "Appointments", "#E07820"], ["Just A", "Call Away", "#8B2E1A"]],
      panelTitle: "Next available",
      panelSubtitle: "Dr Prince · Hypertension Review",
      panelAccent: "#E07820",
      background: "#E07820",
      image: "/imports/carousel-2.jpg",
      overlayText: "CARE",
      subText: "Secure appointments",
      smallText: "Trusted specialists, flexible booking",
      displayOrder: 2,
    },
    {
      id: 3,
      badge: "Connected patient experience",
      eyebrow: "EDHEC 'NKWA SOMBO'",
      title: "From consultation to follow-up, all in one place.",
      description: "Track prescriptions, lab results, payments, and product orders through our digital patient portal.",
      stats: [["100%", "Digital Records", "#1C7A3A"], ["4.9/5", "Patient Rating", "#E07820"], ["Fast", "Refills", "#8B2E1A"]],
      panelTitle: "Patient Portal Ready",
      panelSubtitle: "Ama Owusu · Appointments & Records",
      panelAccent: "#8B2E1A",
      background: "#8B2E1A",
      image: "/imports/carousel-3.jpg",
      overlayText: "PORTAL",
      subText: "Your care journey",
      smallText: "Simple, secure and accessible",
      displayOrder: 3,
    },
  ];

  public static blogPosts: BlogPostDTO[] = [
    { id: 1, title: "7 Herbs That Naturally Lower Blood Sugar", category: "Diabetes", date: "28 June 2025", readTime: "5 min", excerpt: "Discover scientifically-backed herbal remedies that clinical trials show can meaningfully support healthy blood glucose levels.", image: "/imports/news-3.jpg", isPublished: true },
    { id: 2, title: "Managing Hypertension Without Synthetic Drugs", category: "Heart Health", date: "15 June 2025", readTime: "7 min", excerpt: "High blood pressure doesn't always demand pharmaceutical intervention. Here's what lifestyle medicine and herbal protocols achieve.", image: "/imports/news-4.jpg", isPublished: true },
    { id: 3, title: "The Complete Guide to Herbal Liver Detoxification", category: "Wellness", date: "3 June 2025", readTime: "6 min", excerpt: "A well-designed herbal detox supports liver, kidneys and lymphatic function simultaneously. Here is what actually works.", image: "/imports/news-5.jpg", isPublished: true },
  ];

  public static monthlyReports: MonthlyReportDTO[] = [];
}

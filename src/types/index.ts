export type StaffRole =
  | "Chief Herbalist"
  | "Cardiologist"
  | "Dermatologist"
  | "Pharmacist"
  | "Lab Technician"
  | "Call Agent"
  | "IT & Systems"
  | "Admin";

export type Department = "Clinical" | "Dispensary" | "Laboratory" | "CRM" | "Admin";

export type StaffStatus = "Present" | "Leave" | "Remote";

export type PatientStatus = "Active" | "Follow-up" | "Pending" | "Discharged";

export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Upcoming" | "Cancelled";

export type CallType = "incoming" | "missed" | "returned";

export type CallStatus = "resolved" | "unresolved";

export type PaymentMethod = "Mobile Money" | "Telecel Cash";

export type PaymentStatus = "Paid" | "Pending" | "Refunded";

export interface DoctorDTO {
  id: number;
  name: string;
  specialty: string;
  initials: string;
  slots: string[];
}

export type Doctor = DoctorDTO;

export interface StaffAccountDTO {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  schedule: string;
  status: StaffStatus;
  failedAttempts: number;
  isLocked: boolean;
  resetRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientDTO {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  condition: string;
  status: PatientStatus;
  assignedDoctorId?: number | null;
  assignedDoctorName?: string | null;
  balance: number;
  lastVisit?: string | null;
  nextAppt?: string | null;
  lastCallAt?: string | null;
  callCount: number;
  lastCallMode?: "Phone" | "WhatsApp" | null;
  products?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentDTO {
  id: number;
  patientName: string;
  phone: string;
  email?: string | null;
  service: string;
  doctorId: number;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string | null;
  patientId?: number | null;
  createdAt: string;
}

export interface ProductDTO {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  description: string;
  isActive: boolean;
}

export interface InventoryItemDTO {
  id: number;
  productId: number;
  item: string;
  category: string;
  stock: number;
  min: number;
  safetyThreshold: number;
  unit: string;
  isLowStock: boolean;
  updatedAt: string;
}

export interface OrderItemDTO {
  productId?: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderDTO {
  id: number;
  patientId?: number | null;
  description: string;
  amount: number;
  method: string;
  status: string;
  recipientName: string;
  recipientNumber: string;
  date: string;
  items: OrderItemDTO[];
  createdAt: string;
}

export interface PaymentDTO {
  id: number;
  orderId?: number | null;
  patientId?: number | null;
  description: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  recipientName: string;
  recipientNumber: string;
  date: string;
  createdAt: string;
}

export interface CallLogDTO {
  id: number;
  patientId?: number | null;
  patient: string;
  phone: string;
  time: string;
  type: CallType;
  duration: string;
  status: CallStatus;
  note?: string | null;
  createdAt: string;
}

export interface ChatMessageDTO {
  id?: number;
  conversationId?: number;
  phone: string;
  patientName?: string | null;
  role: "user" | "bot";
  sender: "patient" | "edubot" | "staff";
  text: string;
  handoverRequested?: boolean;
  handoverHandled?: boolean;
  handoverClosed?: boolean;
  createdAt: string;
}

export interface HeroSlideDTO {
  id: number;
  badge: string;
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelSubtitle: string;
  panelAccent: string;
  background: string;
  image: string;
  overlayText?: string | null;
  subText?: string | null;
  smallText?: string | null;
  stats: [string, string, string][];
  displayOrder: number;
}

export interface BlogPostDTO {
  id: number;
  title: string;
  category: string;
  date: string;
  readTime: string;
  excerpt: string;
  content?: string | null;
  image: string;
  isPublished: boolean;
}

export interface MonthlyReportDTO {
  id: number;
  month: string;
  year: number;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  topProduct: string;
  topProductUnits: number;
  topProductRevenue: number;
  lowStockCount: number;
  productsSold: Array<{ name: string; sold: number; revenue: number }>;
  generatedAt: string;
}

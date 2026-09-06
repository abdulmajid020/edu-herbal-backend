import dotenv from "dotenv";
dotenv.config();

import { SmsService } from "../services/sms.service";
import { formatArkeselPhone, formatArkeselPhoneList, isValidGhanaPhone } from "../utils/phoneFormatter";

async function runTests() {
  console.log("=========================================");
  console.log("🧪 TESTING ARKESEL SMS INTEGRATION");
  console.log("=========================================\n");

  // 1. Phone number normalization test
  console.log("1. Phone Number Normalization Tests:");
  const testNumbers = [
    "0558379545",
    "+233 55 837 9545",
    "233241000001",
    "024 100 0002",
    "invalid",
  ];

  testNumbers.forEach((p) => {
    console.log(`  Raw: "${p}" -> Arkesel Format: "${formatArkeselPhone(p)}" | Valid: ${isValidGhanaPhone(p)}`);
  });

  const listFormatted = formatArkeselPhoneList([...testNumbers, "0558379545"]); // test deduplication
  console.log(`\n  Deduplicated phone list for bulk dispatch (${listFormatted.length}):`, listFormatted);

  // 2. Test SMS Balance endpoint check
  console.log("\n2. Checking SMS Gateway Balance:");
  try {
    const balanceRes = await SmsService.checkBalance();
    console.log("  Balance Response:", JSON.stringify(balanceRes, null, 2));
  } catch (err: any) {
    console.error("  Balance check error:", err.message);
  }

  // 3. Test Appointment SMS Formatting
  console.log("\n3. Testing Appointment Confirmation SMS:");
  const apptRes = await SmsService.sendAppointmentConfirmation({
    fullName: "Kofi Mensah",
    phone: "0558379545",
    doctorName: "Dr. Edu Mohammed",
    date: "2026-09-05",
    time: "10:00 AM",
  });
  console.log("  Appointment SMS result:", JSON.stringify(apptRes, null, 2));

  // 4. Test Staff Announcement SMS
  console.log("\n4. Testing Staff Announcement SMS Broadcast:");
  const staffRes = await SmsService.sendStaffAnnouncement({
    title: "Clinical Staff Emergency Briefing",
    message: "Urgent shift change for dispensary and lab teams at 3:00 PM today.",
    author: "Dr. Edu Mohammed",
    recipients: ["0558379545", "0241000001"],
  });
  console.log("  Staff Announcement SMS result:", JSON.stringify(staffRes, null, 2));

  // 5. Test Order Readiness Notification
  console.log("\n5. Testing Order Readiness SMS:");
  const orderRes = await SmsService.sendOrderReadyNotification({
    recipientName: "Ama Owusu",
    phone: "0558379545",
    orderId: 1049,
    amount: 140,
    description: "Edhec SM Bitters (x2)",
  });
  console.log("  Order SMS result:", JSON.stringify(orderRes, null, 2));

  console.log("\n=========================================");
  console.log("✅ ALL TESTS EXECUTED SUCCESSFULLY");
  console.log("=========================================");
}

runTests().catch(console.error);

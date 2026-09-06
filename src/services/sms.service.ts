import { logger } from "../utils/logger";
import { formatArkeselPhone, formatArkeselPhoneList } from "../utils/phoneFormatter";

export interface AppointmentSmsParams {
  fullName: string;
  phone: string;
  doctorName?: string;
  date: string;
  time: string;
}

export interface AppointmentStatusSmsParams {
  fullName: string;
  phone: string;
  doctorName?: string;
  date: string;
  time?: string;
  status: "Pending" | "Confirmed" | "Completed" | "Upcoming" | "Cancelled" | string;
}

export interface StaffAnnouncementSmsParams {
  title: string;
  message: string;
  author?: string;
  recipients: string[];
}

export interface OrderNotificationSmsParams {
  recipientName: string;
  phone: string;
  orderId: number | string;
  amount?: number;
  description?: string;
}

export interface SmsResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  mocked?: boolean;
  recipientCount?: number;
}

export class SmsService {
  private static get apiKey(): string {
    return process.env.ARKESEL_API_KEY || "";
  }

  private static get senderId(): string {
    return process.env.ARKESEL_SENDER_ID || "EduHerbal";
  }

  private static get smsUrl(): string {
    return process.env.ARKESEL_SMS_URL || "https://sms.arkesel.com/api/v2/sms/send";
  }

  private static get balanceUrl(): string {
    return process.env.ARKESEL_BALANCE_URL || "https://sms.arkesel.com/api/v2/clients/balance";
  }

  private static readonly CLINIC_HOTLINE = "+233 55 837 9545";

  // Primary dispatcher to Arkesel V2 REST API
  public static async sendSms(
    recipients: string | string[],
    message: string,
    customSender?: string
  ): Promise<SmsResponse> {
    const rawList = Array.isArray(recipients) ? recipients : [recipients];
    const sanitizedRecipients = formatArkeselPhoneList(rawList);

    if (sanitizedRecipients.length === 0) {
      logger.warn("[SMS WARNING] No valid phone numbers provided for dispatch.");
      return {
        success: false,
        error: "No valid recipient phone numbers provided (must be standard Ghana/int phone digits).",
      };
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return { success: false, error: "SMS message content cannot be empty." };
    }

    const sender = customSender || this.senderId;
    const apiKey = this.apiKey;

    // Development/Fallback Mode: If key is not configured or in dev placeholder mode
    if (!apiKey || apiKey.includes("your_arkesel_api_key")) {
      logger.info(
        `[SMS MOCK DISPATCH] Sender: ${sender} | Recipients (${sanitizedRecipients.length}): [${sanitizedRecipients.join(
          ", "
        )}] | Content: "${trimmedMessage}"`
      );
      return {
        success: true,
        mocked: true,
        recipientCount: sanitizedRecipients.length,
        message: "SMS logged in console (Mock Mode: configure ARKESEL_API_KEY in .env for live SMS).",
      };
    }

    try {
      logger.info(
        `[ARKESEL DISPATCH] Sending to ${sanitizedRecipients.length} recipient(s) via Sender ID '${sender}'...`
      );

      const response = await fetch(this.smsUrl, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: sender,
          message: trimmedMessage,
          recipients: sanitizedRecipients,
        }),
      });

      const responseData: any = await response.json().catch(() => ({}));

      if (!response.ok || responseData.status === "error" || responseData.code === 101) {
        const errorMsg =
          responseData.message || responseData.error || `Arkesel returned HTTP status ${response.status}`;
        logger.error(`[ARKESEL ERROR] Dispatch failed: ${errorMsg} - Response:`, responseData);
        return {
          success: false,
          error: errorMsg,
          data: responseData,
        };
      }

      logger.info(
        `[ARKESEL SUCCESS] Successfully dispatched SMS to ${sanitizedRecipients.length} recipient(s).`
      );
      return {
        success: true,
        recipientCount: sanitizedRecipients.length,
        message: "SMS dispatched successfully via Arkesel.",
        data: responseData,
      };
    } catch (err: any) {
      logger.error(`[ARKESEL NETWORK ERROR] Failed to connect to Arkesel SMS gateway: ${err.message}`);
      return {
        success: false,
        error: `Network error connecting to SMS Gateway: ${err.message}`,
      };
    }
  }

  // 1. Send Appointment Confirmation to Patient
  public static async sendAppointmentConfirmation(params: AppointmentSmsParams): Promise<SmsResponse> {
    const { fullName, phone, doctorName, date, time } = params;
    const text = `Hello ${fullName || "Patient"}, your appointment with ${
      doctorName || "our Doctor"
    } at Edu Herbal Clinic is confirmed for ${date} at ${time}. Enquiries/Reschedule: ${this.CLINIC_HOTLINE}.`;

    return this.sendSms(phone, text);
  }

  // 2. Send Appointment Status Update (Confirmed, Rescheduled, Cancelled, Completed)
  public static async sendAppointmentStatusUpdate(params: AppointmentStatusSmsParams): Promise<SmsResponse> {
    const { fullName, phone, doctorName, date, time, status } = params;
    let text = "";

    switch (status) {
      case "Confirmed":
        text = `Hello ${fullName}, your appointment with ${
          doctorName || "Doctor"
        } at Edu Herbal Clinic on ${date}${time ? ` at ${time}` : ""} is now officially CONFIRMED. Hotline: ${
          this.CLINIC_HOTLINE
        }.`;
        break;
      case "Cancelled":
        text = `Hello ${fullName}, your appointment at Edu Herbal Clinic scheduled for ${date} has been CANCELLED. To reschedule, kindly contact us on ${this.CLINIC_HOTLINE}.`;
        break;
      case "Completed":
        text = `Thank you for visiting Edu Herbal Clinic today, ${fullName}. Please adhere strictly to your herbal prescription regimen. For follow-up queries, reach us at ${this.CLINIC_HOTLINE}.`;
        break;
      case "Upcoming":
        text = `Notice: Hello ${fullName}, your upcoming appointment at Edu Herbal Clinic is on ${date} at ${time}. Please arrive 15 minutes before your time.`;
        break;
      default:
        text = `Update: Hello ${fullName}, the status of your appointment at Edu Herbal Clinic for ${date} has been updated to "${status}". Call ${this.CLINIC_HOTLINE} for assistance.`;
    }

    return this.sendSms(phone, text);
  }

  // 3. Send 24-Hour Prior Appointment Reminder
  public static async sendAppointmentReminder(params: AppointmentSmsParams): Promise<SmsResponse> {
    const { fullName, phone, doctorName, date, time } = params;
    const text = `Appointment Reminder: Hello ${fullName}, you have an appointment with ${
      doctorName || "our Doctor"
    } at Edu Herbal Clinic tomorrow (${date}) at ${time}. Please arrive 15 mins prior. Hotline: ${
      this.CLINIC_HOTLINE
    }.`;

    return this.sendSms(phone, text);
  }

  // 4. Broadcast Announcement to Staff Members
  public static async sendStaffAnnouncement(params: StaffAnnouncementSmsParams): Promise<SmsResponse> {
    const { title, message, author, recipients } = params;
    const cleanTitle = title.trim();
    const authorTag = author ? ` - ${author}` : "";
    const text = `[Edu Herbal Staff Notice] ${cleanTitle.toUpperCase()}: ${message.trim()}${authorTag}`;

    return this.sendSms(recipients, text);
  }

  // 5. Send Order/Prescription Readiness Notification to Patient
  public static async sendOrderReadyNotification(params: OrderNotificationSmsParams): Promise<SmsResponse> {
    const { recipientName, phone, orderId, amount, description } = params;
    const amountText = amount ? ` (Total: GHS ${amount.toFixed(2)})` : "";
    const descText = description ? ` [${description}]` : "";
    const text = `Dear ${recipientName || "Valued Patient"}, your herbal remedy order #${orderId}${descText}${amountText} has been processed at Edu Herbal Dispensary. Inquiries: ${this.CLINIC_HOTLINE}.`;

    return this.sendSms(phone, text);
  }

  // 6. Check Arkesel SMS Account Balance & Information
  public static async checkBalance(): Promise<{ success: boolean; data?: any; error?: string; mocked?: boolean }> {
    const apiKey = this.apiKey;
    if (!apiKey || apiKey.includes("your_arkesel_api_key")) {
      return {
        success: true,
        mocked: true,
        data: {
          balance: "999.00",
          currency: "GHS",
          sms_count: 999,
          sender_id: this.senderId,
          note: "Mock Balance Mode. Add real credentials to .env to fetch live Arkesel wallet balance.",
        },
      };
    }

    try {
      const response = await fetch(this.balanceUrl, {
        method: "GET",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      const data: any = await response.json().catch(() => ({}));
      if (!response.ok || data.status === "error") {
        return {
          success: false,
          error: data.message || `Failed to fetch balance (HTTP ${response.status})`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Could not retrieve balance: ${err.message}`,
      };
    }
  }

  // 7. Test SMS dispatch
  public static async sendTestSms(phone: string, message?: string): Promise<SmsResponse> {
    const testMsg =
      message ||
      `This is a test notification from Edu Herbal Clinic SMS Gateway. Arkesel integration is operational! Date: ${new Date().toLocaleString(
        "en-GB"
      )}`;
    return this.sendSms(phone, testMsg);
  }
}

import { logger } from "../utils/logger";

export interface AppointmentSmsParams {
  fullName: string;
  phone: string;
  doctorName: string;
  date: string;
  time: string;
}

export class SmsService {
  public static async sendAppointmentConfirmation(params: AppointmentSmsParams): Promise<{ success: boolean; message: string }> {
    const { fullName, phone, doctorName, date, time } = params;
    const hospitalNumber = "+233 055 837 9545";
    const text = `Hello ${fullName || "there"}, we have received and confirmed your appointment at Edu Herbal Clinic. Your appointment with ${doctorName || "our doctor"} is scheduled for ${date} at ${time}. For questions call ${hospitalNumber}.`;

    logger.info(`[SMS DISPATCH] To: ${phone} | Content: ${text}`);

    // In production, integrate with SMS gateway (e.g. Arkesel, Hubtel, Twilio)
    return {
      success: true,
      message: text,
    };
  }
}

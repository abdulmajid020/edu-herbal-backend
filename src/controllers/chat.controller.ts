import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";
import { EduBotService } from "../services/edubot.service";
import { ChatMessageDTO } from "../types";

export class ChatController {
  public static async authenticate(req: Request, res: Response) {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Patient name and Ghana phone number are required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const existingMessages = MemoryStore.chatMessages.filter((m) => m.phone === normalizedPhone);

    if (existingMessages.length === 0) {
      const welcomeMessage: ChatMessageDTO = {
        phone: normalizedPhone,
        patientName: name.trim(),
        role: "bot",
        sender: "edubot",
        text: `Welcome, ${name.trim()}. You are verified for this private chat. How can I help you today?`,
        createdAt: new Date().toISOString(),
      };
      MemoryStore.chatMessages.push(welcomeMessage);
      existingMessages.push(welcomeMessage);
    }

    return res.status(200).json({
      success: true,
      phone: normalizedPhone,
      patientName: name.trim(),
      messages: existingMessages,
    });
  }

  public static async getMessages(req: Request, res: Response) {
    const { phone } = req.query;

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ success: false, error: "Phone number query parameter is required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const messages = MemoryStore.chatMessages.filter((m) => m.phone === normalizedPhone);

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  }

  public static async send(req: Request, res: Response) {
    const { phone, patientName, text } = req.body;

    if (!phone || !text) {
      return res.status(400).json({ success: false, error: "Phone number and message text are required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const userMessage: ChatMessageDTO = {
      phone: normalizedPhone,
      patientName: patientName || "Patient",
      role: "user",
      sender: "patient",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    MemoryStore.chatMessages.push(userMessage);

    // Process with EduBot
    const botResponse = EduBotService.generateResponse(text, patientName || "Patient");
    userMessage.handoverRequested = botResponse.handoverRequested;

    const botMessage: ChatMessageDTO = {
      phone: normalizedPhone,
      patientName: patientName || "Patient",
      role: "bot",
      sender: "edubot",
      text: botResponse.reply,
      handoverRequested: botResponse.handoverRequested,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.chatMessages.push(botMessage);

    return res.status(200).json({
      success: true,
      userMessage,
      botMessage,
      handoverTriggered: botResponse.handoverRequested,
      reply: botResponse.reply,
    });
  }

  public static async getAdminConversations(req: Request, res: Response) {
    const grouped: Record<string, { key: string; name: string; phone: string; messages: ChatMessageDTO[]; handoverActive: boolean; handoverPending: boolean; latestMessage: string }> = {};

    MemoryStore.chatMessages.forEach((msg) => {
      if (!grouped[msg.phone]) {
        grouped[msg.phone] = {
          key: msg.phone,
          name: msg.patientName || "Patient",
          phone: msg.phone,
          messages: [],
          handoverActive: false,
          handoverPending: false,
          latestMessage: msg.text,
        };
      }
      grouped[msg.phone].messages.push(msg);
      grouped[msg.phone].latestMessage = msg.text;

      if (msg.handoverRequested && !msg.handoverClosed) {
        grouped[msg.phone].handoverActive = true;
        if (!msg.handoverHandled) {
          grouped[msg.phone].handoverPending = true;
        }
      }
    });

    return res.status(200).json({
      success: true,
      conversations: Object.values(grouped),
    });
  }

  public static async adminReply(req: Request, res: Response) {
    const { phone, patientName, text } = req.body;

    if (!phone || !text) {
      return res.status(400).json({ success: false, error: "Phone and reply text are required." });
    }

    const normalizedPhone = normalizePhone(phone);
    const replyMessage: ChatMessageDTO = {
      phone: normalizedPhone,
      patientName: patientName || "Patient",
      role: "bot",
      sender: "staff",
      text: text.trim(),
      handoverHandled: true,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.chatMessages.push(replyMessage);

    // Mark previous handover requests as handled
    MemoryStore.chatMessages.forEach((m) => {
      if (m.phone === normalizedPhone && m.handoverRequested) {
        m.handoverHandled = true;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Staff reply sent to patient.",
      data: replyMessage,
    });
  }

  public static async closeHandover(req: Request, res: Response) {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone || "");

    MemoryStore.chatMessages.forEach((m) => {
      if (m.phone === normalizedPhone) {
        m.handoverClosed = true;
        m.handoverHandled = true;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Handover closed. EduBot reactivated for this conversation.",
    });
  }

  public static async deleteConversation(req: Request, res: Response) {
    const phone = normalizePhone(String(req.params.phone || ""));
    const initialCount = MemoryStore.chatMessages.length;
    MemoryStore.chatMessages = MemoryStore.chatMessages.filter((m) => m.phone !== phone);

    return res.status(200).json({
      success: true,
      message: `Deleted conversation for ${phone}. Removed ${initialCount - MemoryStore.chatMessages.length} messages.`,
    });
  }
}

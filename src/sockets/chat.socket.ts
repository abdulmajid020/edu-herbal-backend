import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../utils/logger";
import { MemoryStore } from "../config/database";

export function initializeChatSockets(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    logger.info(`[SOCKET CONNECTED] Socket ID: ${socket.id}`);

    // Join patient's specific room
    socket.on("join-patient-room", (phone: string) => {
      socket.join(phone);
      logger.info(`[SOCKET] ${socket.id} joined room: ${phone}`);
    });

    // Handle staff joining admin room
    socket.on("join-admin-room", () => {
      socket.join("admin-callcentre");
      logger.info(`[SOCKET] ${socket.id} joined admin-callcentre room`);
    });

    // Handle real-time messaging
    socket.on("patient-send-message", (data: { phone: string; patientName: string; text: string }) => {
      logger.info(`[SOCKET] Patient message received for ${data.phone}`);
      io.to("admin-callcentre").emit("admin-chat-updated", data);
    });

    socket.on("admin-send-reply", (data: { phone: string; text: string }) => {
      logger.info(`[SOCKET] Admin reply sent to ${data.phone}`);
      io.to(data.phone).emit("patient-message-received", data);
    });

    socket.on("disconnect", () => {
      logger.info(`[SOCKET DISCONNECTED] Socket ID: ${socket.id}`);
    });
  });
}

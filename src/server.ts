import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initializeChatSockets } from "./sockets/chat.socket";

const app = createApp();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN === "*" ? "*" : [env.FRONTEND_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

initializeChatSockets(io);

const port = Number(env.PORT) || 3001;

server.listen(port, () => {
  logger.info(`=======================================================`);
  logger.info(`🌿 Edu-Herbal Clinic Backend Server listening on port ${port}`);
  logger.info(`🚀 Health check: http://localhost:${port}/api/health`);
  logger.info(`📦 Environment: ${env.NODE_ENV}`);
  logger.info(`=======================================================`);
});

export { app, server, io };

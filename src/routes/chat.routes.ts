import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();

router.post("/auth", ChatController.authenticate);
router.get("/messages", ChatController.getMessages);
router.post("/send", ChatController.send);
router.get("/admin/conversations", ChatController.getAdminConversations);
router.post("/admin/reply", ChatController.adminReply);
router.put("/admin/handover/close", ChatController.closeHandover);
router.delete("/admin/conversation/:phone", ChatController.deleteConversation);

export default router;

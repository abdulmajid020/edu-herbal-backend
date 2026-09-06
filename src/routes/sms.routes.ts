import { Router } from "express";
import { SmsController } from "../controllers/sms.controller";

const router = Router();

router.get("/balance", SmsController.getBalance);
router.post("/test", SmsController.sendTestSms);
router.post("/broadcast", SmsController.sendBroadcast);
router.post("/reminders/send-daily", SmsController.sendDailyReminders);

export default router;

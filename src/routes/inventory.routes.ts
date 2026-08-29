import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller";

const router = Router();

router.get("/", InventoryController.getInventory);
router.get("/low-stock", InventoryController.getLowStock);
router.post("/restock", InventoryController.restock);

export default router;

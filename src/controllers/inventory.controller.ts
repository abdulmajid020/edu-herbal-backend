import { Request, Response } from "express";
import { MemoryStore } from "../config/database";

export class InventoryController {
  public static async getInventory(req: Request, res: Response) {
    const threshold = 35;
    const lowStockCount = MemoryStore.inventory.filter((i) => i.stock < threshold).length;

    return res.status(200).json({
      success: true,
      data: MemoryStore.inventory,
      lowStockCount,
      safetyThreshold: threshold,
    });
  }

  public static async restock(req: Request, res: Response) {
    const { item, category, stock, min, unit } = req.body;

    if (!item) {
      return res.status(400).json({ success: false, error: "Product item name is required." });
    }

    const addedStock = Number(stock) || 0;
    const existingIndex = MemoryStore.inventory.findIndex(
      (i) => i.item.toLowerCase() === item.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
      const existing = MemoryStore.inventory[existingIndex];
      existing.stock += addedStock;
      if (min) existing.min = Number(min);
      if (unit) existing.unit = unit;
      existing.isLowStock = existing.stock < 35;
      existing.updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: `Updated stock for ${existing.item}. New quantity: ${existing.stock} ${existing.unit}.`,
        data: existing,
      });
    }

    const newInventory = {
      id: Date.now(),
      productId: Date.now(),
      item: item.trim(),
      category: category || "General",
      stock: addedStock,
      min: Number(min) || 5,
      safetyThreshold: 35,
      unit: unit || "units",
      isLowStock: addedStock < 35,
      updatedAt: new Date().toISOString(),
    };

    MemoryStore.inventory.unshift(newInventory);

    return res.status(201).json({
      success: true,
      message: `Added new stock item: ${newInventory.item}.`,
      data: newInventory,
    });
  }

  public static async getLowStock(req: Request, res: Response) {
    const lowStockItems = MemoryStore.inventory.filter((i) => i.stock < 35);
    return res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  }
}

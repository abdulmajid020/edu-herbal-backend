import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";

export class InventoryController {
  public static async getInventory(req: Request, res: Response) {
    const threshold = 35;

    try {
      let dbInventory: any[] = [];
      try {
        dbInventory = await prisma.inventory.findMany({
          include: { product: true },
          orderBy: { id: "asc" },
        });
      } catch (dbErr) {
        console.warn("[INVENTORY DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      let list = dbInventory.length > 0
        ? dbInventory.map((inv) => ({
            id: inv.id,
            productId: inv.productId,
            item: inv.product?.name || `Product #${inv.productId}`,
            category: inv.product?.category || "General",
            stock: inv.stock,
            min: inv.minStock,
            safetyThreshold: inv.safetyThreshold || threshold,
            unit: inv.unit || "units",
            isLowStock: inv.stock < (inv.safetyThreshold || threshold),
            updatedAt: inv.updatedAt ? inv.updatedAt.toISOString() : new Date().toISOString(),
          }))
        : [...MemoryStore.inventory];

      const lowStockCount = list.filter((i) => i.stock < threshold).length;

      return res.status(200).json({
        success: true,
        data: list,
        lowStockCount,
        safetyThreshold: threshold,
      });
    } catch (err: any) {
      console.error("Get inventory error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch inventory." });
    }
  }

  public static async restock(req: Request, res: Response) {
    const { item, category, stock, min, unit } = req.body;

    if (!item) {
      return res.status(400).json({ success: false, error: "Product item name is required." });
    }

    const addedStock = Number(stock) || 0;
    const minVal = Number(min) || 5;
    const unitVal = unit || "units";

    try {
      // 1. Try to find product & update in PostgreSQL
      let updatedRecord: any = null;
      try {
        const product = await prisma.product.findFirst({
          where: { name: { equals: String(item).trim(), mode: "insensitive" } },
          include: { inventory: true },
        });

        if (product && product.inventory) {
          const newTotal = product.inventory.stock + addedStock;
          const updatedInv = await prisma.inventory.update({
            where: { id: product.inventory.id },
            data: {
              stock: newTotal,
              minStock: minVal,
              unit: unitVal,
            },
          });
          updatedRecord = {
            id: updatedInv.id,
            productId: product.id,
            item: product.name,
            category: product.category,
            stock: updatedInv.stock,
            min: updatedInv.minStock,
            safetyThreshold: updatedInv.safetyThreshold || 35,
            unit: updatedInv.unit,
            isLowStock: updatedInv.stock < 35,
            updatedAt: updatedInv.updatedAt.toISOString(),
          };
        }
      } catch (dbErr) {
        console.warn("[RESTOCK DB WARNING]", dbErr);
      }

      // 2. Update MemoryStore
      const existingIndex = MemoryStore.inventory.findIndex(
        (i) => i.item.toLowerCase() === item.trim().toLowerCase()
      );

      if (existingIndex !== -1) {
        const existing = MemoryStore.inventory[existingIndex];
        existing.stock += addedStock;
        if (min) existing.min = minVal;
        if (unit) existing.unit = unitVal;
        existing.isLowStock = existing.stock < 35;
        existing.updatedAt = new Date().toISOString();

        return res.status(200).json({
          success: true,
          message: `Updated stock for ${existing.item}. New quantity: ${existing.stock} ${existing.unit}.`,
          data: updatedRecord || existing,
        });
      }

      const newInventory = updatedRecord || {
        id: Date.now(),
        productId: Date.now(),
        item: item.trim(),
        category: category || "General",
        stock: addedStock,
        min: minVal,
        safetyThreshold: 35,
        unit: unitVal,
        isLowStock: addedStock < 35,
        updatedAt: new Date().toISOString(),
      };

      MemoryStore.inventory.unshift(newInventory);

      return res.status(201).json({
        success: true,
        message: `Added new stock item: ${newInventory.item}.`,
        data: newInventory,
      });
    } catch (err: any) {
      console.error("Restock error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to restock item." });
    }
  }

  public static async getLowStock(req: Request, res: Response) {
    try {
      const threshold = 35;
      let lowStockItems: any[] = [];

      try {
        const dbLow = await prisma.inventory.findMany({
          where: { stock: { lt: threshold } },
          include: { product: true },
        });
        if (dbLow.length > 0) {
          lowStockItems = dbLow.map((inv) => ({
            id: inv.id,
            productId: inv.productId,
            item: inv.product?.name || `Product #${inv.productId}`,
            category: inv.product?.category || "General",
            stock: inv.stock,
            min: inv.minStock,
            safetyThreshold: inv.safetyThreshold || threshold,
            unit: inv.unit || "units",
            isLowStock: true,
            updatedAt: inv.updatedAt ? inv.updatedAt.toISOString() : new Date().toISOString(),
          }));
        }
      } catch {}

      if (lowStockItems.length === 0) {
        lowStockItems = MemoryStore.inventory.filter((i) => i.stock < threshold);
      }

      return res.status(200).json({
        success: true,
        count: lowStockItems.length,
        data: lowStockItems,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch low stock items." });
    }
  }
}

import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { normalizePhone } from "../utils/phoneFormatter";
import { OrderItemDTO } from "../types";

export class OrderController {
  public static async checkout(req: Request, res: Response) {
    const { items, paymentMethod, recipientName, recipientNumber } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Cart items array is required." });
    }
    if (!recipientName || !recipientNumber) {
      return res.status(400).json({ success: false, error: "Recipient name and Mobile Money phone number are required." });
    }

    const normalizedNumber = normalizePhone(recipientNumber);
    let totalAmount = 0;
    const resolvedItems: OrderItemDTO[] = [];
    const itemNames: string[] = [];

    items.forEach((item: { productId?: number; name?: string; quantity: number; price?: number }) => {
      const product = item.productId
        ? MemoryStore.products.find((p) => p.id === item.productId)
        : MemoryStore.products.find((p) => p.name.toLowerCase() === (item.name || "").toLowerCase());

      const price = product ? product.price : Number(item.price) || 40;
      const name = product ? product.name : item.name || "Herbal Medicine";
      const quantity = Number(item.quantity) || 1;
      const subtotal = price * quantity;

      totalAmount += subtotal;
      resolvedItems.push({
        productId: product?.id,
        name,
        quantity,
        price,
        subtotal,
      });
      itemNames.push(`${name} (x${quantity})`);

      // Deduct from inventory
      if (product) {
        const inventory = MemoryStore.inventory.find((i) => i.productId === product.id);
        if (inventory) {
          inventory.stock = Math.max(0, inventory.stock - quantity);
          inventory.isLowStock = inventory.stock < 35;
          inventory.updatedAt = new Date().toISOString();
        }
      }
    });

    const description = itemNames.join(", ");
    const orderDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const newOrder = {
      id: Date.now(),
      description,
      amount: totalAmount,
      method: paymentMethod || "Mobile Money",
      status: "Paid",
      recipientName: recipientName.trim(),
      recipientNumber: normalizedNumber,
      date: orderDate,
      items: resolvedItems,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.orders.unshift(newOrder);

    // Record payment automatically
    const newPayment = {
      id: Date.now() + 1,
      orderId: newOrder.id,
      description,
      amount: totalAmount,
      method: newOrder.method,
      status: "Paid" as const,
      recipientName: newOrder.recipientName,
      recipientNumber: newOrder.recipientNumber,
      date: orderDate,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.payments.unshift(newPayment);

    return res.status(201).json({
      success: true,
      message: `Payment successful. ${resolvedItems.length} medication item(s) recorded.`,
      order: newOrder,
      payment: newPayment,
    });
  }

  public static async getOrders(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      count: MemoryStore.orders.length,
      data: MemoryStore.orders,
    });
  }

  public static async getTopSelling(req: Request, res: Response) {
    const productStats: Record<string, { name: string; sold: number; revenue: number }> = {};

    MemoryStore.orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productStats[item.name]) {
          productStats[item.name] = { name: item.name, sold: 0, revenue: 0 };
        }
        productStats[item.name].sold += item.quantity;
        productStats[item.name].revenue += item.subtotal;
      });
    });

    const topSelling = Object.values(productStats).sort((a, b) => b.sold - a.sold);

    // Fallback seed rankings if fresh store
    const responseData = topSelling.length > 0 ? topSelling : [
      { name: "Edhec SM Bitters", sold: 40, revenue: 2800 },
      { name: "Edhec Herbal Mixture", sold: 34, revenue: 1360 },
      { name: "Edhec Herbal Tonic", sold: 28, revenue: 1120 },
      { name: "Edhec Be Stronge", sold: 22, revenue: 880 },
      { name: "Edhec Malacure Mixture", sold: 18, revenue: 720 },
    ];

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  }
}

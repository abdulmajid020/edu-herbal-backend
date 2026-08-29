import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";

export class ProductController {
  public static async getProducts(req: Request, res: Response) {
    const { category, search } = req.query;

    try {
      let dbProducts: any[] = [];
      try {
        const whereClause: any = { isActive: true };
        if (category && typeof category === "string" && category !== "All") {
          whereClause.category = { equals: category, mode: "insensitive" };
        }
        if (search && typeof search === "string") {
          whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
        }

        dbProducts = await prisma.product.findMany({
          where: whereClause,
          orderBy: { id: "asc" },
        });
      } catch (dbErr) {
        console.warn("[PRODUCT DB WARNING] Falling back to MemoryStore:", dbErr);
      }

      let list = dbProducts.length > 0
        ? dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price),
            description: p.description,
            imageUrl: p.imageUrl,
            isActive: p.isActive,
          }))
        : [...MemoryStore.products];

      if (dbProducts.length === 0) {
        if (category && typeof category === "string" && category !== "All") {
          list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
        }

        if (search && typeof search === "string") {
          const q = search.toLowerCase();
          list = list.filter(
            (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
          );
        }
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (err: any) {
      console.error("Get products error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch products." });
    }
  }

  public static async getProductById(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);

    try {
      let product: any = null;
      let inventory: any = null;

      try {
        product = await prisma.product.findUnique({
          where: { id },
          include: { inventory: true },
        });

        if (product) {
          inventory = product.inventory;
          product = {
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price),
            description: product.description,
            imageUrl: product.imageUrl,
            isActive: product.isActive,
          };
        }
      } catch {}

      if (!product) {
        product = MemoryStore.products.find((p) => p.id === id);
        inventory = MemoryStore.inventory.find((i) => i.productId === id);
      }

      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found." });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...product,
          inventory,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch product." });
    }
  }
}

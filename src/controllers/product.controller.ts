import { Request, Response } from "express";
import { MemoryStore } from "../config/database";

export class ProductController {
  public static async getProducts(req: Request, res: Response) {
    const { category, search } = req.query;
    let list = [...MemoryStore.products];

    if (category && typeof category === "string" && category !== "All") {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list,
    });
  }

  public static async getProductById(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const product = MemoryStore.products.find((p) => p.id === id);

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }

    const inventory = MemoryStore.inventory.find((i) => i.productId === id);

    return res.status(200).json({
      success: true,
      data: {
        ...product,
        inventory,
      },
    });
  }
}

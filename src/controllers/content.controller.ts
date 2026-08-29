import { Request, Response } from "express";
import { MemoryStore } from "../config/database";

export class ContentController {
  public static async getHeroSlides(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: MemoryStore.heroSlides,
    });
  }

  public static async updateHeroSlides(req: Request, res: Response) {
    const { slides } = req.body;

    if (!slides || !Array.isArray(slides)) {
      return res.status(400).json({ success: false, error: "Slides array is required." });
    }

    MemoryStore.heroSlides = slides;
    return res.status(200).json({
      success: true,
      message: "Hero carousel slides updated successfully.",
      data: MemoryStore.heroSlides,
    });
  }

  public static async getBlogPosts(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      count: MemoryStore.blogPosts.length,
      data: MemoryStore.blogPosts,
    });
  }

  public static async createBlogPost(req: Request, res: Response) {
    const { title, category, date, readTime, excerpt, image, content } = req.body;

    if (!title || !category || !excerpt) {
      return res.status(400).json({ success: false, error: "Title, category, and excerpt are required." });
    }

    const newPost = {
      id: Date.now(),
      title: title.trim(),
      category: category.trim(),
      date: date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      readTime: readTime || "5 min",
      excerpt: excerpt.trim(),
      content: content || null,
      image: image || "/imports/news-3.jpg",
      isPublished: true,
    };

    MemoryStore.blogPosts.unshift(newPost);

    return res.status(201).json({
      success: true,
      message: "Blog post published successfully.",
      data: newPost,
    });
  }

  public static async updateBlogPost(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const postIndex = MemoryStore.blogPosts.findIndex((p) => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }

    const existing = MemoryStore.blogPosts[postIndex];
    const updated = {
      ...existing,
      ...req.body,
    };

    MemoryStore.blogPosts[postIndex] = updated;

    return res.status(200).json({
      success: true,
      message: "Blog post updated successfully.",
      data: updated,
    });
  }

  public static async deleteBlogPost(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const postIndex = MemoryStore.blogPosts.findIndex((p) => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }

    MemoryStore.blogPosts.splice(postIndex, 1);
    return res.status(200).json({
      success: true,
      message: "Blog post deleted successfully.",
    });
  }
}

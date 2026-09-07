import { Request, Response } from "express";
import { prisma, MemoryStore } from "../config/database";
import { uploadBufferToCloudinary, isCloudinaryConfigured } from "../config/cloudinary";

export class ContentController {
  /**
   * Upload image to Cloudinary (for blog posts, hero slides, products, etc.)
   */
  public static async uploadMedia(req: Request, res: Response) {
    try {
      let buffer: Buffer | null = null;
      let folder = (req.body.folder as string) || "edu-herbal/blog";

      if (req.file && req.file.buffer) {
        buffer = req.file.buffer;
      } else if (req.body.image && typeof req.body.image === "string" && req.body.image.startsWith("data:image")) {
        // Base64 image upload support
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }

      if (!buffer) {
        return res.status(400).json({
          success: false,
          error: "No image file or image data provided.",
        });
      }

      // If Cloudinary credentials are fully configured, upload to Cloudinary
      if (isCloudinaryConfigured()) {
        const uploadResult = await uploadBufferToCloudinary(buffer, folder);
        return res.status(200).json({
          success: true,
          message: "Image uploaded successfully to Cloudinary.",
          data: {
            url: uploadResult.secureUrl,
            secureUrl: uploadResult.secureUrl,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            storage: "cloudinary",
          },
        });
      }

      // Fallback: If Cloudinary keys are not yet provided in .env, convert to base64 data URI
      const mime = req.file?.mimetype || "image/jpeg";
      const base64Uri = `data:${mime};base64,${buffer.toString("base64")}`;

      return res.status(200).json({
        success: true,
        message: "Image processed successfully (Set CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET in Backend/.env for live Cloudinary CDN hosting).",
        data: {
          url: base64Uri,
          secureUrl: base64Uri,
          publicId: `local-${Date.now()}`,
          format: mime.split("/")[1] || "jpeg",
          bytes: buffer.length,
          storage: "local-fallback",
        },
      });
    } catch (err: any) {
      console.error("[CLOUDINARY UPLOAD ERROR]", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to upload image to Cloudinary.",
      });
    }
  }

  public static async getHeroSlides(req: Request, res: Response) {
    try {
      const dbSlides = await prisma.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });

      if (dbSlides.length > 0) {
        return res.status(200).json({
          success: true,
          data: dbSlides.map((s) => ({
            id: s.id,
            badge: s.badge,
            eyebrow: s.eyebrow,
            title: s.title,
            description: s.description,
            panelTitle: s.panelTitle,
            panelSubtitle: s.panelSubtitle,
            panelAccent: s.panelAccent,
            background: s.background,
            imageUrl: s.imageUrl,
            overlayText: s.overlayText,
            subText: s.subText,
            smallText: s.smallText,
            stats: s.statsJson,
          })),
        });
      }
    } catch (dbErr) {
      console.warn("[HERO SLIDES DB FALLBACK]", dbErr);
    }

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
    try {
      const dbPosts = await prisma.blogPost.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
      });

      if (dbPosts.length > 0) {
        return res.status(200).json({
          success: true,
          count: dbPosts.length,
          data: dbPosts.map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            date: p.dateLabel,
            readTime: p.readTime,
            excerpt: p.excerpt,
            content: p.content,
            image: p.imageUrl,
            isPublished: p.isPublished,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          })),
        });
      }
    } catch (dbErr) {
      console.warn("[BLOG POSTS DB FALLBACK]", dbErr);
    }

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

    const dateLabel = date || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const imageUrl = image || "/imports/news-3.jpg";
    const postReadTime = readTime || "5 min";

    const newPost = {
      id: Date.now(),
      title: title.trim(),
      category: category.trim(),
      date: dateLabel,
      readTime: postReadTime,
      excerpt: excerpt.trim(),
      content: content || null,
      image: imageUrl,
      isPublished: true,
    };

    MemoryStore.blogPosts.unshift(newPost);

    try {
      const dbPost = await prisma.blogPost.create({
        data: {
          title: newPost.title,
          category: newPost.category,
          dateLabel: newPost.date,
          readTime: newPost.readTime,
          excerpt: newPost.excerpt,
          content: newPost.content,
          imageUrl: newPost.image,
          isPublished: true,
        },
      });
      newPost.id = dbPost.id;
    } catch (dbErr) {
      console.warn("[BLOG CREATE DB WARNING]", dbErr);
    }

    return res.status(201).json({
      success: true,
      message: "Blog post published successfully.",
      data: newPost,
    });
  }

  public static async updateBlogPost(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const postIndex = MemoryStore.blogPosts.findIndex((p) => p.id === id);

    if (postIndex === -1 && isNaN(id)) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }

    const existing = postIndex !== -1 ? MemoryStore.blogPosts[postIndex] : null;
    const updated = {
      ...(existing || {}),
      ...req.body,
      id,
    };

    if (postIndex !== -1) {
      MemoryStore.blogPosts[postIndex] = updated;
    } else {
      MemoryStore.blogPosts.unshift(updated);
    }

    try {
      await prisma.blogPost.update({
        where: { id },
        data: {
          title: updated.title,
          category: updated.category,
          dateLabel: updated.date,
          readTime: updated.readTime,
          excerpt: updated.excerpt,
          content: updated.content,
          imageUrl: updated.image,
          isPublished: updated.isPublished !== undefined ? updated.isPublished : true,
        },
      });
    } catch (dbErr) {
      console.warn("[BLOG UPDATE DB WARNING]", dbErr);
    }

    return res.status(200).json({
      success: true,
      message: "Blog post updated successfully.",
      data: updated,
    });
  }

  public static async deleteBlogPost(req: Request, res: Response) {
    const id = parseInt(String(req.params.id), 10);
    const postIndex = MemoryStore.blogPosts.findIndex((p) => p.id === id);

    if (postIndex !== -1) {
      MemoryStore.blogPosts.splice(postIndex, 1);
    }

    try {
      await prisma.blogPost.delete({ where: { id } });
    } catch (dbErr) {
      console.warn("[BLOG DELETE DB WARNING]", dbErr);
    }

    return res.status(200).json({
      success: true,
      message: "Blog post deleted successfully.",
    });
  }
}

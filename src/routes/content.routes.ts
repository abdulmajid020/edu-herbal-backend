import { Router } from "express";
import { ContentController } from "../controllers/content.controller";
import { uploadSingleImage } from "../middlewares/upload.middleware";

const router = Router();

// Media Uploads (Cloudinary)
router.post("/upload", uploadSingleImage, ContentController.uploadMedia);

// Hero Slides
router.get("/hero-slides", ContentController.getHeroSlides);
router.put("/hero-slides", ContentController.updateHeroSlides);

// Blog Posts
router.get("/blog-posts", ContentController.getBlogPosts);
router.post("/blog-posts", ContentController.createBlogPost);
router.put("/blog-posts/:id", ContentController.updateBlogPost);
router.delete("/blog-posts/:id", ContentController.deleteBlogPost);

export default router;

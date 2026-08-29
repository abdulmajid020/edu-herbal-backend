import { Router } from "express";
import { ContentController } from "../controllers/content.controller";

const router = Router();

router.get("/hero-slides", ContentController.getHeroSlides);
router.put("/hero-slides", ContentController.updateHeroSlides);

router.get("/blog-posts", ContentController.getBlogPosts);
router.post("/blog-posts", ContentController.createBlogPost);
router.put("/blog-posts/:id", ContentController.updateBlogPost);
router.delete("/blog-posts/:id", ContentController.deleteBlogPost);

export default router;

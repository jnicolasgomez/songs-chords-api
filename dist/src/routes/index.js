import { Router } from "express";
import songsRoutes from "@/songs/components/routes";
import listsRoutes from "@/lists/components/routes";
const router = Router();
router.use(songsRoutes);
router.use(listsRoutes);
export default router;

import { Router } from "express";
import songsRoutes from "../songs/components/routes.ts";
import listsRoutes from "../lists/components/routes.ts";
import artistsRoutes from "../artists/components/routes.ts";
import bandsRoutes from "../bands/components/routes.ts";
import aiRoutes from "../ai/components/routes.ts";
import usersRoutes from "../users/components/routes.ts";
import healthRoutes from "../health/routes.ts";

const router: Router = Router();

router.use(healthRoutes);
router.use(songsRoutes);
router.use(listsRoutes);
router.use(artistsRoutes);
router.use(bandsRoutes);
router.use(aiRoutes);
router.use(usersRoutes);

export default router;
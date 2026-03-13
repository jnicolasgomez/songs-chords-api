import { Router } from "express";
import songsRoutes from "../songs/components/routes.ts";
import listsRoutes from "../lists/components/routes.ts";
import artistsRoutes from "../artists/components/routes.ts";
import bandsRoutes from "../bands/components/routes.ts";

const router: Router = Router();

router.use(songsRoutes);
router.use(listsRoutes);
router.use(artistsRoutes);
router.use(bandsRoutes);

export default router;
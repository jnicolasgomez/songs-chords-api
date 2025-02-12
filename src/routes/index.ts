import { Router } from "express";
import songsRoutes from "../songs/components/routes.ts";
import listsRoutes from "../lists/components/routes.ts"; 

const router: Router = Router();

router.use(songsRoutes);
router.use(listsRoutes);

export default router; 
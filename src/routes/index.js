import {Router} from 'express';
import songsRoutes from '../songs/components/routes.js';
import listsRoutes from '../lists/components/routes.js';


const router = Router();

router.use(songsRoutes); 
router.use(listsRoutes); 

export default router;
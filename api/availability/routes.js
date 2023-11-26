import {Router} from 'express';
import {success, error} from '../../network/response.js'
import controller from './index.js'
// import checkAuth from './middleware.js'

const router = Router();


router.post('/' ,(req, res, next) => {
    controller.upsertAvailablity(req.body).then(item => {
        success(req, res, item, 201)
    }).catch(next);
});

router.get('/' ,(req, res, next) => {
    controller.listAvailability().then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

export default router;
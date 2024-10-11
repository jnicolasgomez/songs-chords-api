import {Router} from 'express';
import { checkJwt } from '../../middleware/session.js';
import {success, error} from '../../network/response.js'
import controller from './index.js'


const router = Router();


router.post('/lists', checkJwt, (req, res, next) => {
    controller.upsertList(req.body).then(item => {
        success(req, res, item, 201)
    }).catch(next);
});

router.get('/lists', (req, res, next) => {
    const userId = req.query.userId;
    if (userId) {
        controller.listsByUser(userId).then(item => {
            success(req, res, item, 200)
        }).catch(next);
    } else {
        controller.publicLists().then(item => {
            success(req, res, item, 200)
        }).catch(next);
    }
});

router.get('/lists/:id', (req, res, next) => {
    controller.listById(req.params.id).then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

export default router;
import {Router} from 'express';
import {success, error} from '../../network/response.js'
import controller from './index.js'

const router = Router();


router.post('/' ,(req, res, next) => {
    controller.upsertSong(req.body).then(item => {
        success(req, res, item, 201)
    }).catch(next);
});

router.get('/' ,(req, res, next) => {
    controller.listSongs().then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

router.get('/:id', (req, res, next) => {
    controller.getSongById(req.params.id).then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

export default router;
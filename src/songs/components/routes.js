import {Router} from 'express';
import {success, error} from '../../network/response.js'
import controller from './index.js'

const router = Router();


router.post('/songs' ,(req, res, next) => {
    controller.upsertSong(req.body).then(item => {
        success(req, res, item, 201)
    }).catch(next);
});

router.get('/songs' ,(req, res, next) => {
    controller.listSongs().then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

router.get('/songs/:id', (req, res, next) => {
    controller.getSongById(req.params.id).then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

router.get('/songs/list/:id', (req, res, next) => {
    controller.getSongByList(req.params.id).then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

router.post('/lists' ,(req, res, next) => {
    controller.upsertList(req.body).then(item => {
        success(req, res, item, 201)
    }).catch(next);
});

router.get('/lists', (req, res, next) => {
    controller.getLists().then(item => {
        success(req, res, item, 200)
    }).catch(next);
});

export default router;
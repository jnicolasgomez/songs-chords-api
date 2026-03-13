import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { conditionalAuth, requireAuth } from "../../middleware/session.ts";
import { success } from "../../network/response.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: Bands
 *   description: Band management
 */

const router = Router();

/**
 * @swagger
 * /api/bands:
 *   post:
 *     summary: Create a band
 *     tags: [Bands]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, created_by]
 *             properties:
 *               name:
 *                 type: string
 *                 example: The Cats
 *               created_by:
 *                 type: string
 *                 example: firebase-uid-abc
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Band created
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Invalid or missing JWT
 */
router.post("/bands", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  const { name, created_by, members } = req.body;
  if (!name || !created_by) {
    return next(Object.assign(new Error("name and created_by are required"), { status: 400 }));
  }
  controller
    .createBand({ name, created_by, members })
    .then((item) => success(req, res, item, 201))
    .catch(next);
});

/**
 * @swagger
 * /api/bands:
 *   get:
 *     summary: Get bands for a user
 *     tags: [Bands]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     responses:
 *       200:
 *         description: List of bands the user belongs to
 *       403:
 *         description: Invalid or missing JWT
 */
router.get("/bands", conditionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    return next(Object.assign(new Error("userId query param is required"), { status: 400 }));
  }
  controller
    .getBandsByUser(userId)
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

/**
 * @swagger
 * /api/bands/{id}:
 *   get:
 *     summary: Get a band by ID
 *     tags: [Bands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Band found
 *       404:
 *         description: Band not found
 */
router.get("/bands/:id", (req: Request, res: Response, next: NextFunction) => {
  controller
    .getBandById(req.params.id)
    .then((item) => {
      if (!item) {
        return next(Object.assign(new Error("Band not found"), { status: 404 }));
      }
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/bands/{id}/members:
 *   post:
 *     summary: Add a member to a band
 *     tags: [Bands]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated band
 *       400:
 *         description: Missing userId
 *       403:
 *         description: Invalid or missing JWT
 *       404:
 *         description: Band not found
 */
router.post("/bands/:id/members", conditionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.body;
  if (!userId) {
    return next(Object.assign(new Error("userId is required"), { status: 400 }));
  }
  controller
    .addMember(req.params.id, userId)
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

/**
 * @swagger
 * /api/bands/{id}/members/{uid}:
 *   delete:
 *     summary: Remove a member from a band
 *     tags: [Bands]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated band
 *       403:
 *         description: Invalid or missing JWT
 *       404:
 *         description: Band not found
 */
router.delete("/bands/:id/members/:uid", conditionalAuth, (req: Request, res: Response, next: NextFunction) => {
  controller
    .removeMember(req.params.id, req.params.uid)
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

export default router;

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/session.ts";
import { success } from "../../network/response.ts";
import controller from "./index.ts";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User lookup utilities
 */

const router = Router();

/**
 * @swagger
 * /api/users/lookup:
 *   get:
 *     summary: Look up a Firebase user by email
 *     description: Returns the Firebase UID and profile info for the given email address. Used to resolve a collaborator's email before sharing a song or list.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address to look up
 *         example: user@example.com
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserInfo'
 *       400:
 *         description: Missing email query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No user found with that email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/users/lookup", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.query as { email?: string };
  if (!email) {
    return next(Object.assign(new Error("email is required"), { status: 400 }));
  }
  controller
    .lookupByEmail(email)
    .then((u) => success(req, res, u, 200))
    .catch(next);
});

/**
 * @swagger
 * /api/users/{uid}:
 *   get:
 *     summary: Get a Firebase user's profile by UID
 *     description: Returns the email and display name for a given Firebase UID. Used to show collaborator names in the UI.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID
 *         example: firebase-uid-abc
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserInfo'
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No user found with that UID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/users/:uid", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  controller
    .getByUid(req.params.uid)
    .then((u) => success(req, res, u, 200))
    .catch(next);
});

export default router;

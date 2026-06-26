import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/session.ts";
import { getUid } from "../../middleware/authz.ts";
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

/**
 * @swagger
 * /api/users/{uid}/profile:
 *   get:
 *     summary: Get a user's extended profile (band roles)
 *     description: Returns the user's band roles. Empty array if no profile has been saved yet.
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
 *     responses:
 *       200:
 *         description: Profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [singer, guitarist, bassist, drummer, keyboardist, other]
 *       403:
 *         description: Invalid or missing JWT
 */
router.get(
  "/users/:uid/profile",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    controller
      .getProfile(req.params.uid)
      .then((p) => success(req, res, p, 200))
      .catch(next);
  },
);

/**
 * @swagger
 * /api/users/{uid}/profile:
 *   put:
 *     summary: Update the authenticated user's extended profile
 *     description: Replaces the user's band roles. The path uid must match the authenticated uid.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID (must match the caller)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roles]
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [singer, guitarist, bassist, drummer, keyboardist, other]
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Invalid roles payload
 *       403:
 *         description: Caller is not the profile owner
 */
router.put(
  "/users/:uid/profile",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const callerUid = getUid(req);
      if (callerUid !== req.params.uid) {
        return next(Object.assign(new Error("FORBIDDEN"), { status: 403 }));
      }
      controller
        .updateProfile(req.params.uid, req.body ?? {})
        .then((p) => success(req, res, p, 200))
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/users/{uid}/practice:
 *   get:
 *     summary: Get the authenticated user's practice streak
 *     description: Returns the user's current streak, longest streak, and last practiced date. Zeros / null when the user has never practiced. The path uid must match the authenticated uid.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID (must match the caller)
 *     responses:
 *       200:
 *         description: Practice streak retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentStreak:
 *                   type: integer
 *                 longestStreak:
 *                   type: integer
 *                 lastPracticedDate:
 *                   type: string
 *                   nullable: true
 *                   example: "2026-06-25"
 *       403:
 *         description: Caller is not the streak owner
 */
router.get(
  "/users/:uid/practice",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (getUid(req) !== req.params.uid) {
        return next(Object.assign(new Error("FORBIDDEN"), { status: 403 }));
      }
      controller
        .getPractice(req.params.uid)
        .then((p) => success(req, res, p, 200))
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/users/{uid}/practice:
 *   post:
 *     summary: Record a practice for the authenticated user
 *     description: Records a practice on the supplied local date (YYYY-MM-DD) and returns the updated streak. Idempotent for repeat practices on the same date. The path uid must match the authenticated uid.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID (must match the caller)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date:
 *                 type: string
 *                 description: Client local date
 *                 example: "2026-06-25"
 *     responses:
 *       200:
 *         description: Practice recorded
 *       400:
 *         description: Invalid date payload
 *       403:
 *         description: Caller is not the streak owner
 */
router.post(
  "/users/:uid/practice",
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (getUid(req) !== req.params.uid) {
        return next(Object.assign(new Error("FORBIDDEN"), { status: 403 }));
      }
      controller
        .recordPractice(req.params.uid, req.body?.date)
        .then((p) => success(req, res, p, 200))
        .catch(next);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, optionalAuth } from "../../middleware/session.ts";
import { getUid, getOptionalUid } from "../../middleware/authz.ts";
import { writeLimiter } from "../../middleware/rateLimit.ts";
import { validate } from "../../middleware/validate.ts";
import { success } from "../../network/response.ts";
import { SetlistSchema } from "../types/types.ts";
import controller from "./index.ts";
import usersController from "../../users/components/index.ts";

/**
 * @swagger
 * tags:
 *   name: Setlists
 *   description: Setlist management
 */

const router = Router();

type SetlistRequest = Request & {
  query: {
    userId?: string;
    bandId?: string;
  };
}

// Listing every setlist of a user or a band exposes private ones, so those two
// query shapes require a verified token. The unscoped listing stays public
// because it only ever returns public setlists.
const authForScopedQueries = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query.userId || req.query.bandId) {
    requireAuth(req, res, next);
    return;
  }
  next();
};

/**
 * @swagger
 * /api/setlists:
 *   post:
 *     summary: Create or update a setlist
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, user_uid, private]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Favourites
 *               user_uid:
 *                 type: string
 *                 example: firebase-uid-abc
 *               private:
 *                 type: boolean
 *                 example: false
 *               songs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Legacy flat array of song IDs. Derived from `items` when both are sent.
 *               items:
 *                 type: array
 *                 description: Ordered setlist items (songs, set markers, pauses).
 *                 items:
 *                   oneOf:
 *                     - type: object
 *                       required: [type, songId]
 *                       properties:
 *                         type: { type: string, enum: [song] }
 *                         songId: { type: string }
 *                     - type: object
 *                       required: [type, label]
 *                       properties:
 *                         type: { type: string, enum: [set] }
 *                         label: { type: string }
 *                     - type: object
 *                       required: [type, minutes]
 *                       properties:
 *                         type: { type: string, enum: [pause] }
 *                         minutes: { type: number }
 *                         label: { type: string }
 *     responses:
 *       201:
 *         description: Setlist created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Setlist'
 *       400:
 *         description: Missing required fields
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
 */
router.post("/setlists", requireAuth, writeLimiter, validate(SetlistSchema), (req: Request, res: Response, next: NextFunction) => {
  controller
    .upsertSetlist(req.body, getUid(req))
    .then((item) => {
      success(req, res, item, 201);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/setlists:
 *   get:
 *     summary: List all public setlists, or filter by userId or bandId
 *     description: The unscoped listing is public. Filtering by userId or bandId requires a valid token — userId must match the token holder, and bandId requires membership of that band.
 *     tags: [Setlists]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter setlists by Firebase user UID. Must match the authenticated user.
 *       - in: query
 *         name: bandId
 *         schema:
 *           type: string
 *         description: Filter setlists by band. Requires membership of the band.
 *     responses:
 *       200:
 *         description: List of setlists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Setlist'
 *       403:
 *         description: Missing/invalid JWT, requesting another user's setlists, or not a member of the band
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/setlists", authForScopedQueries, (req: SetlistRequest, res: Response, next: NextFunction) => {
  const { userId, bandId } = req.query;
  if (bandId) {
    controller
      .setlistsByBand(bandId, getUid(req))
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else if (userId) {
    // Only the token holder's own scope may be requested.
    if (userId !== getUid(req)) {
      return next(Object.assign(new Error("FORBIDDEN"), { status: 403 }));
    }
    controller
      .setlistsByUser(userId)
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  } else {
    controller
      .publicSetlists()
      .then((item) => {
        success(req, res, item, 200);
      })
      .catch(next);
  }
});

/**
 * @swagger
 * /api/setlists/{id}:
 *   get:
 *     summary: Get a setlist by ID
 *     description: Public setlists are readable by anyone. A private setlist requires a token belonging to its owner, a collaborator in shared_with, or a member of its band; otherwise the response is 404 so the endpoint never reveals that the id exists.
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setlist ID
 *     responses:
 *       200:
 *         description: Setlist found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Setlist'
 *       404:
 *         description: Setlist not found, or private and not readable by the caller
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/setlists/:id", optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  controller
    .setlistById(req.params.id, getOptionalUid(req))
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/setlists/{id}:
 *   delete:
 *     summary: Delete a setlist
 *     description: Only the owner may delete. Collaborators in shared_with and band members can edit the setlist but not remove it. The songs it referenced are left untouched — deleting a setlist never deletes songs.
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setlist ID
 *     responses:
 *       200:
 *         description: Setlist deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       403:
 *         description: Invalid or missing JWT, or caller is not the owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Setlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/setlists/:id", requireAuth, writeLimiter, (req: Request, res: Response, next: NextFunction) => {
  controller
    .deleteSetlist(req.params.id, getUid(req))
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

/**
 * @swagger
 * /api/setlists/{id}/songs:
 *   post:
 *     summary: Add a song to an existing setlist
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [songId]
 *             properties:
 *               songId:
 *                 type: string
 *                 example: song-abc-123
 *     responses:
 *       200:
 *         description: Updated setlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Setlist'
 *       400:
 *         description: Missing songId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Setlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/setlists/:id/songs", requireAuth, writeLimiter, (req: Request, res: Response, next: NextFunction) => {
  const { songId } = req.body;
  if (!songId) {
    return next(Object.assign(new Error("songId is required"), { status: 400 }));
  }
  controller
    .addSongToSetlist(req.params.id, songId, getUid(req))
    .then((item) => {
      success(req, res, item, 200);
    })
    .catch(next);
});

/**
 * @swagger
 * /api/setlists/{id}/collaborators:
 *   post:
 *     summary: Share a setlist with a collaborator by email
 *     description: Resolves the email to a Firebase UID and adds it to the setlist's shared_with array. The collaborator will be able to view and edit the setlist.
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: collaborator@example.com
 *     responses:
 *       200:
 *         description: Collaborator added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       400:
 *         description: Missing email
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
 *         description: Setlist or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/setlists/:id/collaborators", requireAuth, writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    return next(Object.assign(new Error("email is required"), { status: 400 }));
  }
  try {
    const { uid } = await usersController.lookupByEmail(email);
    const result = await controller.shareSetlist(req.params.id, uid, getUid(req));
    success(req, res, result, 200);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/setlists/{id}/collaborators/{uid}:
 *   delete:
 *     summary: Remove a collaborator from a setlist
 *     tags: [Setlists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Setlist ID
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase UID of the collaborator to remove
 *     responses:
 *       200:
 *         description: Collaborator removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       403:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Setlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/setlists/:id/collaborators/:uid", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  controller
    .unshareSetlist(req.params.id, req.params.uid, getUid(req))
    .then((item) => success(req, res, item, 200))
    .catch(next);
});

export default router;

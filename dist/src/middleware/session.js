"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkJwt = void 0;
const auth_1 = require("firebase-admin/auth");
const checkJwt = (req, res, next) => {
    const userId = req.query.userId;
    if (userId) {
        try {
            const jwtByUser = req.headers.authorization || null;
            const jwt = jwtByUser === null || jwtByUser === void 0 ? void 0 : jwtByUser.split(" ").pop();
            if (jwt) {
                (0, auth_1.getAuth)()
                    .verifyIdToken(jwt)
                    .then(function () {
                    return next();
                })
                    .catch((e) => {
                    console.error(e);
                    //handleHttp(res, "INVALID_SESSION", e, 403);
                });
            }
        }
        catch (e) {
            console.error(e);
            //handleHttp(res, "INVALID_SESSION", e, 400);
        }
    }
    else {
        return next();
    }
};
exports.checkJwt = checkJwt;

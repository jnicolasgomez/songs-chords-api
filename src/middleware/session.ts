import { getAuth } from "firebase-admin/auth";

const checkJwt = (req, res, next) => {
  const userId = req.query.userId;
  if (userId) {
    try {
      const jwtByUser = req.headers.authorization || null;
      const jwt = jwtByUser?.split(" ").pop();
      if (jwt) {
        getAuth()
          .verifyIdToken(jwt)
          .then(function () {
            return next();
          })
          .catch((e) => {
            console.error(e);
            //handleHttp(res, "INVALID_SESSION", e, 403);
          });
      }
    } catch (e) {
      console.error(e);
      //handleHttp(res, "INVALID_SESSION", e, 400);
    }
  } else {
    return next();
  }
};

export { checkJwt };

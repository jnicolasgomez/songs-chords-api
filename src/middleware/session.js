import { getAuth } from "firebase-admin/auth";

const handleHttp = (res, message, error, statusCode) => {
  res.status(statusCode).json({ message, error });
};

const checkJwt = (req, res, next) => {
  const userId = req.query.userId || req.params.id;
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
            handleHttp(res, "INVALID_SESSION", e, 403);
          });
      } else {
        handleHttp(res, "INVALID_SESSION", "No jwt", 403);
      }
    } catch (e) {
      console.error(e);
      handleHttp(res, "INVALID_SESSION", e, 400);
    }
  } else {
    return next();
  }
};

export { checkJwt };

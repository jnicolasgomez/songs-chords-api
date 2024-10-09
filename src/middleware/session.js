import { getAuth } from "firebase-admin/auth";

const checkJwt = (req, res, next) => {
    try {
        const jwtByUser = req.headers.authorization || null;
        const jwt = jwtByUser?.split(' ').pop();
        if (jwt) {
            console.log(jwt)
            getAuth().verifyIdToken(jwt).then(function (decodedToken) {
                console.log(decodedToken)
                return next();
            })
            .catch((e) => {
                console.error(e)
                //handleHttp(res, "INVALID_SESSION", e, 403);
            });
        }
    }catch (e) {
        console.error(e)
        //handleHttp(res, "INVALID_SESSION", e, 400);
    }
}

export { checkJwt };
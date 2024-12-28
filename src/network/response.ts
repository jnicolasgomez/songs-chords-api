const success = function (req, res, message, status) {
  let statusCode = status || 200;
  let statusMessage = message || "";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(statusCode).send({
    error: false,
    status,
    body: statusMessage,
  });
};

const error = function (req, res, message, status) {
  let statusCode = status || 500;
  let statusMessage = message || "Internal Server Error";
  res.status(statusCode).send({
    error: false,
    status,
    body: statusMessage,
  });
};

export { success, error };

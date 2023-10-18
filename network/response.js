const success = function (req, res, message, status) {
    let statusCode = status || 200;
    let statusMessage = message || '';
    res.status(status).send({
        error: false,
        status,
        body: message
    })
}

const error = function (req, res, message, status) {
    let statusCode = status || 500;
    let statusMessage = message || 'Internal Server Error';
    res.status(statusCode).send({
        error: false,
        status,
        body: message
    })
}

export {success, error}
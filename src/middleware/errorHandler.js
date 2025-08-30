'use strict';

function errorHandler(err, req, res, next) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.name || 'ServerError', message: err.message || 'Unexpected error' });
}

module.exports = { errorHandler };

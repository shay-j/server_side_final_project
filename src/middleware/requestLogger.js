'use strict';

const Log = require('../models/Log');

function requestLogger() {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', async () => {
            try {
                await Log.create({
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    responseTimeMs: Date.now() - start,
                    endpoint: req.route ? (req.baseUrl + (req.route.path || '')) : req.originalUrl,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'] || ''
                });
            } catch (_) { /* ignore logging failures */ }
        });
        next();
    };
}

module.exports = { requestLogger };

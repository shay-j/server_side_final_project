// src/controllers/log.controller.js
'use strict';
const { listLogs } = require('../services/logs.service');

/**
 * GET /api/logs
 * Returns an array of log documents. Supports ?limit=.
 */
async function list(req, res, next) {
    try {
        const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 1000;
        const logs = await listLogs({ limit });
        res.json(logs);
    } catch (err) {
        next(err);
    }
}

module.exports = { list };

// src/controllers/log_controller.js
'use strict';

const { listLogs } = require('../services/logs_service');

/*
 * GET /api/logs
 * Returns an array of log documents.
 * Supports query parameter ?limit= to restrict the number of results.
 */
async function list(req, res, next) {
    try {
        // Parse the limit from query string, default to 1000 if invalid or missing
        const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 1000;

        // Fetch logs from the service with the given limit
        const logs = await listLogs({ limit });

        // Send the logs back as JSON
        res.json(logs);
    } catch (err) {
        // Pass any error to the next middleware (error handler)
        next(err);
    }
}

// Export the controller function
module.exports = { list };

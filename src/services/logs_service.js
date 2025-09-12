'use strict';

/* ------------------------------------------------------------------
 * Logs Service  [Service Pattern, Middleware Pattern]
 * - Writes request logs to MongoDB and console (via Pino).
 * - Non-blocking policy for persistence errors (does not break request).
 * - Small, focused API: writeLog(), listLogs().
 * ------------------------------------------------------------------ */

const pino = require('pino');
const Log = require('../models/Log');

/* ------------------------------------------------------------------
 * Logger configuration
 * - Pretty transport always enabled for developer-friendly output.
 * - ISO timestamp for deterministic parsing.
 * ------------------------------------------------------------------ */
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`
});

/* ------------------------------------------------------------------
 * writeLog
 * - Persists a single HTTP log entry to MongoDB.
 * - Best-effort: DB errors are logged and swallowed.
 *
 * Expected logData fields (producer: HTTP logging middleware):
 *   method, url, statusCode, responseTimeMs, endpoint, ip, userAgent
 * ------------------------------------------------------------------ */
async function writeLog(logData) {
    // Normalize input and guard defaults
    const entry = {
        method: String(logData.method || 'UNKNOWN'),
        path: String(logData.url || ''),
        status: Number.isFinite(logData.statusCode) ? logData.statusCode : -1,
        duration_ms: Number.isFinite(logData.responseTimeMs) ? logData.responseTimeMs : -1,
        endpoint: String(logData.endpoint || ''),
        ip: String(logData.ip || ''),
        user_agent: String(logData.userAgent || '')
    };

    // Console log first (never throws)
    logger.info(entry);

    // Persist to MongoDB (non-blocking for request flow)
    try {
        await new Log(entry).save();
    } catch (e) {
        logger.error({ msg: 'failed to persist log', error: e && e.message });
        // intentionally swallow to keep logging non-intrusive
    }
}

/* ------------------------------------------------------------------
 * listLogs
 * - Returns recent logs. Defaults to 1000 items.
 * - Applies server-side cap to prevent unbounded queries.
 * ------------------------------------------------------------------ */
async function listLogs({ limit = 1000 } = {}) {
    const hardCap = Math.min(Math.max(Number(limit) || 1000, 1), 5000);
    return Log.find({}, { __v: 0 })
        .sort({ createdAt: -1 })
        .limit(hardCap)
        .lean();
}

module.exports = { writeLog, listLogs };

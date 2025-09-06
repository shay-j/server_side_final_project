/**
 * Service for managing log-related operations.
 *
 * Uses Pino for creating logs and MongoDB for storing them.
 */
const Log = require('../models/log.model');
const pino = require('pino');

// Configure Pino logger with pino-pretty for development
const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});

/**
 * Write a log entry to the MongoDB collection.
 * This function is called for every HTTP request, recording method, status, etc.
 *
 * @param {Object} logData - The data to be logged.
 */
async function writeLog(logData) {
    await new Log({
        method: logData.method,
        path: logData.url,
        status: logData.statusCode,
        duration_ms: logData.responseTimeMs,
        endpoint: logData.endpoint,
        ip: logData.ip,
        user_agent: logData.userAgent
    }).save();

    logger.info(logData);
}

/**
 * List all logs from the database.
 *
 * @returns {Array} - List of all logs from MongoDB.
 */
async function listLogs({ limit = 1000 } = {}) {
    return Log.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = { writeLog, listLogs };

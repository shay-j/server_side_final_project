const { writeLog } = require('../services/logs.service');
const pino = require('pino');
const logger = pino({ level: 'info' });

/**
 * Request Logger middleware.
 * This middleware logs each incoming HTTP request, including:
 * - Method
 * - URL
 * - Status code
 * - Response time
 * - User-Agent
 *
 * It writes these logs to the MongoDB collection using the `writeLog` function.
 */
function requestLogger() {
    return async (req, res, next) => {
        const start = Date.now();

        res.on('finish', async () => {
            const responseTimeMs = Date.now() - start;

            // Log data
            const logData = {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTimeMs,
                endpoint: req.route ? (req.baseUrl + (req.route.path || '')) : req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'] || ''
            };

            // Log the request to MongoDB
            try {
                await writeLog(logData);
                logger.info(logData);
            } catch (err) {
                // Catch any errors from the log service but don't block the response
                logger.error('Failed to log request:', err);
            }
        });

        next();
    };
}

module.exports = { requestLogger };

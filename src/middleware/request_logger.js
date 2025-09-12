const { writeLog } = require('../services/logs_service');
const pino = require('pino');
const logger = pino({ level: 'info' });

/*
 * Request Logger middleware.
 *
 * This middleware logs each incoming HTTP request, including:
 * - Method
 * - URL
 * - Status code
 * - Response time
 * - User-Agent
 *
 * The logs are written to the MongoDB collection using writeLog()
 * and also sent to the console via pino logger.
 */
function request_logger() {
    return async (req, res, next) => {
        // Record the start time of the request
        const start = Date.now();

        // When the response is finished, log the request details
        res.on('finish', async () => {
            // Calculate response time in milliseconds
            const responseTimeMs = Date.now() - start;

            // Build log data object
            const logData = {
                method: req.method,                           // HTTP method (GET, POST, etc.)
                url: req.originalUrl,                        // Requested URL
                statusCode: res.statusCode,                  // Response status code
                responseTimeMs,                              // Response time in ms
                endpoint: req.route ? (req.baseUrl + (req.route.path || '')) : req.originalUrl, // Matched endpoint
                ip: req.ip,                                  // Client IP address
                userAgent: req.headers['user-agent'] || ''   // User-Agent string
            };

            // Attempt to log to MongoDB and console
            try {
                await writeLog(logData);       // Save log to database
                logger.info(logData);          // Log info to console
            } catch (err) {
                // If logging fails, capture the error but do not interrupt the response
                logger.error('Failed to log request:', err);
            }
        });

        // Pass control to the next middleware
        next();
    };
}

// Export the request logger middleware
module.exports = { requestLogger: request_logger };

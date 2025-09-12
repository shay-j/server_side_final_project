'use strict';

const pino = require('pino');
const pinoHttp = require('pino-http');
const pretty = require('pino-pretty');

/*
 * Configure Pino logger
 * - Uses pino-pretty in development for human-readable logs
 * - Uses JSON logs in production for better performance and structure
 */
const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // Log level by environment
    transport: {
        target: 'pino-pretty',  // Pretty-print logs (dev only)
        options: {
            colorize: true,                  // Enable colors
            translateTime: 'SYS:standard',   // Show human-readable timestamps
            ignore: 'pid,hostname',          // Remove noisy fields
        },
    },
});

/*
 * HTTP logger middleware for Express
 * - Logs each HTTP request/response
 * - Adjusts log level depending on response status
 */
const httpLogger = pinoHttp({
    logger,
    customLogLevel: (res, err) => {
        if (res.statusCode >= 500 || err) return 'error'; // Server errors
        if (res.statusCode >= 400) return 'warn';         // Client errors
        return 'info';                                    // Success
    },
});

// Export logger and middleware
module.exports = { logger, httpLogger };

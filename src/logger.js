'use strict';

const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const httpLogger = pinoHttp({
    logger,
    customLogLevel: (res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    }
});

module.exports = { logger, httpLogger };

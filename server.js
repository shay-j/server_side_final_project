'use strict';

require('dotenv').config();

const { connect } = require('./db');
const { logger } = require('./logger');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const URI = process.env.MONGODB_URI;

(async () => {
    try {
        await connect(URI);
        app.listen(PORT, () => logger.info({ PORT }, 'server started'));
    } catch (err) {
        logger.error(err, 'failed to start');
        process.exit(1);
    }
})();

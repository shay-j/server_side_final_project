'use strict';

const Log = require('../models/Log');

async function listLogs(req, res, next) {
    try {
        const logs = await Log.find({}).sort({ ts: -1 }).limit(1000).lean();
        res.json(logs);
    } catch (err) {
        next(err);
    }
}

module.exports = { listLogs };

'use strict';

const { Schema, model } = require('mongoose');

const logSchema = new Schema({
    ts: { type: Date, default: () => new Date(), index: true },
    method: String,
    url: String,
    statusCode: Number,
    responseTimeMs: Number,
    endpoint: String,
    ip: String,
    userAgent: String
}, { timestamps: true });

module.exports = model('Log', logSchema);

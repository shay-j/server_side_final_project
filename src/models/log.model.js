/**
 * - One row per HTTP request
 * - Explicit collection: "logs"
 */
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
    {
            method: String,
            path: String,
            status: Number,
            duration_ms: Number,
            endpoint: String,
            ip: String,
            user_agent: String,
    },
    { timestamps: true, versionKey: false, strict: true }
);

logSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Log', logSchema, 'logs');

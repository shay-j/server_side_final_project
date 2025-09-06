/**
 * Cost model — Stage 3
 * - Required: userid, description, category, sum
 * - sum > 0
 * - category enum
 * - created_at defaults to now
 * - Explicit collection: "costManager"
 */
const mongoose = require('mongoose');
const { CATEGORIES } = require('../utils/constants'); // << use shared list

const costSchema = new mongoose.Schema(
    {
        userid: { type: Number, required: true },
        description: { type: String, required: true, trim: true, maxlength: 256 },
        category: { type: String, required: true, enum: CATEGORIES, lowercase: true, trim: true },
        sum: { type: Number, required: true, min: [0.01, 'sum must be > 0'] },
        created_at: { type: Date, default: Date.now },
    },
    { timestamps: false, versionKey: false, strict: true }
);

costSchema.index({ userid: 1, created_at: -1 });

module.exports = mongoose.model('Cost', costSchema, 'costs');

/**
 * - Required: userid, year, month, data
 * - Unique compound index: (userid, year, month)
 * - Guards: month ∈ [1..12], year in sane range
 * - generated_at defaults to now
 * - Explicit collection: "reports"
 */
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
    {
            userid: { type: Number, required: true, trim: true },
            year: {
                    type: Number,
                    required: true,
                    min: [1970, 'invalid year'],
                    max: [2100, 'invalid year'],
            },
            month: { type: Number, required: true, min: [1, 'invalid month'], max: [12, 'invalid month'] },
            data: { type: mongoose.Schema.Types.Mixed, required: true },
            generated_at: { type: Date, default: Date.now },
    },
    { timestamps: false, versionKey: false, strict: true }
);

reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema, 'reports');

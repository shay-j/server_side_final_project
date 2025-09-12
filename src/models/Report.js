/*
 * Report model
 *
 * Rules:
 * - Required fields: userid, year, month, data
 * - month must be in [1..12]
 * - year must be between 1970 and 2100
 * - generated_at defaults to now
 * - Unique compound index: (userid, year, month)
 * - Explicit collection: "reports"
 */

const mongoose = require('mongoose');

// Define the Report schema
const reportSchema = new mongoose.Schema(
    {
        userid: {
            type: Number,
            required: true,
            trim: true
        }, // User ID reference

        year: {
            type: Number,
            required: true,
            min: [1970, 'invalid year'],
            max: [2100, 'invalid year'],
        }, // Year of the report (valid range 1970–2100)

        month: {
            type: Number,
            required: true,
            min: [1, 'invalid month'],
            max: [12, 'invalid month']
        }, // Month of the report (1–12)

        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }, // Report payload (flexible structure)

        generated_at: {
            type: Date,
            default: Date.now
        }, // Timestamp when report was generated
    },
    {
        timestamps: false,   // Disable createdAt/updatedAt
        versionKey: false,   // Remove __v field
        strict: true         // Enforce schema rules
    }
);

// Compound index to ensure uniqueness per user, year, and month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

// Export the model, explicitly bound to "reports" collection
module.exports = mongoose.model('Report', reportSchema, 'reports');

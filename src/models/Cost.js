/*
 * Cost model — Stage 3
 *
 * Rules:
 * - Required fields: userid, description, category, sum
 * - sum must be greater than 0
 * - category must be one of the allowed enum values
 * - created_at defaults to now
 * - Explicit collection: "costs"
 */

const mongoose = require('mongoose');
const { CATEGORIES } = require('../utils/constants'); // use shared list of categories

// Define the Cost schema
const costSchema = new mongoose.Schema(
    {
        userid: { type: Number, required: true },   // User ID reference
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 256
        },  // Description of the cost
        category: {
            type: String,
            required: true,
            enum: CATEGORIES,
            lowercase: true,
            trim: true
        },  // Category must be from predefined list
        sum: {
            type: Number,
            required: true,
            min: [0.01, 'sum must be > 0']
        },  // Cost amount must be positive
        created_at: { type: Date, default: Date.now }, // Defaults to current date
    },
    {
        timestamps: false,    // Disable auto createdAt/updatedAt
        versionKey: false,    // Remove __v field
        strict: true          // Enforce schema rules
    }
);

// Index for efficient queries by userid and created_at (descending)
costSchema.index({ userid: 1, created_at: -1 });

// Export the model, explicitly bound to "costs" collection
module.exports = mongoose.model('Cost', costSchema, 'costs');

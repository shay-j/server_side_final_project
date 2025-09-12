/*
 * Log model
 *
 * - One row per HTTP request
 * - Explicit collection: "logs"
 */

const mongoose = require('mongoose');

// Define the Log schema
const logSchema = new mongoose.Schema(
    {
        method: String,        // HTTP method (GET, POST, etc.)
        path: String,          // Request path or URL
        status: Number,        // HTTP response status code
        duration_ms: Number,   // Duration of the request in milliseconds
        endpoint: String,      // Matched endpoint (Express route)
        ip: String,            // Client IP address
        user_agent: String,    // User-Agent string
    },
    {
        timestamps: true,      // Automatically adds createdAt and updatedAt
        versionKey: false,     // Disables __v field
        strict: true           // Enforce schema rules
    }
);

// Index for sorting logs by newest first
logSchema.index({ createdAt: -1 });

// Export the model, explicitly bound to "logs" collection
module.exports = mongoose.model('Log', logSchema, 'logs');

/*
 * User model — Stage 3
 *
 * Rules:
 * - Required fields: id, first_name, last_name
 * - birthday is optional
 * - Unique index on id
 * - Explicit collection: "users"
 */

const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true
        }, // Unique numeric user ID

        first_name: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 30
        }, // First name, 1–30 characters

        last_name: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 30
        }, // Last name, 1–30 characters

        birthday: {
            type: Date
        }, // Optional birthday field
    },
    {
        timestamps: true,     // Automatically adds createdAt and updatedAt
        versionKey: false,    // Disable __v field
        strict: true          // Enforce schema rules strictly
    }
);

// Unique index to prevent duplicate user IDs
userSchema.index({ id: 1 }, { unique: true });

// Export the model, explicitly bound to "users" collection
module.exports = mongoose.model('User', userSchema, 'users');

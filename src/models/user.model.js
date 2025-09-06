/**
 * User model — Stage 3
 * - Required: id, first_name, last_name
 * - birthday: Date (optional)
 * - Unique index on id
 * - Explicit collection: "users"
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true },
        first_name: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
        last_name: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
        birthday: { type: Date },
    },
    { timestamps: true, versionKey: false, strict: true }
);

userSchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema, 'users');

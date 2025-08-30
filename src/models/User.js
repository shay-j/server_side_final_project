'use strict';

const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    id: { type: Number, required: true, unique: true, index: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    birthday: { type: Date, required: true }
}, { timestamps: true });

module.exports = model('User', userSchema);

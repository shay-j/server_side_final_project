'use strict';

const { Schema, model } = require('mongoose');
const { CATEGORIES } = require('../utils/constants');

const costSchema = new Schema({
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: CATEGORIES },
    userid: { type: Number, required: true, index: true },
    sum: { type: Number, required: true, min: 0 },
    date: { type: Date, default: () => new Date() }
}, { timestamps: true });

costSchema.index({ userid: 1, date: 1, category: 1 });

module.exports = model('Cost', costSchema);

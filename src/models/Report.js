'use strict';

const { Schema, model } = require('mongoose');

const reportSchema = new Schema({
    userid: { type: Number, required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    costs: { type: Array, required: true },
    generatedAt: { type: Date, default: () => new Date() }
}, { timestamps: true });

reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = model('Report', reportSchema);

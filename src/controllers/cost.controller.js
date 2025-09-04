'use strict';

const Joi = require('joi');
const Cost = require('../models/Cost');
const { isPastDate } = require('../utils/dates');
const { validate } = require('../middleware/validate');

const addCostSchema = Joi.object({
    userid: Joi.number().required(),
    description: Joi.string().min(1).required(),
    category: Joi.string().valid('food','health','housing','sports','education').required(),
    sum: Joi.number().min(0).required(),
    date: Joi.date().optional()
});

const addCostValidator = validate(addCostSchema);

async function addCost(req, res, next) {
    try {
        const { userid, description, category, sum, date } = req.body;

        if (date && isPastDate(date)) {
            return res.status(400).json({ error: 'invalid_date', message: 'Date cannot be in the past.' });
        }

        const doc = await Cost.create({
            userid, description, category, sum, date: date ? new Date(date) : undefined
        });

        res.status(201).json({
            _id: doc._id,
            description: doc.description,
            category: doc.category,
            userid: doc.userid,
            sum: doc.sum,
            date: doc.date
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { addCost, addCostValidator };

'use strict';

const Joi = require('joi');
const { validate } = require('../middleware/validate');
const { buildMonthlyReport } = require('../utils/buildReport');
const { isPastMonthYear } = require('../utils/dateUtils');
const Report = require('../models/Report');

const reportQuerySchema = Joi.object({
    id: Joi.number().required(),
    year: Joi.number().integer().min(1970).required(),
    month: Joi.number().integer().min(1).max(12).required()
});
const reportQueryValidator = validate(reportQuerySchema, 'query');

async function getMonthlyReport(req, res, next) {
    try {
        const { id, year, month } = req.query;

        if (isPastMonthYear(Number(year), Number(month))) {
            const cached = await Report.findOne({ userid: Number(id), year: Number(year), month: Number(month) }).lean();
            if (cached) return res.json(cached);

            const report = await buildMonthlyReport(id, year, month);
            const saved = await Report.create(report);
            return res.json({ userid: saved.userid, year: saved.year, month: saved.month, costs: saved.costs });
        }

        const live = await buildMonthlyReport(id, year, month);
        res.json(live);
    } catch (err) {
        next(err);
    }
}

module.exports = { getMonthlyReport, reportQueryValidator };

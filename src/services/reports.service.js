'use strict';

const Report = require('../models/report.model');
const Cost = require('../models/cost.model');
const { endOfMonth } = require('../utils/dates');

/** Is the given (year,month) the current period? */
function isCurrentPeriod(year, month) {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
}

/**
 * Compute monthly aggregation for a user.
 * @param {number} userid
 * @param {number} year
 * @param {number} month
 * @returns {Promise<object>}
 */
async function computeMonthly(userid, year, month) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = endOfMonth(from);

    const byCategory = await Cost.aggregate([
        { $match: { userid, created_at: { $gte: from, $lte: to } } },
        { $group: { _id: '$category', total: { $sum: '$sum' }, count: { $sum: 1 } } },
        { $project: { _id: 0, category: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
        { $sort: { category: 1 } },
    ]);

    const totals = await Cost.aggregate([
        { $match: { userid, created_at: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$sum' }, count: { $sum: 1 } } },
        { $project: { _id: 0, total: { $round: ['$total', 2] }, count: 1 } },
    ]);

    const summary = totals[0] || { total: 0, count: 0 };
    return { userid, year, month, from, to, summary, byCategory };
}

/**
 * Get a cached report or compute and materialize once for past months.
 * @param {number} userid
 * @param {number} year
 * @param {number} month
 * @returns {Promise<{source:'live'|'cache'|'computed', data:object}>}
 */
async function getCachedOrCompute(userid, year, month) {
    if (isCurrentPeriod(year, month)) {
        const data = await computeMonthly(userid, year, month);
        return { source: 'live', data };
    }

    const cache = await Report.findOne({ userid, year, month }, { _id: 0, data: 1 }).lean();
    if (cache) return { source: 'cache', data: cache.data };

    const data = await computeMonthly(userid, year, month);
    await Report.updateOne(
        { userid, year, month },
        { $set: { data, generated_at: new Date() } },
        { upsert: true, runValidators: true }
    );
    return { source: 'computed', data };
}

module.exports = { getCachedOrCompute };

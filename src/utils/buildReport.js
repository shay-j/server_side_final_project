'use strict';

const Cost = require('../models/Cost');
const { CATEGORIES } = require('./constants');
const { startOfMonth, endOfMonth } = require('./dateUtils');

async function buildMonthlyReport(userid, year, month) {
    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);

    const items = await Cost.find({
        userid: Number(userid),
        date: { $gte: from, $lte: to }
    }).lean();

    const byCat = {};
    for (const cat of CATEGORIES) byCat[cat] = [];

    for (const c of items) {
        const day = new Date(c.date).getUTCDate();
        if (!byCat[c.category]) byCat[c.category] = [];
        byCat[c.category].push({ sum: c.sum, description: c.description, day });
    }

    const costsArray = CATEGORIES.map((cat) => ({ [cat]: byCat[cat] || [] }));

    return { userid: Number(userid), year: Number(year), month: Number(month), costs: costsArray };
}

module.exports = { buildMonthlyReport };

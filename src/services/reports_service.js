'use strict';

/* ------------------------------------------------------------------
 * Reports Service [Service Pattern + Computed + Cache]
 * - Computes month-by-year cost reports per user for ANY month.
 * - Current month -> live computation (no cache write).
 * - Other months -> compute once and cache (materialized view).
 * - Output shape:
 *   {
 *     userid, year, month,
 *     costs: [ { "<category>": [ { sum, description, day }, ... ] }, ... ]
 *   }
 * ------------------------------------------------------------------ */

const Report = require('../models/Report');
const Cost = require('../models/Cost');
const { endOfMonth } = require('../utils/dates');
const { CATEGORIES } = require('../utils/constants'); // <-- use canonical categories

/* Determine if (year, month) is the current period */
function isCurrentPeriod(year, month) {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
}

/* ------------------------------------------------------------------
 * computeMonthly
 * - Groups by category and emits items { sum, description, day }.
 * - Ensures ALL known categories appear; empty ones use [].
 * - Items are sorted by created_at ascending (stable output).
 * ------------------------------------------------------------------ */
async function computeMonthly(userid, year, month) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = endOfMonth(from);

    // Aggregate all costs of the requested month for the specific user
    const grouped = await Cost.aggregate([
        { $match: { userid: Number(userid), created_at: { $gte: from, $lte: to } } },
        { $sort: { created_at: 1, _id: 1 } }, // stable order inside each category
        {
            $project: {
                _id: 0,
                category: { $toLower: '$category' }, // normalize to lower-case
                sum: '$sum',
                description: '$description',
                day: { $dayOfMonth: '$created_at' },
            }
        },
        {
            $group: {
                _id: '$category',
                items: { $push: { sum: '$sum', description: '$description', day: '$day' } }
            }
        },
        { $project: { _id: 0, category: '$_id', items: 1 } }
    ]);

    // Map aggregated categories to quick lookup
    const byCategory = new Map(grouped.map(g => [String(g.category), g.items]));

    // Build costs array from canonical category list (ensures empties)
    const categoriesSorted = [...CATEGORIES].map(String).map(c => c.toLowerCase()).sort((a, b) => a.localeCompare(b));
    const costs = categoriesSorted.map(cat => {
        const arr = byCategory.get(cat) || [];
        return { [cat]: arr };
    });

    return { userid: Number(userid), year: Number(year), month: Number(month), costs };
}

/* ------------------------------------------------------------------
 * getCachedOrCompute
 * - Current month: compute live (do NOT write cache).
 * - Otherwise: read from cache; if missing, compute and materialize.
 * ------------------------------------------------------------------ */
async function getCachedOrCompute(userid, year, month) {
    if (isCurrentPeriod(Number(year), Number(month))) {
        const data = await computeMonthly(userid, year, month);
        return { source: 'live', data };
    }

    // Try reading from cache
    const cached = await Report.findOne(
        { userid: Number(userid), year: Number(year), month: Number(month) },
        { _id: 0, data: 1 }
    ).lean();

    if (cached && cached.data) {
        return { source: 'cache', data: cached.data };
    }

    // Compute and materialize
    const data = await computeMonthly(userid, year, month);
    await Report.updateOne(
        { userid: Number(userid), year: Number(year), month: Number(month) },
        { $set: { data, generated_at: new Date() } },
        { upsert: true, runValidators: true }
    );

    return { source: 'computed', data };
}

module.exports = { getCachedOrCompute };

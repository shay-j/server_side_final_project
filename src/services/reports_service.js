'use strict';

/* ------------------------------------------------------------------
 * Reports Service [Service Pattern + Computed + Cache]
 * - Computes month-by-year cost reports per user for ANY month.
 * - Current month -> live computation (no cache write).
 * - Past/future months -> compute once and cache (materialized view).
 * - Output JSON matches the project spec:
 *   {
 *     "userid": 123123,
 *     "year": 2025,
 *     "month": 11,
 *     "costs": [
 *       { "food": [ { "sum":12, "description":"...", "day":17 }, ... ] },
 *       { "education": [ ... ] },
 *       ...
 *     ]
 *   }
 * ------------------------------------------------------------------ */

const Report = require('../models/Report');
const Cost = require('../models/Cost');
const { endOfMonth } = require('../utils/dates');

/* Determine if (year, month) is the current period */
function isCurrentPeriod(year, month) {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month;
}

/* ------------------------------------------------------------------
 * computeMonthly
 * - Builds the JSON shape required by the spec.
 * - Groups by category and emits items with {sum, description, day}.
 * - Ensures categories with no items appear with [] when known.
 * ------------------------------------------------------------------ */
async function computeMonthly(userid, year, month) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = endOfMonth(from);

    // Group items of the requested month by category and map day-of-month
    const grouped = await Cost.aggregate([
        { $match: { userid, created_at: { $gte: from, $lte: to } } },
        {
            $project: {
                _id: 0,
                category: '$category',
                sum: '$sum',
                description: '$description',
                day: { $dayOfMonth: '$created_at' }
            }
        },
        {
            $group: {
                _id: '$category',
                items: { $push: { sum: '$sum', description: '$description', day: '$day' } }
            }
        },
        { $project: { _id: 0, category: '$_id', items: 1 } },
        { $sort: { category: 1 } }
    ]);

    // Ensure empty categories appear as [] as per example
    // Use all known categories from the dataset for completeness
    const allCategories = await Cost.distinct('category');
    const known = new Set(allCategories.map(String));
    const map = new Map(grouped.map(g => [String(g.category), g.items]));

    // Build "costs" array as [{ "<category>": [ ... ] }, ...] sorted by category name
    const categoriesSorted = Array.from(known).sort((a, b) => a.localeCompare(b));
    const costs = categoriesSorted.map(cat => {
        const arr = map.get(cat) || [];
        return { [cat]: arr };
    });

    return { userid, year, month, costs };
}

/* ------------------------------------------------------------------
 * getCachedOrCompute
 * - Current month: compute live.
 * - Otherwise: read from cache; if missing, compute and materialize.
 * ------------------------------------------------------------------ */
async function getCachedOrCompute(userid, year, month) {
    if (isCurrentPeriod(year, month)) {
        const data = await computeMonthly(userid, year, month);
        return { data };
    }

    // Try reading from cache
    const cached = await Report.findOne(
        { userid, year, month },
        { _id: 0, data: 1 }
    ).lean();

    if (cached && cached.data) {
        return { data: cached.data };
    }

    // Compute and materialize
    const data = await computeMonthly(userid, year, month);
    await Report.updateOne(
        { userid, year, month },
        { $set: { data, generated_at: new Date() } },
        { upsert: true, runValidators: true }
    );
    return { data };
}

module.exports = { getCachedOrCompute };

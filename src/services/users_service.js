'use strict';

/* ------------------------------------------------------------------
 * Users Service  [Service Pattern]
 * - Atomic create with upsert semantics.
 * - Stable listing with projection.
 * - Existence assertions for cross-service validation.
 * - Aggregation over costs for a single user.
 * ------------------------------------------------------------------ */

const User = require('../models/User');
const Cost = require('../models/Cost');

/* ------------------------------------------------------------------
 * create
 * ------------------------------------------------------------------
 * Atomically creates a user document.
 * Race-safe via updateOne({upsert:true}).
 * Returns the full user document on the first insert.
 * Throws 409 when the user already exists.
 * Validation errors propagate with status 400.
 * ------------------------------------------------------------------ */
/* Atomic create using upsert. No local throw inside try. */
async function create(payload) {
    let upserted = false;

    try {
        const r = await User.updateOne(
            { id: payload.id },
            { $setOnInsert: payload },
            { upsert: true }
        );
        upserted = r.upsertedCount === 1; // true if inserted now
    } catch (e) {
        // Duplicate key => 409
        if (e && (e.code === 11000 || String(e.message).includes('duplicate key'))) {
            const err = new Error('user already exists');
            err.status = 409;
            throw err;
        }
        // Validation => 400
        if (e && e.name === 'ValidationError') {
            e.status = 400;
        }
        throw e; // other DB errors bubble up
    }

    if (upserted) {
        // Fetch and return full doc on the first insert
        return User.findOne({ id: payload.id }, { _id: 0 }).lean();
    }

    // Conflict (document already existed)
    const err = new Error('user already exists');
    err.status = 409;
    throw err;
}

/* ------------------------------------------------------------------
 * list
 * ------------------------------------------------------------------
 * Returns a stable projection for all users.
 * Sorted by createdAt descending when present.
 * ------------------------------------------------------------------ */
async function list() {
    return User.find(
        {},
        { _id: 0, id: 1, first_name: 1, last_name: 1, birthday: 1 }
    )
        .sort({ createdAt: -1 })
        .lean();
}

/* ------------------------------------------------------------------
 * exists
 * ------------------------------------------------------------------
 * Checks whether a user with the given numeric id exists.
 * ------------------------------------------------------------------ */
async function exists(userid) {
    const c = await User.countDocuments({ id: userid });
    return c > 0;
}

/* ------------------------------------------------------------------
 * assertExists
 * ------------------------------------------------------------------
 * Throws 404 when the user does not exist.
 * Useful as a guard in other services (e.g., costs_service).
 * ------------------------------------------------------------------ */
async function assertExists(userid) {
    if (!(await exists(userid))) {
        const err = new Error('user not found');
        err.status = 404;
        throw err;
    }
}

/* ------------------------------------------------------------------
 * getByIdWithTotal
 * ------------------------------------------------------------------
 * Returns user document enriched with the total sum of all costs.
 * Output shape: { ...userFields, total: <number> }
 * ------------------------------------------------------------------ */
async function getByIdWithTotal(userid) {
    const user = await User.findOne({ id: userid }, { _id: 0 }).lean();
    if (!user) return null;

    const agg = await Cost.aggregate([
        { $match: { userid } },
        { $group: { _id: null, total: { $sum: '$sum' } } },
        { $project: { _id: 0, total: 1 } }
    ]);

    const total = (agg[0] && typeof agg[0].total === 'number') ? agg[0].total : 0;
    return { ...user, total };
}

module.exports = { create, list, exists, assertExists, getByIdWithTotal };

'use strict';

const User = require('../models/user.model');
const Cost = require('../models/cost.model');

/**
 * Create user atomically. Returns 409 in duplicate.
 * @param {{id:number, first_name:string, last_name:string, birthday?:Date}} payload
 * @returns {Promise<object>}
 */
// Atomic create using updateOne+upsert, race-safe, deterministic 201/409
async function create(payload) {
    try {
        const r = await User.updateOne(
            { id: payload.id },
            { $setOnInsert: payload },
            { upsert: true }
        );

        // Inserted now -> upsertedCount===1
        if (r.upsertedCount === 1) {
            const doc = await User.findOne({ id: payload.id }, { _id: 0 }).lean();
            return doc; // controller will send 201
        }

        // Document already existed (matchedCount===1, no insert) -> 409
        const err = new Error('user already exists');
        err.status = 409;
        throw err;
    } catch (e) {
        if (e && (e.code === 11000 || String(e.message).includes('duplicate key'))) {
            const err = new Error('user already exists');
            err.status = 409;
            throw err;
        }
        if (e.name === 'ValidationError') e.status = 400;
        throw e;
    }
}

/** List users with a stable projection. */
async function list() {
    return User.find({}, { _id: 0, id: 1, first_name: 1, last_name: 1, birthday: 1 })
        .sort({ createdAt: -1 })
        .lean();
}

/** Check if a user exists by numeric id. */
async function exists(userid) {
    const c = await User.countDocuments({ id: userid });
    return c > 0;
}

/** Throw 404 if a user does not exist. */
async function assertExists(userid) {
    if (!(await exists(userid))) {
        const err = new Error('user not found');
        err.status = 404;
        throw err;
    }
}

/** Get user by id with totals aggregated from costs. */
async function getByIdWithTotal(userid) {
    const user = await User.findOne({ id: userid }, { _id: 0 }).lean();
    if (!user) return null;

    const agg = await Cost.aggregate([
        { $match: { userid } },
        { $group: { _id: null, total_sum: { $sum: '$sum' }, count: { $sum: 1 } } },
        { $project: { _id: 0, total_sum: 1, count: 1 } },
    ]);

    return { ...user, totals: agg[0] || { total_sum: 0, count: 0 } };
}

module.exports = { create, list, exists, assertExists, getByIdWithTotal };

'use strict';

/**
 * Costs service.
 * - Create cost (400 on past-month, 404 if user not found).
 */

const Cost = require('../models/cost.model');
const { isPastMonth } = require('../utils/dates');
const { assertExists: assertUserExists } = require('./users.service');

/**
 * Create a new cost record.
 * @param {{userid:number,description:string,category:string,sum:number,created_at?:Date}} payload
 * @returns {Promise<{id:string}>}
 */
async function create(payload) {
    if (payload.created_at && isPastMonth(payload.created_at)) {
        const err = new Error('past month costs are not allowed');
        err.status = 400;
        throw err;
    }

    await assertUserExists(payload.userid);

    const doc = await Cost.create(payload);
    return { id: doc._id.toString() };
}

module.exports = { create };

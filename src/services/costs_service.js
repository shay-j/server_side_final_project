'use strict';

/* ------------------------------------------------------------------
 * Costs Service
 * - Responsible for handling cost records in the system.
 * - Implements Create functionality with validation and user checks.
 * ------------------------------------------------------------------ */

const Cost = require('../models/Cost');
const { assertExists: assertUserExists } = require('./users_service');

/* ------------------------------------------------------------------
 * create
 * ------------------------------------------------------------------
 * Create a new cost record in the system.
 *
 * Input:
 *   payload: {
 *     userid: number,           // ID of the user (foreign key)
 *     description: string,      // Short description of the cost
 *     category: string,         // Category (food, education, etc.)
 *     sum: number,              // Amount spent
 *     created_at?: Date         // Optional: explicit date
 *   }
 *
 * Output:
 *   Full JSON document inserted into the 'costs' collection,
 *   aligned with project guidelines (camelCase fields).
 *
 * Errors:
 *   - 404 if the user was not found
 *   - 500 for DB errors
 * ------------------------------------------------------------------ */
async function create(payload) {
    // Validate user existence before inserting cost
    await assertUserExists(payload.userid);

    // Create a new cost document in DB
    const doc = await Cost.create(payload);

    // Return a full document as JSON
    return {
        userid: doc.userid,
        description: doc.description,
        category: doc.category,
        sum: doc.sum,
        day: doc.created_at.getDate(),
        createdAt: doc.created_at,
        _id: doc._id.toString()
    };
}

module.exports = { create };

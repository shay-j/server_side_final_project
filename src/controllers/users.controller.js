const users = require('../services/users.service');
const { ok, notFound, created } = require('../utils/responses');

/**
 * Controller for managing user-related requests.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */

/**
 * Create a new user.
 *
 * Calls `users.create()` to create the user.
 */
const create = async (req, res) => {
    const doc = await users.create(req.body);
    return created(res, doc);
};

/**
 * List all users.
 *
 * Calls `users.list()` to fetch the list of users.
 */
const list = async (_req, res) => {
    const docs = await users.list();
    return ok(res, docs);
};

/**
 * Get a user by ID.
 *
 * Calls `users.getByIdWithTotal()` to fetch user details with totals.
 */
const getById = async (req, res) => {
    const doc = await users.getByIdWithTotal(req.params.id);
    if (!doc) return notFound(res, 'user not found');
    return ok(res, doc);
};

module.exports = { create, list, getById };

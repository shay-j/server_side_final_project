const users = require('../services/users.service');
const costs = require('../services/costs.service');
const { created } = require('../utils/responses');

/**
 * Controller for handling `POST /api/add` requests.
 * Adds either a User or a Cost based on the input data.
 *
 * Design Pattern: Uses DRY to process both User and Cost creation.
 * - If the input looks like a User, it calls `users.create()`.
 * - Otherwise, it defaults to calling `costs.create()`.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
const add = async (req, res) => {
    const b = req.body;
    const isUser = 'id' in b && ('first_name' in b || 'last_name' in b);

    // Create user
    if (isUser) {
        const u = await users.create(b);
        return created(res, u);
    }

    // Create cost
    const c = await costs.create(b);
    return created(res, c);
};

module.exports = { add };

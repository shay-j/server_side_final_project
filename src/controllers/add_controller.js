/* Import required services and utilities */
const users = require('../services/users_service');
const costs = require('../services/costs_service');
const { created } = require('../utils/responses');

/*
 * Controller for handling `POST /api/add` requests.
 *
 * Design Pattern: DRY (Don't Repeat Yourself)
 * - This controller processes both User and Cost creation
 *   in a unified way, avoiding duplicate logic.
 *
 * Parameters:
 *   req - Express request object.
 *   res - Express response object.
 *
 * Behavior:
 * - If the request body looks like a User, it calls users.create().
 * - Otherwise, it defaults to calling costs.create().
 */
const add = async (req, res) => {
    //Extract body from request
    const b = req.body;

    //Check if request body represents a User
    const isUser = 'id' in b && ('first_name' in b || 'last_name' in b);

    //Create user if conditions match
    if (isUser) {
        const u = await users.create(b);
        return created(res, u);
    }

    //Otherwise, create a cost
    const c = await costs.create(b);
    return created(res, c);
};

//xport the add controller
module.exports = { add };

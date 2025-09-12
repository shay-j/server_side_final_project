const users = require('../services/users_service');
const { ok, notFound, created } = require('../utils/responses');

/*
 * Controller for managing user-related requests.
 *
 * Parameters:
 *   req - Express request object.
 *   res - Express response object.
 */

/*
 * Create a new user.
 * Calls users.create() to create the user.
 */
const create = async (req, res) => {
    // Create user document from request body
    const doc = await users.create(req.body);

    // Return 201 Created response with new user
    return created(res, doc);
};

/*
 * List all users.
 * Calls users.list() to fetch the list of users.
 */
const list = async (_req, res) => {
    // Retrieve all users from the service
    const docs = await users.list();

    // Return 200 OK response with list of users
    return ok(res, docs);
};

/*
 * Get a user by ID.
 * Calls users.getByIdWithTotal() to fetch user details with totals.
 */
const getById = async (req, res) => {
    // Retrieve user by ID, including totals
    const doc = await users.getByIdWithTotal(req.params.id);

    // If no user found, return 404 Not Found
    if (!doc) return notFound(res, 'user not found');

    // Otherwise return 200 OK with user document
    return ok(res, doc);
};

// Export controller functions
module.exports = { create, list, getById };

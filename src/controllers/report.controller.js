const { getCachedOrCompute } = require('../services/reports.service');
const { notFound, ok } = require('../utils/responses');
const { exists: userExists } = require('../services/users.service');

/**
 * Controller for handling `GET /api/report` requests.
 * Returns the report data for a specific user and month.
 *
 * Design Pattern: Uses **Computed Materialization** pattern.
 * - For the current month, the data is computed live.
 * - For past months, it first checks for a cached report. If not found, it computes and stores the result.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
const getMonthly = async (req, res) => {
    const { id, year, month } = req.query;

    // Validate user existence
    if (!(await userExists(id))) return notFound(res, 'user not found');

    // Fetch or compute the report
    const result = await getCachedOrCompute(id, Number(year), Number(month));

    // Return the result
    return ok(res, result);
};

module.exports = { getMonthly };

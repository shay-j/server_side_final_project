// src/controllers/report_controller.js
const { getCachedOrCompute } = require('../services/reports_service');
const { notFound } = require('../utils/responses');
const { exists: userExists } = require('../services/users_service');

/*
 * Controller for handling `GET /api/report` requests.
 *
 * Design Pattern: Computed Materialization
 * - Current month: compute live
 * - Other months: read from cache, or compute+materialize
 */
const getMonthly = async (req, res) => {
    const idNum = Number(req.query.id);
    const yearNum = Number(req.query.year);
    const monthNum = Number(req.query.month);

    // Validate user existence
    if (!(await userExists(idNum))) {
        return notFound(res, 'user not found');
    }

    // Fetch or compute the report
    const result = await getCachedOrCompute(idNum, yearNum, monthNum);

    // Return only the report payload, not wrapped twice
    return res.status(200).json(result.data);
};

module.exports = { getMonthly };

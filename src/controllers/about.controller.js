/**
 * About Controller
 *
 * Design Pattern: Simple data provider pattern.
 * - This endpoint provides information about the team members involved in the project.
 * - Returns basic details of the team members in JSON format.
 *
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Object[]} - A list of team members with `first_name` and `last_name`.
 */
async function aboutController(req, res) {
    const TEAM = [
        { first_name: 'Yehonatan', last_name: 'Ravoach' },
        { first_name: 'Shay', last_name: 'Yeffet' }
    ];

    res.json(TEAM.map(({ first_name, last_name }) => ({ first_name, last_name })));
}

module.exports = { aboutController };

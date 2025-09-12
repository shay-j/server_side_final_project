/*
 * About Controller
 *
 * Design Pattern: Simple data provider pattern.
 * - This endpoint provides information about the team members involved in the project.
 * - Returns basic details of the team members in JSON format.
 *
 * Parameters:
 *   req - Express request object.
 *   res - Express response object.
 *
 * Returns:
 *   A list of team members with `first_name` and `last_name`.
 */
async function about_controller(req, res) {
    //Define team members as a constant array of objects
    const TEAM = [
        { first_name: 'Yehonatan', last_name: 'Ravoach' },
        { first_name: 'Shay', last_name: 'Yeffet' }
    ];
    //Respond with only the required fields in JSON format
    res.json(TEAM.map(({ first_name, last_name }) => ({ first_name, last_name })));
}
//Export the controller function so it can be used in other files
module.exports = { aboutController: about_controller };

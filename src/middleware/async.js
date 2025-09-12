/*
 * Higher-order function for wrapping async route handlers.
 *
 * Purpose:
 * - Ensures that any errors thrown in async route handlers
 *   are automatically passed to Express error handling middleware.
 *
 * Parameters:
 *   fn - The async function (controller) to be wrapped.
 *
 * Returns:
 *   A new function that executes the controller and catches errors.
 */
module.exports = fn => (req, res, next) => {
    // Wrap controller execution in a resolved Promise
    // Catch any errors and forward them to Express via next()
    Promise.resolve(fn(req, res, next)).catch(next);
};

'use strict';

const Joi = require('joi');
const { isPastMonth } = require('../utils/dates');
const { CATEGORIES } = require('../utils/constants');

/*
 * ===========================================
 * Validation middleware & schemas (Joi)
 * -------------------------------------------
 * Design Patterns (Server-Side):
 * - Middleware Factory: makeValidator(...) builds Express middlewares for reuse.
 * - Normalization: Joi with convert+stripUnknown enforces consistent inputs.
 * - Post-Validation Hook: optional business rules after base validation.
 * ===========================================
 */

/*
 * Common Joi validation options for consistent behavior.
 * - abortEarly: collect all errors
 * - stripUnknown: remove fields not in schema
 * - convert: coerce types (e.g., strings to numbers/dates)
 */
const DEFAULT_JOI_OPTIONS = Object.freeze({
    abortEarly: false,
    stripUnknown: true,
    convert: true,
});

/*
 * Maps Joi error details to a compact, API-friendly array of { path, msg }.
 *
 * Parameters:
 *   error - Joi ValidationError
 *
 * Returns:
 *   Array of { path, msg }
 */
function formatJoiError(error) {
    return error.details.map(d => ({
        path: Array.isArray(d.path) ? d.path.join('.') : String(d.path || ''),
        msg: d.message,
    }));
}

/*
 * Factory: builds an Express middleware that validates a request part with a Joi schema.
 * Supports optional post-validate hook for business rules.
 *
 * Parameters:
 *   schema - Joi schema to validate against
 *   source - request property to validate ('body' | 'query' | 'params')
 *   opts   - optional object with postValidate hook
 *
 * Returns:
 *   Express request handler (middleware)
 */
function makeValidator(schema, source = 'body', opts = {}) {
    const { postValidate } = opts;
    return (req, res, next) => {
        const input = req[source] || {};
        const { error, value } = schema.validate(input, DEFAULT_JOI_OPTIONS);

        if (error) {
            // Validation failed, return error response
            return res.status(400).json({
                message: 'Validation error',
                details: formatJoiError(error),
            });
        }

        // Replace request data with validated/cleaned version
        req[source] = value;

        // Apply any custom business rules (optional)
        if (typeof postValidate === 'function') {
            const extraErrors = postValidate(req);
            if (extraErrors) {
                const details = Array.isArray(extraErrors) ? extraErrors : [extraErrors];
                return res.status(400).json({ message: 'Validation error', details });
            }
        }

        // Continue to next middleware
        next();
    };
}

// ===== Shared schema pieces =====

// Project spec: ids are numeric (Number in Mongoose/Mongo)
const idNumber = Joi.number().integer();

// ===== Schemas =====

const addUserSchema = Joi.object({
    // CHANGED: string -> number per spec
    id: idNumber.required(),
    first_name: Joi.string().trim().min(1).max(64).required(),
    last_name: Joi.string().trim().min(1).max(64).required(),
    birthday: Joi.date().iso().optional(),
});

const addCostSchema = Joi.object({
    // CHANGED: string -> number per spec
    userid: idNumber.required(),
    description: Joi.string().trim().min(1).max(256).required(),
    category: Joi.string().lowercase().valid(...CATEGORIES).required(),
    sum: Joi.number().greater(0).required(),
    created_at: Joi.date().iso().optional(),
});

const reportQuerySchema = Joi.object({
    // CHANGED: string -> number per spec
    id: idNumber.required(),
    year: Joi.number().integer().min(1970).max(2100).required(),
    month: Joi.number().integer().min(1).max(12).required(),
});

const idParamSchema = Joi.object({
    // CHANGED: string -> number per spec
    id: idNumber.required(),
});

// ===== Validators =====

// Validates request body to add a user.
const validateAddUser = makeValidator(addUserSchema, 'body');

/*
 * Validates request body to add a cost.
 * Business rule: created_at must not be in a past month.
 */
const validateAddCost = makeValidator(addCostSchema, 'body', {
    postValidate: (req) => {
        const ts = req.body.created_at || new Date();
        if (isPastMonth(ts)) {
            return { path: 'created_at', msg: 'past month costs are not allowed' };
        }
        return null;
    },
});

/*
 * Report query validation.
 * Accepts ?id=&year=&month= and ALLOWS any month (past/current/future).
 * Removed the past-month-only restriction.
 */
const validateReportQuery = makeValidator(reportQuerySchema, 'query');

// Validates route params containing a single numeric id.
const validateUserIdParam = makeValidator(idParamSchema, 'params');

// ===== Exports =====

module.exports = {
    // generic
    validate: makeValidator,

    // ready-made middlewares
    validateAddUser,
    validateAddCost,
    validateReportQuery,
    validateUserIdParam,

    // schemas (for reuse in tests/controllers if needed)
    schemas: Object.freeze({
        addUserSchema,
        addCostSchema,
        reportQuerySchema,
        idParamSchema,
    }),
};

'use strict';

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------
 * Centralized definitions used across the project.
 *
 * CATEGORIES:
 * - Allowed categories for costs.
 * - Shared between model validation and request validation.
 * - Enforced via enum in Mongoose schema and Joi schema.
 * ------------------------------------------------------------------ */
module.exports = {
    CATEGORIES: ['food', 'health', 'housing', 'sports', 'education']
};

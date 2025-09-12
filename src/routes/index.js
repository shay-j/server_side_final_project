'use strict';

/*
 * API Router (single entry point).
 *
 * Responsibilities:
 * - Map all required endpoints per project spec.
 * - Run validation middleware (Joi) before controllers.
 * - Tag request with endpoint name (res.locals.endpoint) so requestLogger can persist it.
 * - Use async middleware to forward rejections to the global error handler.
 *
 * Endpoints:
 *   POST /api/add                  -> addCtrl.add            (creates user | cost; validator selected inline)
 *   GET  /api/report               -> reportCtrl.getMonthly  (?id&year&month)
 *   GET  /api/users                -> usersCtrl.list
 *   GET  /api/users/:id            -> usersCtrl.getById
 *   GET  /api/logs                 -> logsCtrl.listLogs
 *   GET  /api/about                -> aboutCtrl.about
 *
 * Notes:
 * - /health is wired in app.js (non-API).
 * - Logging: requestLogger (in app.js) writes one log per request via Pino + Mongo.
 *   This router sets res.locals.endpoint so each access is recorded with a logical name.
 */

const express = require('express');
const asyncMw = require('../middleware/async');

const {
    validateReportQuery,
    validateUserIdParam,
    validateAddUser,
    validateAddCost,
} = require('../middleware/validate');

const addCtrl = require('../controllers/add_controller');
const reportCtrl = require('../controllers/report_controller');
const usersCtrl = require('../controllers/users_controller');
const logsCtrl = require('../controllers/log_controller');
const aboutCtrl = require('../controllers/./about_controller');

const router = express.Router();

/* Tag the current endpoint so requestLogger can persist it */
function endpoint(name) {
    return (req, res, next) => {
        res.locals.endpoint = name;  // Attach endpoint name to response locals
        next();
    };
}

/*
 * Inline validator chooser for POST /api/add
 * - No separate export to avoid duplication.
 * - If body looks like a User -> validateAddUser
 * - Otherwise -> validateAddCost
 */
function pickAddValidator(req, res, next) {
    const b = req.body || {};
    const looksLikeUser =
        b && typeof b === 'object' && 'id' in b && ('first_name' in b || 'last_name' in b);

    // Delegate validation depending on the body shape
    return looksLikeUser ? validateAddUser(req, res, next) : validateAddCost(req, res, next);
}

/* ===== Routes ===== */

// Create a user or a cost
router.post('/add', endpoint('add'), pickAddValidator, asyncMw(addCtrl.add));

// Get monthly report (?id=&year=&month=)
router.get('/report', endpoint('reports.getMonthly'), validateReportQuery, asyncMw(reportCtrl.getMonthly));

// List all users
router.get('/users', endpoint('users.list'), asyncMw(usersCtrl.list));

// Get user by ID
router.get('/users/:id', endpoint('users.getById'), validateUserIdParam, asyncMw(usersCtrl.getById));

// List logs
router.get('/logs', endpoint('logs.list'), asyncMw(logsCtrl.list));

// About info
router.get('/about', endpoint('about'), asyncMw(aboutCtrl.aboutController));

// Export router
module.exports = router;

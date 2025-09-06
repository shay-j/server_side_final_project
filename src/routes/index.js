'use strict';

/**
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

const addCtrl = require('../controllers/add.controller');
const reportCtrl = require('../controllers/report.controller');
const usersCtrl = require('../controllers/users.controller');
const logsCtrl = require('../controllers/log.controller');
const aboutCtrl = require('../controllers/about.controller');

const router = express.Router();

/** Tag the current endpoint so requestLogger can persist it. */
function endpoint(name) {
  return (req, res, next) => {
    res.locals.endpoint = name;
    next();
  };
}

/**
 * Inline validator chooser for POST /api/add.
 * No separate module export to avoid duplication.
 * If a body looks like a User -> validateAddUser; otherwise validateAddCost.
 */
function pickAddValidator(req, res, next) {
  const b = req.body || {};
  const looksLikeUser =
      b && typeof b === 'object' && 'id' in b && ('first_name' in b || 'last_name' in b);
  return looksLikeUser ? validateAddUser(req, res, next) : validateAddCost(req, res, next);
}

/* Routes */
router.post('/add', endpoint('add'), pickAddValidator, asyncMw(addCtrl.add));
router.get('/report', endpoint('reports.getMonthly'), validateReportQuery, asyncMw(reportCtrl.getMonthly));
router.get('/users', endpoint('users.list'), asyncMw(usersCtrl.list));
router.get('/users/:id', endpoint('users.getById'), validateUserIdParam, asyncMw(usersCtrl.getById));
router.get('/logs', endpoint('logs.list'), asyncMw(logsCtrl.list));
router.get('/about', endpoint('about'), asyncMw(aboutCtrl.aboutController));

module.exports = router;

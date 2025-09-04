'use strict';

const express = require('express');
const router = express.Router();

const { addCost, addCostValidator } = require('../controllers/cost.controller');
const { addUser, addUserValidator, getUserById, listUsers } = require('../controllers/user.controller');
const { getMonthlyReport, reportQueryValidator } = require('../controllers/report.controller');
const { about } = require('../controllers/about.controller');
const { listLogs } = require('../controllers/log.controller');

/**
 * The doc uses /api/add for both adding a user and adding a cost.
 * We dispatch by inspecting the body fields.
 */
router.post('/api/add', (req, res, next) => {
  const body = req.body || {};
  const isUser = 'id' in body && 'first_name' in body && 'last_name' in body && 'birthday' in body;
  const isCost = 'userid' in body && 'description' in body && 'category' in body && 'sum' in body;

  if (isUser) return addUserValidator(req, res, () => addUser(req, res, next));
  if (isCost) return addCostValidator(req, res, () => addCost(req, res, next));

  return res.status(400).json({ error: 'bad_request', message: 'Body must match either user or cost schema.' });
});

router.get('/api/report', reportQueryValidator, getMonthlyReport);
router.get('/api/users', listUsers);
router.get('/api/users/:id', getUserById);
router.get('/api/about', about);
router.get('/api/logs', listLogs);

module.exports = router;

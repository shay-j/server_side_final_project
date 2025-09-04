'use strict';

require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { httpLogger } = require('./logger');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

// connect to mongo
const { connect } = require('./db');
if (process.env.NODE_ENV !== 'test') {
  connect(process.env.MONGODB_URI).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
}

const app = express();

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug');

// middleware
app.use(cors());
app.use(httpLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// persist logs to Mongo
app.use(requestLogger());

// Home page
app.use(express.static('public'));

// API routes
app.use(routes);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

// 404 → error handler
app.use(function (req, res, next) {
  next(createError(404));
});
app.use(errorHandler);

module.exports = app;

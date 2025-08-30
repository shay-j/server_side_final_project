'use strict';

require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

// our additions
const cors = require('cors');
const { httpLogger } = require('./src/logger');               // <-- NOTE the ./src/ prefix
const { requestLogger } = require('./src/middleware/requestLogger');
const { errorHandler } = require('./src/middleware/errorHandler');
const routes = require('./src/routes');                        // <-- NOTE the ./src/ prefix

const app = express();

// view engine setup (kept from generator)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// standard middleware
app.use(cors());
app.use(httpLogger);          // pino to console
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// persist logs to Mongo
app.use(requestLogger());

// Your homepage route (optional from generator)
app.get('/', (req, res) => {
  res.render('index', { title: 'Cost Manager API', message: 'Hello from Express' });
});

// Our API routes
app.use(routes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (ours – returns JSON)
app.use(errorHandler);

module.exports = app;

'use strict';

/**
 * Express server configuration.
 * - Reads environment variables and sets up middleware.
 * - Initializes the database connection.
 * - Maps all API routes and error handling.
 */

require('dotenv').config({
  path:
      process.env.NODE_ENV === 'production'
          ? '.env.prod'
          : process.env.NODE_ENV === 'test'
              ? '.env.test'
              : '.env',
});

const express = require('express');
const path = require('path');
const pinoHttp = require('pino-http')();
const { connectDB } = require('./db');

// Import routes
const routes = require('./routes');

const app = express();

// Middleware
// Logging middleware using Pino for request logs
app.use(pinoHttp);

// JSON and URL-encoded body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files (dashboard, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serves index.html
app.get('/', (_req, res) =>
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);

// Health check route - for monitoring server health
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// API Routes
// All API routes are handled through routes/index.js
app.use('/api', routes);

// Error handling
// 404 handler for routes not found
app.use((req, res, _next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Generic error handler
// Catches errors passed to `next()` and returns a consistent error response
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const payload = { message: err.message || 'Internal Error' };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.details = err.stack.split('\n')[0];
  }
  res.status(status).json(payload);
});

/**
 * Start hook to initialize DB connection.
 * Only `app.start()` should be called in `bin/www`.
 */
app.start = async () => {
  // Avoid automatic DB connection in tests (app will be started in test.js)
  if (process.env.NODE_ENV !== 'test') {
    await connectDB();
  }
  return app;
};

module.exports = app;

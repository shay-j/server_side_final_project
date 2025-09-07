'use strict';

/**
 * Express app bootstrap.
 * - Loads env by NODE_ENV (.env | .env.test | .env.prod)
 * - Sets pino-http, parsers, static dashboard
 * - Persists request logs to MongoDB via logs.service
 * - Mounts /api routes, 404, and uniform error handler
 * - Exposes app.start() to connect DB (skips in tests)
 */

require('dotenv').config({
  path:
      process.env.NODE_ENV === 'test'
          ? '.env.test'
          : '.env',
});

const express = require('express');
const path = require('path');
const pinoHttp = require('pino-http')();
const { connectDB } = require('./db');
const { writeLog } = require('./services/logs.service');
const routes = require('./routes');

const app = express();

/* ---------- base middleware ---------- */

// request logging to console
app.use(pinoHttp);

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// static dashboard
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// health
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

/* ---------- request audit → Mongo (logs.service) ---------- */
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - t0) / 1000000n);
    // map fields to Log schema names inside service
    writeLog({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: durationMs,
      endpoint: (req.baseUrl || '') + (req.path || ''),
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    }).catch(() => {});
  });
  next();
});

/* ---------- API routes ---------- */
app.use('/api', routes);

/* ---------- 404 ---------- */
app.use((req, res, _next) => {
  res.status(404).json({ message: 'Not Found' });
});

/* ---------- error handler ---------- */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const payload = { message: err.message || 'Internal Error' };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.details = err.stack.split('\n')[0];
  }
  res.status(status).json(payload);
});

/* ---------- start hook (bin/www calls this) ---------- */
app.start = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await connectDB();
  }
  return app;
};

module.exports = app;

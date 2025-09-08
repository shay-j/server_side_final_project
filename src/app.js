'use strict';

/**
 * Express app bootstrap.
 * - Loads env by NODE_ENV (.env | .env.test)
 * - Sets pino-http, parsers, static dashboard
 * - Persists request logs to MongoDB via logs.service
 * - Mounts /api routes, 404, and uniform error handler
 * - Exposes app.start() to connect DB (skips in tests)
 */

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const express = require('express');
const path = require('path');
const pinoHttp = require('pino-http')();
const { connectDB } = require('./db');
const { writeLog } = require('./services/logs.service');
const routes = require('./routes');

// 👇 missing import + admin constants (were causing ReferenceError)
const mongoose = require('mongoose');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const USERS_COLLECTION = (process.env.USERS_COLLECTION || 'users').toLowerCase();
const PRESERVE_COLLECTIONS = (process.env.PRESERVE_COLLECTIONS || 'users')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

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
// Skip admin endpoints to avoid racing with cleanup; also allow route to flag skip via res.locals.skipLog
app.use((req, res, next) => {
    if ((req.originalUrl || '').startsWith('/api/admin') || res.locals?.skipLog) {
        return next();
    }
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number((process.hrtime.bigint() - t0) / 1000000n);
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

/* ---------- Admin cleanup route (fixed) ---------- */
/**
 * POST /api/admin/cleanup
 * Header: x-admin-token: <ADMIN_TOKEN>
 * Body: { id?: number, first_name?: string, last_name?: string, birthday?: ISO, dryRun?: boolean }
 */
app.post('/api/admin/cleanup', async (req, res) => {
    // don't log this request (we may wipe logs)
    res.locals.skipLog = true;

    if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
    }

    const {
        id = 123123,
        first_name = 'mosh',
        last_name = 'israeli',
        birthday = '1990-01-01',
        dryRun = false,
    } = req.body || {};
    const keepId = Number(id);

    try {
        // Ensure the kept user exists (unless dry run)
        if (!dryRun) {
            await mongoose.connection.db.collection(USERS_COLLECTION).updateOne(
                { id: keepId },
                {
                    $setOnInsert: {
                        id: keepId,
                        first_name,
                        last_name,
                        birthday: new Date(birthday),
                    },
                },
                { upsert: true }
            );
        }

        // Build a safe deletion plan (skip system.* and preserved collections)
        const collections = await mongoose.connection.db.collections();
        const plan = [];
        for (const coll of collections) {
            const name = (coll.collectionName || '').toLowerCase();
            if (!name || name.startsWith('system.')) continue;

            if (name === USERS_COLLECTION) {
                plan.push({ collection: name, filter: { id: { $ne: keepId } } });
            } else if (!PRESERVE_COLLECTIONS.includes(name)) {
                plan.push({ collection: name, filter: {} });
            }
        }

        if (dryRun) {
            return res.json({ dryRun: true, keptUserId: keepId, plan });
        }

        // Execute deletions
        const results = [];
        for (const step of plan) {
            const r = await mongoose.connection.db
                .collection(step.collection)
                .deleteMany(step.filter);
            results.push({ collection: step.collection, deletedCount: r.deletedCount });
        }

        return res.json({ ok: true, keptUserId: keepId, results });
    } catch (err) {
        console.error('cleanup_failed', err);
        return res.status(500).json({ error: 'cleanup_failed', message: err.message });
    }
});

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

// tests/e2e.full.test.js
// Comprehensive end-to-end tests with Jest + Supertest.
// Uses .env.test and NODE_ENV=test to bind to costmanager_test via your db mapping.

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

let server;
let agent;
let API_PREFIX = ''; // detected at runtime

async function detectApiPrefix() {
    // Try common mount patterns to avoid hard-coding
    const candidates = ['', '/api', '/api/api'];
    for (const p of candidates) {
        const res = await agent.get(`${p}/about`);
        if (res.status !== 404) return p;
        const resApi = await agent.get(`${p}/api/about`);
        if (resApi.status !== 404) return `${p}/api`;
    }
    return '/api'; // fallback
}

const api = (path) => `${API_PREFIX}${path}`;
const { connectDB } = require('../src/db');

beforeAll(async () => {
    await connectDB();
    const runningApp = await app.start(); // app.start() should connect DB
    server = http.createServer(runningApp);
    await new Promise((resolve) => server.listen(0, resolve));
    agent = request(server);
    API_PREFIX = await detectApiPrefix();
});

afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
    }
});

/* ----------------------- Helpers ----------------------- */

async function post(path, body) {
    return agent.post(api(path)).send(body).set('Content-Type', 'application/json');
}

/* ======================= Tests ========================= */

describe('Health and 404', () => {
    test('GET /health -> 200 { ok: true }', async () => {
        const res = await agent.get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    test('GET unknown route -> 404 { message: "Not Found" }', async () => {
        const res = await agent.get('/definitely-not-exists');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message', 'Not Found');
    });
});

describe('About', () => {
    test('GET /about returns team array', async () => {
        const res = await agent.get(api('/about'));
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length) {
            expect(res.body[0]).toHaveProperty('first_name');
            expect(res.body[0]).toHaveProperty('last_name');
        }
    });
});

describe('Users', () => {
    test('Create user -> 201, Duplicate -> 409', async () => {
        const user = { id: 101, first_name: 'Alice', last_name: 'Doe', birthday: '2000-01-01' };
        const r1 = await post('/add', user);
        expect(r1.status).toBe(201);
        expect(r1.body).toHaveProperty('ok', true);

        const r2 = await post('/add', user);
        expect(r2.status).toBe(409);
        expect(r2.body).toHaveProperty('message');
    });

    test('Create user with invalid id type -> 400', async () => {
        const bad = { id: 'abc', first_name: 'A', last_name: 'B' };
        const res = await post('/add', bad);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
    });

    test('Get users list -> 200 ok:true data:Array', async () => {
        await post('/add', { id: 102, first_name: 'A', last_name: 'B' });
        const res = await agent.get(api('/users'));
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ok', true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Get user by id -> 200 with totals; not found -> 404', async () => {
        await post('/add', { id: 103, first_name: 'A', last_name: 'B' });

        const okRes = await agent.get(api('/users/103'));
        expect(okRes.status).toBe(200);
        expect(okRes.body).toHaveProperty('ok', true);
        expect(okRes.body.data).toHaveProperty('id', 103);
        expect(okRes.body.data).toHaveProperty('totals');

        const nfRes = await agent.get(api('/users/999999'));
        expect(nfRes.status).toBe(404);
        expect(nfRes.body).toHaveProperty('message');
    });
});

describe('Costs', () => {
    test('Add valid cost (current month) -> 201', async () => {
        await post('/add', { id: 201, first_name: 'C', last_name: 'D' });
        const cost = { userid: 201, description: 'Milk', category: 'food', sum: 12.5 };
        const res = await post('/add', cost);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('ok', true);
    });

    test('Add cost with uppercase category is normalized by Joi -> 201', async () => {
        await post('/add', { id: 202, first_name: 'E', last_name: 'F' });
        const cost = { userid: 202, description: 'Gym', category: 'SPORTS', sum: 45 };
        const res = await post('/add', cost);
        expect(res.status).toBe(201);
    });

    test('Add cost invalid category -> 400', async () => {
        await post('/add', { id: 203, first_name: 'G', last_name: 'H' });
        const bad = { userid: 203, description: 'X', category: 'invalid_cat', sum: 10 };
        const res = await post('/add', bad);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
    });

    test('Add cost missing user -> 404', async () => {
        const res = await post('/add', { userid: 999999, description: 'Y', category: 'health', sum: 7 });
        expect(res.status).toBe(404);
    });

    test('Add cost sum <= 0 -> 400', async () => {
        await post('/add', { id: 204, first_name: 'I', last_name: 'J' });
        const res = await post('/add', { userid: 204, description: 'Z', category: 'food', sum: 0 });
        expect(res.status).toBe(400);
    });

    test('Add cost past month -> 400', async () => {
        await post('/add', { id: 205, first_name: 'K', last_name: 'L' });
        const now = new Date();
        const past = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();
        const res = await post('/add', { userid: 205, description: 'Old', category: 'food', sum: 5, created_at: past });
        expect(res.status).toBe(400);
    });
});

describe('Reports (Computed pattern)', () => {
    test('Past month: first call computes/materializes, second call hits cache', async () => {
        await post('/add', { id: 301, first_name: 'M', last_name: 'N' });
        await post('/add', { userid: 301, description: 'Book', category: 'education', sum: 30 });

        const now = new Date();
        const yPast = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const mPast = now.getMonth() === 0 ? 12 : now.getMonth();

        const r1 = await agent.get(api(`/report?id=${301}&year=${yPast}&month=${mPast}`));
        expect(r1.status).toBe(200);
        expect(r1.body).toHaveProperty('ok', true);
        expect(['computed', 'cache', 'live']).toContain(r1.body.data.source);

        const r2 = await agent.get(api(`/report?id=${301}&year=${yPast}&month=${mPast}`));
        expect(r2.status).toBe(200);
        expect(r2.body.data.source).toBe('cache');
    });

    test('Current month rejected by validator -> 400', async () => {
        await post('/add', { id: 302, first_name: 'O', last_name: 'P' });
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const res = await agent.get(api(`/report?id=${302}&year=${y}&month=${m}`));
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
    });

    test('Invalid report params (non-numeric id) -> 400', async () => {
        const now = new Date();
        const yPast = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const mPast = now.getMonth() === 0 ? 12 : now.getMonth();
        const res = await agent.get(api(`/report?id=abc&year=${yPast}&month=${mPast}`));
        expect(res.status).toBe(400);
    });
});

describe('Logs', () => {
    test('GET /logs returns array (may be empty)', async () => {
        await agent.get(api('/about')); // generate at least one request
        const res = await agent.get(api('/logs'));
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

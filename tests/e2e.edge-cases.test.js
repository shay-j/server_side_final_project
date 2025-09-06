// tests/e2e.edge-cases.test.js
// Comprehensive edge-case E2E tests with Jest + Supertest.
// Requires: NODE_ENV=test and .env.test

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, ensureIndexes} = require('../src/db');

let server;
let agent;
let API_PREFIX = ''; // detected at runtime

async function detectApiPrefix() {
    const candidates = ['', '/api', '/api/api'];
    for (const p of candidates) {
        const r = await agent.get(`${p}/about`);
        if (r.status !== 404) return p;
        const r2 = await agent.get(`${p}/users`);
        if (r2.status !== 404) return p;
    }
    return '/api';
}

const api = (p) => `${API_PREFIX}${p}`;

beforeAll(async () => {
    await connectDB();          // connect once
    const runningApp = await app.start();
    server = http.createServer(runningApp);
    await new Promise((res) => server.listen(0, res));
    agent = request(server);
    API_PREFIX = await detectApiPrefix();
});

afterAll(async () => {
    if (server) await new Promise((res) => server.close(res));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
    }
});

/* ----------------------- helpers ----------------------- */

async function post(path, body) {
    return agent.post(api(path)).send(body).set('Content-Type', 'application/json');
}

/* ======================= tests ========================= */

describe('Validation: users id', () => {
    test('numeric string id is coerced -> 201', async () => {
        const r = await post('/add', { id: '150', first_name: 'A', last_name: 'B' });
        expect(r.status).toBe(201);
    });

    test('non-numeric id -> 400', async () => {
        const r = await post('/add', { id: 'abc', first_name: 'A', last_name: 'B' });
        expect(r.status).toBe(400);
        expect(r.body).toHaveProperty('message', 'Validation error');
    });

    test('float id -> 400 (integer required)', async () => {
        const r = await post('/add', { id: 101.5, first_name: 'A', last_name: 'B' });
        expect(r.status).toBe(400);
    });
});

describe('Validation: costs fields', () => {
    beforeEach(async () => {
        await post('/add', { id: 201, first_name: 'C', last_name: 'D' });
    });

    test('uppercase category is normalized by Joi.lowercase -> 201', async () => {
        const r = await post('/add', { userid: 201, description: 'Gym', category: 'SPORTS', sum: 45 });
        expect(r.status).toBe(201);
    });

    test('category with spaces is rejected (no trim on schema) -> 400', async () => {
        const r = await post('/add', { userid: 201, description: 'Meal', category: ' food ', sum: 10 });
        expect(r.status).toBe(400);
    });

    test('description empty -> 400', async () => {
        const r = await post('/add', { userid: 201, description: '', category: 'food', sum: 5 });
        expect(r.status).toBe(400);
    });

    test('description too long -> 400', async () => {
        const long = 'x'.repeat(300);
        const r = await post('/add', { userid: 201, description: long, category: 'food', sum: 5 });
        expect(r.status).toBe(400);
    });

    test('sum <= 0 -> 400', async () => {
        const r = await post('/add', { userid: 201, description: 'Z', category: 'food', sum: 0 });
        expect(r.status).toBe(400);
    });

    test('userid non-numeric string -> 400', async () => {
        const r = await post('/add', { userid: 'abc', description: 'Y', category: 'health', sum: 3 });
        expect(r.status).toBe(400);
    });
});

describe('Dates: boundaries for created_at and reports', () => {
    beforeEach(async () => {
        await post('/add', { id: 301, first_name: 'M', last_name: 'N' });
    });

    test('created_at at end of previous month -> 400', async () => {
        const now = new Date();
        const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const r = await post('/add', {
            userid: 301, description: 'Old', category: 'food', sum: 4.5, created_at: endPrev.toISOString(),
        });
        expect(r.status).toBe(400);
    });

    test('created_at at start of current month -> 201', async () => {
        const now = new Date();
        const startCurr = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const r = await post('/add', {
            userid: 301, description: 'Fresh', category: 'food', sum: 4.5, created_at: startCurr.toISOString(),
        });
        expect(r.status).toBe(201);
    });

    test('report with invalid month=13 -> 400', async () => {
        const r = await agent.get(api(`/report?id=301&year=2030&month=13`));
        expect(r.status).toBe(400);
    });

    test('report current month is rejected -> 400', async () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const r = await agent.get(api(`/report?id=301&year=${y}&month=${m}`));
        expect(r.status).toBe(400);
    });

    test('report future month is rejected -> 400', async () => {
        const now = new Date();
        const y = now.getFullYear() + 1;
        const r = await agent.get(api(`/report?id=301&year=${y}&month=1`));
        expect(r.status).toBe(400);
    });
});

describe('Concurrency and duplicates', () => {
    test('two parallel user creates -> one 201 and one 409', async () => {
        const u = { id: 777, first_name: 'X', last_name: 'Y' };
        const [a, b] = await Promise.all([post('/add', u), post('/add', u)]);
        const statuses = [a.status, b.status].sort();
        expect(statuses).toEqual([201, 409]);
    });
});

describe('Users totals and zero-case', () => {
    test('user without costs -> totals zero', async () => {
        await post('/add', { id: 901, first_name: 'Z', last_name: 'Q' });
        const r = await agent.get(api('/users/901'));
        expect(r.status).toBe(200);
        expect(r.body.ok).toBe(true);
        expect(r.body.data.totals).toEqual({ total_sum: 0, count: 0 });
    });

    test('users list returns projection only', async () => {
        await post('/add', { id: 902, first_name: 'A', last_name: 'B', birthday: '1990-01-01', extra: 'drop-me' });
        const r = await agent.get(api('/users'));
        expect(r.status).toBe(200);
        const u = r.body.data.find((x) => x.id === 902);
        expect(u).toBeTruthy();
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('first_name');
        expect(u).toHaveProperty('last_name');
        expect(u).not.toHaveProperty('extra');
    });
});

describe('Aggregation sanity', () => {
    test('totals equals sum of inserted costs', async () => {
        await post('/add', { id: 1001, first_name: 'Agg', last_name: 'Test' });
        await post('/add', { userid: 1001, description: 'A', category: 'food', sum: 10 });
        await post('/add', { userid: 1001, description: 'B', category: 'education', sum: 5.25 });
        await post('/add', { userid: 1001, description: 'C', category: 'health', sum: 4.75 });

        const r = await agent.get(api('/users/1001'));
        expect(r.status).toBe(200);
        const totals = r.body.data.totals;
        expect(totals.count).toBe(3);
        expect(Number(totals.total_sum)).toBeCloseTo(20, 2);
    });
});

describe('Params validation and 404', () => {
    test('GET /users/:id non-numeric -> 400', async () => {
        const r = await agent.get(api('/users/not-a-number'));
        expect(r.status).toBe(400);
    });

    test('unknown api route -> 404 JSON', async () => {
        const r = await agent.get(api('/no-such-route'));
        expect(r.status).toBe(404);
        expect(r.body).toHaveProperty('message', 'Not Found');
    });

    test('unknown non-api route -> 404 JSON', async () => {
        const r = await agent.get('/definitely-missing');
        expect(r.status).toBe(404);
        expect(r.body).toHaveProperty('message', 'Not Found');
    });
});

describe('Logs API', () => {
    test('logs endpoint returns array and respects limit', async () => {
        await agent.get(api('/about'));
        await agent.get(api('/users')); // more traffic
        const r = await agent.get(api('/logs?limit=1'));
        expect(r.status).toBe(200);
        expect(Array.isArray(r.body)).toBe(true);
        expect(r.body.length).toBeLessThanOrEqual(1);
    });

    test('errors are also logged (best-effort)', async () => {
        await agent.get(api('/no-route-404'));
        const r = await agent.get(api('/logs'));
        expect(r.status).toBe(200);
        expect(Array.isArray(r.body)).toBe(true);
    });
});

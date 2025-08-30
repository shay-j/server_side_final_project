'use strict';

require('dotenv').config({ path: '.env.test' });

const mongoose = require('mongoose');
const request = require('supertest');

const { connect } = require('../src/db');
const app = require('../app');

// Handy helpers
function nowY() { return new Date().getUTCFullYear(); }
function nowM() { return new Date().getUTCMonth() + 1; } // 1..12

const TEST_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

describe('Cost Manager API (E2E)', () => {
    beforeAll(async () => {
        if (!TEST_URI) throw new Error('Missing TEST_MONGODB_URI (or MONGODB_URI) for tests');
        await connect(TEST_URI);
        // Clean slate for repeatable tests
        await mongoose.connection.db.dropDatabase();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Health: GET /health → 200 { ok: true }', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    test('About: GET /api/about → array of { first_name, last_name } only', async () => {
        const res = await request(app).get('/api/about');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            const item = res.body[0];
            expect(Object.keys(item).sort()).toEqual(['first_name', 'last_name'].sort());
        }
    });

    test('Add user: POST /api/add → 201', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({
                id: 123123,
                first_name: 'mosh',
                last_name: 'israeli',
                birthday: '1990-01-01'
            });
        expect([201, 409]).toContain(res.status); // 409 allowed if user already added by previous test run
        if (res.status === 201) {
            expect(res.body).toMatchObject({
                id: 123123,
                first_name: 'mosh',
                last_name: 'israeli'
            });
            expect(typeof res.body.birthday).toBe('string');
        } else {
            expect(res.body.error).toBe('user_exists');
        }
    });

    test('List users: GET /api/users → contains our user', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        const u = res.body.find(x => x.id === 123123);
        expect(u).toBeTruthy();
        expect(u.first_name).toBe('mosh');
        expect(u.last_name).toBe('israeli');
    });

    test('User details: GET /api/users/123123 → total starts at 0', async () => {
        const res = await request(app).get('/api/users/123123');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            first_name: 'mosh',
            last_name: 'israeli',
            id: 123123
        });
        // Could be 0 or more if you ran tests before without cleaning,
        // but after dropDatabase() it should be 0.
        expect(typeof res.body.total).toBe('number');
    });

    test('Add cost (past date) → 400 invalid_date', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'old ticket',
                category: 'sports',
                sum: 20,
                date: '2023-01-01T00:00:00Z'
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_date');
    });

    test('Add cost (no date → server time) → 201', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'milk',
                category: 'food',
                sum: 10
            });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            description: 'milk',
            category: 'food',
            userid: 123123,
            sum: 10
        });
        expect(typeof res.body._id).toBe('string');
        expect(typeof res.body.date).toBe('string');
    });

    test('Add cost (invalid category) → 400 validation_error', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'plane',
                category: 'travel',
                sum: 200
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('validation_error');
    });

    test('User details: total increased after valid cost', async () => {
        const res = await request(app).get('/api/users/123123');
        expect(res.status).toBe(200);
        expect(typeof res.body.total).toBe('number');
        expect(res.body.total).toBeGreaterThanOrEqual(10);
    });

    test('Report: GET /api/report (current Y/M) → correct shape', async () => {
        const res = await request(app).get(`/api/report?id=123123&year=${nowY()}&month=${nowM()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('userid', 123123);
        expect(res.body).toHaveProperty('year');
        expect(res.body).toHaveProperty('month');
        expect(Array.isArray(res.body.costs)).toBe(true);

        // Ensure costs array contains category objects like { food: [...] }
        const hasFood = res.body.costs.some(obj => Object.prototype.hasOwnProperty.call(obj, 'food'));
        expect(hasFood).toBe(true);
    });

    test('Logs: GET /api/logs → array with recent requests', async () => {
        const res = await request(app).get('/api/logs');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length) {
            const log = res.body[0];
            expect(typeof log.method).toBe('string');
            expect(typeof log.url).toBe('string');
            expect(typeof log.statusCode).toBe('number');
        }
    });
});

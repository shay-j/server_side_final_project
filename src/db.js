'use strict';

/*
 * Mongo connection utilities.
 * - Do NOT put a db name in MONGODB_URI. We pass dbName explicitly per NODE_ENV.
 * - Ensures critical indexes exist before serving requests.
 */
const mongoose = require('mongoose');

// Models whose indexes we care about in tests/production
const User = require('./models/User');
const Cost = require('./models/Cost');
const Report = require('./models/Report');
const Log = require('./models/Log');

// Map environment → database name
const DB_BY_ENV = {
    development: 'costmanager_dev',
    test: 'costmanager_test',
};

/* Resolve dbName by environment */
function getDbName(env = process.env.NODE_ENV || 'development') {
    return DB_BY_ENV[env] || DB_BY_ENV.development;
}

/* Ensure indexes are created (id unique, report uniq compound, etc.) */
async function ensureIndexes() {
    await Promise.all([
        User.syncIndexes(),   // unique index on id
        Cost.init(),          // ensure schema indexes
        Report.init(),        // unique (userid,year,month)
        Log.init(),           // ensure schema indexes
    ]);
}

/*
 * Connect to MongoDB using:
 *   - process.env.MONGODB_URI (without db name)
 *   - dbName derived from NODE_ENV
 * Also builds indexes before returning.
 */
async function connectDB() {
    const uri = process.env.MONGODB_URI;                  // connection string (no dbName)
    const env = process.env.NODE_ENV || 'development';    // current environment
    const dbName = getDbName(env);                        // resolve db name
    if (!uri) throw new Error('MONGODB_URI is missing');

    await mongoose.connect(uri, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
    });

    await ensureIndexes();                                // build critical indexes

    const { name } = mongoose.connection;
    console.log(`[mongo] connected to db="${name}" (env=${env})`);
}

module.exports = { connectDB, ensureIndexes };

'use strict';

/*
 * Cleanup script for the Cost Manager project.
 * Keeps a single dummy user and removes everything else.
 *
 * Usage:
 *   node scripts/cleanup.js --env=development --yes
 *   node scripts/cleanup.js --env=development --dry
 *   node scripts/cleanup.js --env=development --id=123123 --first=mosh --last=israeli --birthday=1990-01-01 --yes
 *
 * Notes:
 * - Targets db by NODE_ENV → development:test:production mapping.
 * - For your request, default env=development → db "costmanager_dev".
 */

const path = require('path');
const mongoose = require('mongoose');

// Models (use app models to honor explicit collection names)
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const Log = require('../src/models/Log');
const Report = require('../src/models/Report');

/* ---------- args ---------- */

function parseArgs(argv) {
    const args = {};
    for (const part of argv.slice(2)) {
        if (part.startsWith('--')) {
            const [k, v] = part.slice(2).split('=');
            args[k] = v === undefined ? true : v;
        }
    }
    return args;
}

const args = parseArgs(process.argv);
const ENV = (args.env || process.env.NODE_ENV || 'development').trim();

/* ---------- env loading ---------- */

process.env.NODE_ENV = ENV;
const envPath =
    ENV === 'production' ? '.env.prod' :
        ENV === 'test' ? '.env.test' :
            '.env';

require('dotenv').config({ path: path.resolve(process.cwd(), envPath) });

/* ---------- db name by env ---------- */

const DB_BY_ENV = {
    development: 'costmanager_dev',
    test: 'costmanager_test',
    production: 'costmanager_prod',
};

function getDbName(env) {
    return DB_BY_ENV[env] || DB_BY_ENV.development;
}

/* ---------- main ---------- */

(async () => {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error('❌ Missing MONGODB_URI in environment.');
        process.exit(1);
    }

    const dbName = getDbName(ENV); // default: costmanager_dev
    const targetId = Number(args.id ?? 123123);
    const first = String(args.first ?? 'mosh');
    const last = String(args.last ?? 'israeli');
    const birthdayStr = String(args.birthday ?? '1990-01-01');
    const dryRun = Boolean(args.dry);
    const confirm = Boolean(args.yes);

    console.log(`➡️  Connecting to MongoDB (env=${ENV}, dbName=${dbName})...`);
    await mongoose.connect(MONGODB_URI, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
    });
    console.log('✅ Connected');

    try {
        // Ensure the target user exists
        const existing = await User.findOne({ id: targetId }).lean();
        if (!existing) {
            if (dryRun) {
                console.log(`DRY-RUN: would create user { id:${targetId}, first_name:${first}, last_name:${last}, birthday:${birthdayStr} }`);
            } else {
                await User.create({
                    id: targetId,
                    first_name: first,
                    last_name: last,
                    birthday: new Date(birthdayStr),
                });
                console.log(`👤 Created missing user id=${targetId}`);
            }
        } else {
            console.log(`👤 User id=${targetId} already exists; will keep it.`);
        }

        // Count planned deletions
        const otherUsersCount = await User.countDocuments({ id: { $ne: targetId } });
        const costsCount = await Cost.countDocuments({});
        const reportsCount = await Report.countDocuments({});
        const logsCount = await Log.countDocuments({});

        console.log('\n📊 Planned deletions:');
        console.log(`- Other users: ${otherUsersCount}`);
        console.log(`- All costs: ${costsCount}`);
        console.log(`- All reports: ${reportsCount}`);
        console.log(`- All logs: ${logsCount}`);

        if (dryRun) {
            console.log('\n🧪 DRY-RUN: No changes were made.');
            return;
        }

        if (!confirm) {
            console.log('\n❓ No --yes flag provided. Aborting without changes.');
            console.log('   Re-run with --yes to apply deletions, or --dry to preview.');
            return;
        }

        // Apply deletions
        const delUsers = await User.deleteMany({ id: { $ne: targetId } });
        const delCosts = await Cost.deleteMany({});
        const delReports = await Report.deleteMany({});
        const delLogs = await Log.deleteMany({});

        console.log('\n🧹 Deletions applied:');
        console.log(`- Other users removed: ${delUsers.deletedCount}`);
        console.log(`- Costs removed: ${delCosts.deletedCount}`);
        console.log(`- Reports removed: ${delReports.deletedCount}`);
        console.log(`- Logs removed: ${delLogs.deletedCount}`);

        console.log('\n✅ Cleanup complete. Database now contains only the required user.');
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
})();

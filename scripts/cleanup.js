'use strict';

/**
 * Cleanup script for the Cost Manager project.
 * Usage examples:
 *   node scripts/cleanup.js --id=123123 --first=mosh --last=israeli --birthday=1990-01-01 --yes
 *   node scripts/cleanup.js --dry                # preview only (no deletions)
 */

require('dotenv').config();

const mongoose = require('mongoose');

// Require your existing models
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const Log = require('../src/models/Log');
const Report = require('../src/models/Report');

function parseArgs(argv) {
    const args = {};
    for (const part of argv.slice(2)) {
        if (part.startsWith('--')) {
            const [k, v] = part.replace(/^--/, '').split('=');
            args[k] = v === undefined ? true : v;
        }
    }
    return args;
}

(async () => {
    const args = parseArgs(process.argv);

    const MONGODB_URI =
        process.env.MONGODB_URI ||
        process.env.TEST_MONGODB_URI;

    if (!MONGODB_URI) {
        console.error('❌ Missing MONGODB_URI (or TEST_MONGODB_URI) in environment.');
        process.exit(1);
    }

    const targetId = Number(args.id || 123123);
    const first = args.first || 'mosh';
    const last = args.last || 'israeli';
    const birthdayStr = args.birthday || '1990-01-01';
    const dryRun = !!args.dry;
    const confirm = !!args.yes;

    console.log('➡️  Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    try {
        // Ensure the target user exists (upsert)
        const existing = await User.findOne({ id: targetId }).lean();
        if (!existing) {
            if (dryRun) {
                console.log(`DRY-RUN: would create user { id: ${targetId}, first_name: ${first}, last_name: ${last}, birthday: ${birthdayStr} }`);
            } else {
                await User.create({
                    id: targetId,
                    first_name: first,
                    last_name: last,
                    birthday: new Date(birthdayStr)
                });
                console.log(`👤 Created missing user id=${targetId}`);
            }
        } else {
            console.log(`👤 User id=${targetId} already exists; will keep it.`);
        }

        // Count what will be deleted
        const otherUsersCount = await User.countDocuments({ id: { $ne: targetId } });
        const costsCount = await Cost.countDocuments({});
        const logsCount = await Log.countDocuments({});
        const reportsCount = await Report.countDocuments({});

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

        console.log('\n✅ Cleanup complete. Database now contains only the required test user.');
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
})();

/*
how to run in console
Preview (no changes):
    node scripts/cleanup.js --dry
Apply deletions (with defaults: keep user 123123 mosh israeli):
    node scripts/cleanup.js --yes
Apply with custom identity (if needed):
    node scripts/cleanup.js --id=123123 --first=mosh --last=israeli --birthday=1990-01-01 --yes
*/

/*
How it works:
Loads the MONGODB_URI from .env.
Ensures the required user exists (creates if missing).
Counts items to be removed; shows a summary.
If --dry → stops there.
If --yes → deletes all costs, reports, logs, and any users whose id !== targetId.
*/
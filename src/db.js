'use strict';

const mongoose = require('mongoose');

async function connect(uri) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    return mongoose.connection;
}

module.exports = { connect };

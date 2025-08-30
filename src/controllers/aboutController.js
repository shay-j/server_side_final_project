'use strict';

// Replace with your real team names
const TEAM = [
    { first_name: 'mosh', last_name: 'israeli' }
];

async function about(req, res) {
    res.json(TEAM.map(({ first_name, last_name }) => ({ first_name, last_name })));
}

module.exports = { about };

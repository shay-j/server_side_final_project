// src/utils/responses.js
'use strict';

/*
 * Uniform HTTP response helpers
 * - This version removes the "ok": true wrapper.
 * - Success responses return only { data: ... }.
 * - Error helpers return { message: ... }.
 */

/* 200 OK — return data payload only */
function ok(res, data) {
    return res.status(200).json({ data });
}

/* 201 Created — return created resource as data payload only */
function created(res, data) {
    return res.status(201).json({ data });
}

/* 404 Not Found — standard error shape */
function notFound(res, message = 'Not Found') {
    return res.status(404).json({ message });
}

/* Optionally export more helpers if you use them elsewhere */
// function badRequest(res, message = 'Bad Request') {
//   return res.status(400).json({ message });
// }

module.exports = { ok, created, notFound /*, badRequest */ };

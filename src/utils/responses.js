function ok(res, data)        { return res.status(200).json({ ok: true, data }); }
function created(res, data)   { return res.status(201).json({ ok: true, data }); }
function notFound(res, msg)   { return res.status(404).json({ message: msg || 'Not Found' }); }
function conflict(res, msg)   { return res.status(409).json({ message: msg || 'Conflict' }); }

module.exports = { ok, created, notFound, conflict };

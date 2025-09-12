'use strict';

// Date helpers: month boundaries & validation

// First day of month @ 00:00
function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

// Last day of month @ 23:59:59.999
function endOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

// True if input date is before current month start
function isPastMonth(input) {
    const dt = new Date(input);
    if (Number.isNaN(dt.getTime())) return false; // invalid date -> handled elsewhere
    return dt < startOfMonth(new Date());
}

module.exports = { startOfMonth, endOfMonth, isPastMonth };

'use strict';

function isPastDate(date) {
    const d = new Date(date);
    const now = new Date();
    return d.getTime() < now.getTime();
}
function startOfMonth(year, month1to12) {
    return new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0, 0));
}
function endOfMonth(year, month1to12) {
    return new Date(Date.UTC(year, month1to12, 0, 23, 59, 59, 999));
}
function isPastMonthYear(year, month1to12) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    if (year < y) return true;
    if (year > y) return false;
    return month1to12 < m;
}
module.exports = { isPastDate, startOfMonth, endOfMonth, isPastMonthYear };

// Date helpers
function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
// Block past-month costs: true if the date is strictly before current month start.
function isPastMonth(input) {
    const dt = new Date(input);
    if (Number.isNaN(dt.getTime())) return false; // let schema catch invalid dates
    return dt < startOfMonth(new Date());
}

module.exports = { startOfMonth, endOfMonth, isPastMonth };

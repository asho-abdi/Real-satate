/**
 * Local overlap / night-rule checks for the guest calendar engine.
 * Run: node backend/scripts/test-booking-calendar-overlap.mjs
 */
import assert from 'node:assert/strict';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function overlaps(aIn, aOut, bIn, bOut) {
  const aStart = startOfDay(aIn);
  const aEnd = startOfDay(aOut);
  const bStart = startOfDay(bIn);
  const bEnd = startOfDay(bOut);
  return aStart < bEnd && aEnd > bStart;
}

// Same room: Guest A Nov 1–3, Guest B may start on Nov 3 checkout day
assert.equal(overlaps('2026-11-01', '2026-11-03', '2026-11-03', '2026-11-05'), false);
// Overlap one night
assert.equal(overlaps('2026-11-01', '2026-11-03', '2026-11-02', '2026-11-04'), true);
// Exact same stay
assert.equal(overlaps('2026-11-01', '2026-11-03', '2026-11-01', '2026-11-03'), true);
// Adjacent before
assert.equal(overlaps('2026-11-01', '2026-11-03', '2026-10-28', '2026-11-01'), false);
// Contained
assert.equal(overlaps('2026-11-01', '2026-11-10', '2026-11-03', '2026-11-05'), true);

console.log('overlap_night_rules_ok');

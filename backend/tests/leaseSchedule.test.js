import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthsKey,
  buildLeaseSchedule,
  chargeableUnpaidMonths,
  isRentFreeMonth,
  leaseMonthKeys,
  money,
} from '../src/services/leaseSchedule.service.js';

const asOf = '2026-11-22T12:00:00+03:00';

test('Scenario A/G: historical lease uses leaseStart, not registration date', () => {
  const schedule = buildLeaseSchedule(
    {
      leaseStart: '2025-01-01',
      leaseEnd: '2026-01-01',
      createdAt: '2026-11-22',
      monthlyRent: 300,
      discount: 0,
    },
    [],
    { asOf },
  );
  assert.equal(schedule.registeredAt, '2026-11-22');
  assert.equal(String(schedule.leaseStart).slice(0, 10), '2025-01-01');
  assert.equal(schedule.periods[0].month, '2025-01');
  assert.equal(schedule.periods.length, 12);
  assert.equal(schedule.periods[11].month, '2025-12');
  assert.equal(schedule.summary.expectedRent, 3600);
  assert.ok(schedule.summary.outstanding >= 300);
  assert.equal(schedule.periods.filter((p) => p.status === 'OVERDUE').length, 12);
});

test('open-ended historical lease through as-of is not truncated to registration month', () => {
  const keys = leaseMonthKeys({
    leaseStart: '2025-01-01',
    throughMonth: '2026-11',
  });
  assert.equal(keys[0], '2025-01');
  assert.equal(keys[keys.length - 1], '2026-11');
  assert.equal(keys.length, 23);
});

test('Scenario C: first three months rent-free, rent starts April', () => {
  const schedule = buildLeaseSchedule(
    {
      leaseStart: '2025-01-01',
      leaseEnd: '2026-01-01',
      monthlyRent: 300,
      rentFreeMonths: 3,
    },
    [],
    { asOf },
  );
  assert.equal(schedule.periods[0].status, 'RENT_FREE');
  assert.equal(schedule.periods[0].amountDue, 0);
  assert.equal(schedule.periods[0].amountPaid, 0);
  assert.equal(schedule.periods[2].month, '2025-03');
  assert.equal(schedule.periods[2].isRentFree, true);
  assert.equal(schedule.periods[3].month, '2025-04');
  assert.equal(schedule.periods[3].amountDue, 300);
  assert.equal(schedule.summary.rentFreeCount, 3);
  assert.equal(schedule.summary.expectedRent, 2700);
});

test('rent-free months are not treated as paid', () => {
  assert.equal(isRentFreeMonth('2025-01', '2025-01-01', 3), true);
  assert.equal(isRentFreeMonth('2025-03', '2025-01-01', 3), true);
  assert.equal(isRentFreeMonth('2025-04', '2025-01-01', 3), false);
});

test('Scenario B: six-month advance allocates to next chargeable periods', () => {
  const base = buildLeaseSchedule(
    { leaseStart: '2025-01-01', leaseEnd: '2026-01-01', monthlyRent: 300 },
    [],
    { asOf: '2025-01-15T12:00:00+03:00' },
  );
  const targets = chargeableUnpaidMonths(base, 6);
  assert.equal(targets.length, 6);
  assert.equal(targets[0].month, '2025-01');
  assert.equal(money(targets.reduce((s, p) => s + p.outstanding, 0)), 1800);

  const paidRows = targets.map((p) => ({
    month: p.month,
    amountDue: 300,
    amountPaid: 300,
    isAdvance: true,
    status: 'PAID',
  }));
  const after = buildLeaseSchedule(
    { leaseStart: '2025-01-01', leaseEnd: '2026-01-01', monthlyRent: 300 },
    paidRows,
    { asOf: '2025-01-15T12:00:00+03:00' },
  );
  assert.equal(after.periods.filter((p) => p.status === 'ADVANCE_PAID').length, 6);
  assert.equal(after.summary.paidThrough, '2025-06');
  assert.equal(after.summary.nextDueMonth, '2025-07');
  assert.equal(after.summary.collected, 1800);
});

test('Scenario D: advance starts after rent-free months', () => {
  const schedule = buildLeaseSchedule(
    {
      leaseStart: '2025-01-01',
      leaseEnd: '2026-01-01',
      monthlyRent: 300,
      rentFreeMonths: 2,
    },
    [],
    { asOf: '2025-03-01T12:00:00+03:00' },
  );
  const targets = chargeableUnpaidMonths(schedule, 6);
  assert.equal(targets[0].month, '2025-03');
  assert.equal(targets.length, 6);
  assert.ok(schedule.periods[0].isRentFree);
  assert.ok(schedule.periods[1].isRentFree);
});

test('Scenario E: partial payment leaves remainder', () => {
  const schedule = buildLeaseSchedule(
    { leaseStart: '2025-01-01', leaseEnd: '2026-01-01', monthlyRent: 300 },
    [{ month: '2025-01', amountDue: 300, amountPaid: 200, status: 'PARTIAL' }],
    { asOf: '2025-01-20T12:00:00+03:00' },
  );
  assert.equal(schedule.periods[0].status, 'PARTIAL');
  assert.equal(schedule.periods[0].outstanding, 100);
  assert.equal(schedule.periods[0].amountPaid, 200);
});

test('Scenario F: renewal is a new term; old months stay on prior lease object', () => {
  const prior = buildLeaseSchedule(
    {
      leaseStart: '2025-01-01',
      leaseEnd: '2026-01-01',
      monthlyRent: 300,
      status: 'ENDED',
    },
    [{ month: '2025-12', amountDue: 300, amountPaid: 300, status: 'PAID' }],
    { asOf: '2026-01-02T12:00:00+03:00' },
  );
  const next = buildLeaseSchedule(
    { leaseStart: '2026-01-01', leaseEnd: '2027-01-01', monthlyRent: 350 },
    [],
    { asOf: '2026-01-02T12:00:00+03:00' },
  );
  assert.equal(prior.periods.length, 12);
  assert.equal(prior.periods.find((p) => p.month === '2025-12').amountPaid, 300);
  assert.equal(next.periods[0].month, '2026-01');
  assert.equal(next.monthlyRent, 350);
  assert.ok(!next.periods.some((p) => p.month === '2025-12'));
});

test('addMonthsKey crosses years', () => {
  assert.equal(addMonthsKey('2025-11', 2), '2026-01');
});

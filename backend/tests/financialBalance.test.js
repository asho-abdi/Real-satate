import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLeaseFinancials, money } from '../src/services/financialBalance.service.js';

test('money rounds to cents', () => {
  assert.equal(money(10.006), 10.01);
  assert.equal(money(null), 0);
});

test('does not double-count embedded otherCharges in totalDue', () => {
  const { financials } = computeLeaseFinancials(
    [
      {
        amountDue: 12000,
        amountPaid: 5000,
        rentDue: 10000,
        otherCharges: 2000,
        status: 'PARTIAL',
      },
    ],
    [
      {
        amountDue: 1500,
        amountPaid: 0,
        status: 'UNPAID',
        deletedAt: null,
      },
    ],
  );

  // amountDue already includes embedded 2000; LeaseCharge adds 1500 once
  assert.equal(financials.totalDue, 13500);
  assert.equal(financials.embeddedOtherCharges, 2000);
  assert.equal(financials.otherChargesDue, 1500);
  assert.equal(financials.outstanding, 8500);
  assert.equal(financials.rentDue, 10000);
});

test('outstanding never negative when overpaid', () => {
  const { financials } = computeLeaseFinancials(
    [{ amountDue: 1000, amountPaid: 1500, otherCharges: 0, status: 'PAID' }],
    [],
  );
  assert.equal(financials.outstanding, 0);
});

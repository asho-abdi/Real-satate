/**
 * Verifies guest booking nightly × nights math (BK-1013 style) and accrual.
 */
import {
  periodBookingTotal,
  bookingAccommodationFinancials,
  nightsOccupied,
  roundMoney,
} from '../src/utils/rent.js';

function assertEq(label, actual, expected) {
  const a = roundMoney(actual);
  const e = roundMoney(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: got ${a}, expected ${e}`);
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label}: ${a}`);
  }
}

// BK-1013: Monthly category, nightly rate 2833.33, 33 nights
const checkIn = '2026-11-28';
const checkOut = '2026-12-31';
const nightly = 2833.33;

const totals = periodBookingTotal({
  monthlyRent: nightly * 30,
  bookingPeriod: 'MONTHLY',
  periodRate: nightly,
  checkIn,
  checkOut,
});

assertEq('expected nights', totals.nights, 33);
assertEq('nightly rate', totals.nightlyRate, nightly);
assertEq('33 × 2833.33', totals.totalAmount, 93499.89);

const samples = [
  [1, 2833.33],
  [2, 5666.66],
  [3, 8499.99],
  [7, 19833.31],
  [15, 42499.95],
  [30, 84999.9],
  [33, 93499.89],
];
for (const [nights, expected] of samples) {
  assertEq(`${nights} nights accrued`, roundMoney(nightly * nights), expected);
}

// Accrual: before check-in → 0
const before = bookingAccommodationFinancials({
  periodRate: nightly,
  nights: 33,
  checkIn,
  checkOut,
  status: 'CONFIRMED',
  amountPaid: 0,
}, { now: new Date('2026-11-20T12:00:00Z') });
assertEq('pre-check-in nights stayed', before.nightsStayed, 0);
assertEq('pre-check-in accrued', before.accruedAccommodation, 0);

// Accrual: day of check-in → 1 night
const day1 = bookingAccommodationFinancials({
  periodRate: nightly,
  nights: 33,
  checkIn,
  checkOut,
  status: 'CHECKED_IN',
  amountPaid: 0,
}, { now: new Date('2026-11-28T15:00:00+03:00') });
assertEq('check-in day nights', day1.nightsStayed, 1);
assertEq('check-in day accrued', day1.accruedAccommodation, 2833.33);

// Deposit must not reduce accommodation outstanding
assertEq(
  'outstanding ignores deposit',
  day1.outstandingAccrued,
  2833.33,
);

// After checkout → full stay
const done = bookingAccommodationFinancials({
  periodRate: nightly,
  nights: 33,
  checkIn,
  checkOut,
  status: 'CHECKED_OUT',
  amountPaid: 50000,
}, { now: new Date('2027-01-02T12:00:00Z') });
assertEq('checked-out nights', done.nightsStayed, 33);
assertEq('checked-out accrued', done.accruedAccommodation, 93499.89);
assertEq('outstanding after partial pay', done.outstandingExpected, 43499.89);

const occupied = nightsOccupied({
  checkIn,
  checkOut,
  status: 'CHECKED_IN',
  now: new Date('2026-12-12T10:00:00+03:00'),
});
assertEq('mid-stay nights occupied', occupied, 15);

if (process.exitCode) {
  console.error('\nBooking financial verification FAILED');
} else {
  console.log('\nBooking financial verification PASSED');
}

/**
 * Guest booking money helpers.
 * Accommodation is always: nightlyRate × nights (Daily / Weekly / Monthly are categories).
 */

/** Round to 2 decimal places (decimal-safe for currency). */
export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Daily rent from monthly (always ÷ 30), rounded to 2 decimals.
 */
export function dailyRent(monthly) {
  return roundMoney(Number(monthly) / 30);
}

/**
 * Weekly rent from monthly (× 7 / 30) unless an override is provided.
 */
export function weeklyRent(monthly, override = null) {
  if (override !== null && override !== undefined && override !== '') {
    return roundMoney(override);
  }
  return roundMoney((Number(monthly) / 30) * 7);
}

/**
 * Night count between check-in and check-out (exclusive of check-out day).
 */
export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** Start of calendar day in a timezone (Africa/Nairobi default). */
export function startOfDayInZone(date = new Date(), timeZone = 'Africa/Nairobi') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

/**
 * Resolve the nightly accommodation rate for a guest booking category.
 * MONTHLY / WEEKLY / DAILY keep their category labels, but charges use a nightly rate.
 */
export function resolveNightlyRate({
  bookingPeriod = 'DAILY',
  monthlyRent,
  dailyRate = null,
  weeklyRate = null,
  periodRateOverride = null,
} = {}) {
  if (periodRateOverride !== null && periodRateOverride !== undefined && periodRateOverride !== '') {
    return roundMoney(periodRateOverride);
  }
  const period = String(bookingPeriod || 'DAILY').toUpperCase();
  const daily =
    dailyRate != null && dailyRate !== '' ? roundMoney(dailyRate) : dailyRent(monthlyRent);
  if (period === 'WEEKLY' && weeklyRate != null && weeklyRate !== '') {
    return roundMoney(Number(weeklyRate) / 7);
  }
  // MONTHLY and DAILY (and WEEKLY without weekly override): use nightly rate
  return daily;
}

/**
 * Nights actually occupied so far (does not charge future nights).
 * On the check-in calendar day, 1 night accrues once the guest has checked in.
 * After checkout, uses the full stay nights.
 */
export function nightsOccupied({
  checkIn,
  checkOut,
  status,
  now = new Date(),
  timeZone = 'Africa/Nairobi',
} = {}) {
  const st = String(status || '').toUpperCase();
  if (st === 'CANCELLED') return 0;
  const expected = nightsBetween(checkIn, checkOut);
  if (expected <= 0) return 0;

  const checkInDay = startOfDayInZone(checkIn, timeZone);
  const checkOutDay = startOfDayInZone(checkOut, timeZone);
  const today = startOfDayInZone(now, timeZone);

  if (st === 'CONFIRMED' && today < checkInDay) return 0;
  if (st === 'CHECKED_OUT' || today >= checkOutDay) return expected;

  // Accrue through tonight: end exclusive = tomorrow (or checkout if sooner)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const end = tomorrow < checkOutDay ? tomorrow : checkOutDay;
  if (end <= checkInDay) return 0;
  return Math.min(expected, nightsBetween(checkInDay, end));
}

/**
 * Booking total from monthly rent and stay dates (daily billing) — legacy helper.
 */
export function bookingTotal(monthly, checkIn, checkOut, discount = 0) {
  const nights = nightsBetween(checkIn, checkOut);
  const daily = dailyRent(monthly);
  const subtotal = roundMoney(daily * nights);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const totalAmount = roundMoney(subtotal - disc);
  return { nights, dailyRent: daily, subtotal, discount: disc, totalAmount };
}

/**
 * Apply fixed or percent discount to a subtotal.
 */
export function applyBookingDiscount(subtotal, discountType = 'FIXED', discountValue = 0) {
  const originalAmount = roundMoney(subtotal);
  const type = String(discountType || 'FIXED').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const value = Math.max(0, Number(discountValue) || 0);
  let discount = 0;
  if (type === 'PERCENT') {
    discount = roundMoney(originalAmount * (Math.min(value, 100) / 100));
  } else {
    discount = Math.min(value, originalAmount);
  }
  const totalAmount = roundMoney(originalAmount - discount);
  return { originalAmount, discountType: type, discountValue: value, discount, totalAmount };
}

/**
 * Guest booking total for Daily / Weekly / Monthly.
 * Accommodation = nightlyRate × nights (period is a category, not a package multiplier).
 */
export function periodBookingTotal({
  monthlyRent,
  dailyRate = null,
  weeklyRate = null,
  bookingPeriod = 'DAILY',
  periodQuantity, // ignored for amount — kept for API compat; quantity becomes nights
  periodRate: periodRateOverride = null,
  checkIn,
  checkOut,
  discount = 0,
  discountType = 'FIXED',
  discountValue = null,
  servicesAmount = 0,
  taxesAmount = 0,
}) {
  const period = String(bookingPeriod || 'DAILY').toUpperCase();
  const nights = nightsBetween(checkIn, checkOut);
  const nightlyRate = resolveNightlyRate({
    bookingPeriod: period,
    monthlyRent,
    dailyRate,
    weeklyRate,
    periodRateOverride,
  });
  const quantity = Math.max(0, nights);
  const subtotal = roundMoney(nightlyRate * quantity);
  const discInput =
    discountValue !== null && discountValue !== undefined && discountValue !== ''
      ? discountValue
      : discount;
  const applied = applyBookingDiscount(subtotal, discountType, discInput);
  const services = Math.max(0, Number(servicesAmount) || 0);
  const taxes = Math.max(0, Number(taxesAmount) || 0);
  const totalAmount = roundMoney(applied.totalAmount + services + taxes);

  return {
    bookingPeriod: period,
    periodRate: nightlyRate,
    periodQuantity: quantity || Number(periodQuantity) || 0,
    nights: quantity,
    dailyRent: nightlyRate,
    nightlyRate,
    subtotal,
    servicesAmount: services,
    taxesAmount: taxes,
    ...applied,
    totalAmount,
  };
}

/**
 * Live financial snapshot for a booking (accrual + payments).
 * Deposits must be passed separately and are never treated as accommodation revenue.
 */
export function bookingAccommodationFinancials(booking, { now = new Date(), timeZone = 'Africa/Nairobi' } = {}) {
  const nightlyRate = roundMoney(
    booking.periodRate ?? booking.dailyRent ?? dailyRent(booking.monthlyRent),
  );
  const expectedNights = Math.max(
    0,
    Number(booking.nights) || nightsBetween(booking.checkIn, booking.checkOut),
  );
  const stayed = nightsOccupied({
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    now,
    timeZone,
  });
  const services = roundMoney(booking.servicesAmount);
  const taxes = roundMoney(booking.taxesAmount);
  const discount = roundMoney(booking.discount);

  const accruedLodging = roundMoney(nightlyRate * stayed);
  const expectedLodging = roundMoney(nightlyRate * expectedNights);
  // Spread discount proportionally across expected stay for accrued view
  const discountShare =
    expectedLodging > 0 ? roundMoney(discount * (accruedLodging / expectedLodging)) : 0;
  const accruedAccommodation = roundMoney(
    Math.max(0, accruedLodging - discountShare) + (stayed > 0 ? services + taxes : 0),
  );
  // Expected full-stay total (matches stored total when pricing is consistent)
  const expectedAccommodation = roundMoney(Math.max(0, expectedLodging - discount) + services + taxes);

  const accommodationPaid = roundMoney(booking.amountPaid);
  const outstandingAccrued = roundMoney(Math.max(0, accruedAccommodation - accommodationPaid));
  const outstandingExpected = roundMoney(Math.max(0, expectedAccommodation - accommodationPaid));

  return {
    bookingPeriod: booking.bookingPeriod || 'DAILY',
    nightlyRate,
    ratePerNight: nightlyRate,
    expectedNights,
    nightsStayed: stayed,
    accruedLodging,
    expectedLodging,
    accruedAccommodation,
    expectedAccommodation,
    accommodationPaid,
    outstandingAccrued,
    outstandingExpected,
    servicesAmount: services,
    taxesAmount: taxes,
    discount,
  };
}

export function summarizeDeposit(deposit) {
  if (!deposit) {
    return {
      received: 0,
      held: 0,
      refunded: 0,
      deducted: 0,
      remaining: 0,
      status: null,
    };
  }
  const received = roundMoney(deposit.amount);
  const refunded = roundMoney(deposit.returnedAmount);
  const deducted = roundMoney(deposit.deductedAmount);
  const remaining = roundMoney(
    deposit.remainingAmount != null
      ? deposit.remainingAmount
      : Math.max(0, received - refunded - deducted),
  );
  return {
    id: deposit.id,
    received,
    held: remaining,
    refunded,
    deducted,
    remaining,
    status: deposit.status,
  };
}

export function derivePaymentStatus(amountPaid, totalAmount) {
  const paid = Number(amountPaid) || 0;
  const total = Number(totalAmount) || 0;
  if (paid <= 0) return 'UNPAID';
  if (paid + 0.001 >= total) return 'PAID';
  return 'PARTIAL';
}

/** Current month key YYYY-MM */
export function currentMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default {
  roundMoney,
  dailyRent,
  weeklyRent,
  nightsBetween,
  startOfDayInZone,
  resolveNightlyRate,
  nightsOccupied,
  bookingTotal,
  periodBookingTotal,
  applyBookingDiscount,
  bookingAccommodationFinancials,
  summarizeDeposit,
  derivePaymentStatus,
  currentMonthKey,
};

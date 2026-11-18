/** Guest booking money helpers — mirrors backend/src/utils/rent.js */

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Daily rent from monthly rent (always ÷ 30). */
export function calcDailyRent(monthlyRent) {
  const monthly = Number(monthlyRent) || 0;
  return roundMoney(monthly / 30);
}

export function calcWeeklyRent(monthlyRent, override = null) {
  if (override !== null && override !== undefined && override !== '') {
    return roundMoney(override);
  }
  return roundMoney((Number(monthlyRent) / 30) * 7);
}

/** Night count between two YYYY-MM-DD dates (checkout day exclusive). */
export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${String(checkIn).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(checkOut).slice(0, 10)}T00:00:00`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function resolveNightlyRate({
  bookingPeriod = 'DAILY',
  monthlyRent,
  dailyRate = null,
  weeklyRate = null,
  periodRate = null,
} = {}) {
  if (periodRate !== null && periodRate !== undefined && periodRate !== '') {
    return roundMoney(periodRate);
  }
  const period = String(bookingPeriod || 'DAILY').toUpperCase();
  const daily =
    dailyRate != null && dailyRate !== '' ? roundMoney(dailyRate) : calcDailyRent(monthlyRent);
  if (period === 'WEEKLY' && weeklyRate != null && weeklyRate !== '') {
    return roundMoney(Number(weeklyRate) / 7);
  }
  return daily;
}

export function calcNightsOccupied({ checkIn, checkOut, status, now = new Date() } = {}) {
  const st = String(status || '').toUpperCase();
  if (st === 'CANCELLED') return 0;
  const expected = calcNights(checkIn, checkOut);
  if (expected <= 0) return 0;

  const toDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const checkInDay = toDay(checkIn);
  const checkOutDay = toDay(checkOut);
  const today = toDay(now);

  if (st === 'CONFIRMED' && today < checkInDay) return 0;
  if (st === 'CHECKED_OUT' || today >= checkOutDay) return expected;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const end = tomorrow < checkOutDay ? tomorrow : checkOutDay;
  if (end <= checkInDay) return 0;
  return Math.min(expected, calcNights(checkInDay, end));
}

export function calcBookingTotal({ monthlyRent, checkIn, checkOut, discount = 0 }) {
  const nights = calcNights(checkIn, checkOut);
  const dailyRent = calcDailyRent(monthlyRent);
  const subtotal = roundMoney(dailyRent * nights);
  const discountAmount = Math.min(Number(discount) || 0, subtotal);
  const total = roundMoney(subtotal - discountAmount);
  return { nights, dailyRent, subtotal, discountAmount, total };
}

/**
 * Daily / Weekly / Monthly guest booking totals.
 * Accommodation = nightlyRate × nights (period is a category label).
 */
export function calcPeriodBookingTotal({
  monthlyRent,
  dailyRate = null,
  weeklyRate = null,
  bookingPeriod = 'DAILY',
  periodQuantity,
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
  const nights = calcNights(checkIn, checkOut);
  const nightlyRate = resolveNightlyRate({
    bookingPeriod: period,
    monthlyRent,
    dailyRate,
    weeklyRate,
    periodRate: periodRateOverride,
  });
  const quantity = Math.max(0, nights);
  const originalAmount = roundMoney(nightlyRate * quantity);
  const type = String(discountType || 'FIXED').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const value =
    discountValue !== null && discountValue !== undefined && discountValue !== ''
      ? Math.max(0, Number(discountValue) || 0)
      : Math.max(0, Number(discount) || 0);
  let discountAmount = 0;
  if (type === 'PERCENT') {
    discountAmount = roundMoney(originalAmount * (Math.min(value, 100) / 100));
  } else {
    discountAmount = Math.min(value, originalAmount);
  }
  const services = Math.max(0, Number(servicesAmount) || 0);
  const taxes = Math.max(0, Number(taxesAmount) || 0);
  const afterDiscount = roundMoney(originalAmount - discountAmount);
  const total = roundMoney(afterDiscount + services + taxes);

  return {
    bookingPeriod: period,
    periodRate: nightlyRate,
    periodQuantity: quantity || Number(periodQuantity) || 0,
    nights: quantity,
    dailyRent: nightlyRate,
    nightlyRate,
    weeklyRent: calcWeeklyRent(monthlyRent, weeklyRate),
    originalAmount,
    discountType: type,
    discountValue: value,
    discountAmount,
    servicesAmount: services,
    taxesAmount: taxes,
    subtotal: originalAmount,
    total,
  };
}

export function calcBookingFinancials(booking, { now = new Date() } = {}) {
  const nightlyRate = roundMoney(
    booking.periodRate ?? booking.dailyRent ?? calcDailyRent(booking.monthlyRent),
  );
  const expectedNights = Math.max(
    0,
    Number(booking.nights) || calcNights(booking.checkIn, booking.checkOut),
  );
  const nightsStayed = calcNightsOccupied({
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    now,
  });
  const services = roundMoney(booking.servicesAmount);
  const taxes = roundMoney(booking.taxesAmount);
  const discount = roundMoney(booking.discount ?? booking.discountAmount);
  const accruedLodging = roundMoney(nightlyRate * nightsStayed);
  const expectedLodging = roundMoney(nightlyRate * expectedNights);
  const discountShare =
    expectedLodging > 0 ? roundMoney(discount * (accruedLodging / expectedLodging)) : 0;
  const accruedAccommodation = roundMoney(
    Math.max(0, accruedLodging - discountShare) + (nightsStayed > 0 ? services + taxes : 0),
  );
  const expectedAccommodation = roundMoney(Math.max(0, expectedLodging - discount) + services + taxes);
  const accommodationPaid = roundMoney(booking.amountPaid);
  return {
    bookingPeriod: booking.bookingPeriod || booking.bookingPeriodLabel || 'DAILY',
    nightlyRate,
    ratePerNight: nightlyRate,
    expectedNights,
    nightsStayed,
    accruedAccommodation,
    expectedAccommodation,
    accommodationPaid,
    outstandingAccrued: roundMoney(Math.max(0, accruedAccommodation - accommodationPaid)),
    outstandingExpected: roundMoney(Math.max(0, expectedAccommodation - accommodationPaid)),
  };
}

export function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function lastNMonths(n = 12) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    });
  }
  return out;
}

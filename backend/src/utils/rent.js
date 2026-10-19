/**
 * Daily rent from monthly (always ÷ 30), rounded to 2 decimals.
 * @param {number|string|import('@prisma/client/runtime/library').Decimal} monthly
 * @returns {number}
 */
export function dailyRent(monthly) {
  return Math.round((Number(monthly) / 30) * 100) / 100;
}

/**
 * Weekly rent from monthly (× 7 / 30) unless an override is provided.
 */
export function weeklyRent(monthly, override = null) {
  if (override !== null && override !== undefined && override !== '') {
    return Math.round(Number(override) * 100) / 100;
  }
  return Math.round((Number(monthly) / 30) * 7 * 100) / 100;
}

/**
 * Night count between check-in and check-out (exclusive of check-out day).
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @returns {number}
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

/**
 * Booking total from monthly rent and stay dates (daily billing).
 */
export function bookingTotal(monthly, checkIn, checkOut, discount = 0) {
  const nights = nightsBetween(checkIn, checkOut);
  const daily = dailyRent(monthly);
  const subtotal = Math.round(daily * nights * 100) / 100;
  const disc = Math.min(Number(discount) || 0, subtotal);
  const totalAmount = Math.round((subtotal - disc) * 100) / 100;
  return { nights, dailyRent: daily, subtotal, discount: disc, totalAmount };
}

/**
 * Apply fixed or percent discount to a subtotal.
 * @returns {{ originalAmount: number, discountType: string, discountValue: number, discount: number, totalAmount: number }}
 */
export function applyBookingDiscount(subtotal, discountType = 'FIXED', discountValue = 0) {
  const originalAmount = Math.round(Number(subtotal) * 100) / 100;
  const type = String(discountType || 'FIXED').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const value = Math.max(0, Number(discountValue) || 0);
  let discount = 0;
  if (type === 'PERCENT') {
    discount = Math.round(originalAmount * (Math.min(value, 100) / 100) * 100) / 100;
  } else {
    discount = Math.min(value, originalAmount);
  }
  const totalAmount = Math.round((originalAmount - discount) * 100) / 100;
  return { originalAmount, discountType: type, discountValue: value, discount, totalAmount };
}

/**
 * Guest booking total for Daily / Weekly / Monthly periods.
 */
export function periodBookingTotal({
  monthlyRent,
  dailyRate = null,
  weeklyRate = null,
  bookingPeriod = 'DAILY',
  periodQuantity,
  checkIn,
  checkOut,
  discount = 0,
  discountType = 'FIXED',
  discountValue = null,
}) {
  const period = String(bookingPeriod || 'DAILY').toUpperCase();
  const nights = nightsBetween(checkIn, checkOut);
  const daily = dailyRate != null && dailyRate !== '' ? Number(dailyRate) : dailyRent(monthlyRent);
  const weekly = weeklyRent(monthlyRent, weeklyRate);
  const monthly = Number(monthlyRent) || 0;

  let rate = daily;
  let quantity = Number(periodQuantity);

  if (period === 'WEEKLY') {
    rate = weekly;
    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = Math.max(1, Math.ceil(nights / 7));
    }
  } else if (period === 'MONTHLY') {
    rate = monthly;
    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = Math.max(1, Math.ceil(nights / 30));
    }
  } else {
    rate = daily;
    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = Math.max(1, nights);
    }
  }

  const subtotal = Math.round(rate * quantity * 100) / 100;
  const discInput =
    discountValue !== null && discountValue !== undefined && discountValue !== ''
      ? discountValue
      : discount;
  const applied = applyBookingDiscount(subtotal, discountType, discInput);

  return {
    bookingPeriod: period,
    periodRate: rate,
    periodQuantity: quantity,
    nights: nights || quantity,
    dailyRent: daily,
    subtotal,
    ...applied,
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
  dailyRent,
  weeklyRent,
  nightsBetween,
  bookingTotal,
  periodBookingTotal,
  applyBookingDiscount,
  derivePaymentStatus,
  currentMonthKey,
};

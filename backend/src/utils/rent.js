/**
 * Daily rent from monthly (always ÷ 30), rounded to 2 decimals.
 * @param {number|string|import('@prisma/client/runtime/library').Decimal} monthly
 * @returns {number}
 */
export function dailyRent(monthly) {
  return Math.round((Number(monthly) / 30) * 100) / 100;
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
 * Booking total from monthly rent and stay dates.
 * @param {number|string} monthly
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @param {number} [discount=0]
 * @returns {{ nights: number, dailyRent: number, subtotal: number, discount: number, totalAmount: number }}
 */
export function bookingTotal(monthly, checkIn, checkOut, discount = 0) {
  const nights = nightsBetween(checkIn, checkOut);
  const daily = dailyRent(monthly);
  const subtotal = Math.round(daily * nights * 100) / 100;
  const disc = Math.min(Number(discount) || 0, subtotal);
  const totalAmount = Math.round((subtotal - disc) * 100) / 100;
  return { nights, dailyRent: daily, subtotal, discount: disc, totalAmount };
}

/** Current month key YYYY-MM */
export function currentMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default { dailyRent, nightsBetween, bookingTotal, currentMonthKey };

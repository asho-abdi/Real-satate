/** Daily rent from monthly rent (always ÷ 30). */
export function calcDailyRent(monthlyRent) {
  const monthly = Number(monthlyRent) || 0;
  return Math.round((monthly / 30) * 100) / 100;
}

/** Night count between two YYYY-MM-DD dates (checkout day exclusive). */
export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function calcBookingTotal({ monthlyRent, checkIn, checkOut, discount = 0 }) {
  const nights = calcNights(checkIn, checkOut);
  const dailyRent = calcDailyRent(monthlyRent);
  const subtotal = Math.round(dailyRent * nights * 100) / 100;
  const discountAmount = Math.min(Number(discount) || 0, subtotal);
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  return { nights, dailyRent, subtotal, discountAmount, total };
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

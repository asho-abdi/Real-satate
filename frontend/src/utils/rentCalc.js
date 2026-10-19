/** Daily rent from monthly rent (always ÷ 30). */
export function calcDailyRent(monthlyRent) {
  const monthly = Number(monthlyRent) || 0;
  return Math.round((monthly / 30) * 100) / 100;
}

export function calcWeeklyRent(monthlyRent, override = null) {
  if (override !== null && override !== undefined && override !== '') {
    return Math.round(Number(override) * 100) / 100;
  }
  return Math.round((Number(monthlyRent) / 30) * 7 * 100) / 100;
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

/** Daily / Weekly / Monthly guest booking totals with discount support. */
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
  const daily =
    dailyRate != null && dailyRate !== '' ? Number(dailyRate) : calcDailyRent(monthlyRent);
  const weekly = calcWeeklyRent(monthlyRent, weeklyRate);
  const monthly = Number(monthlyRent) || 0;

  let rate = daily;
  let quantity = Number(periodQuantity);

  if (period === 'WEEKLY') {
    rate = weekly;
    if (!Number.isFinite(quantity) || quantity < 1) quantity = Math.max(1, Math.ceil(nights / 7));
  } else if (period === 'MONTHLY') {
    rate = monthly;
    if (!Number.isFinite(quantity) || quantity < 1) quantity = Math.max(1, Math.ceil(nights / 30));
  } else {
    rate = daily;
    if (!Number.isFinite(quantity) || quantity < 1) quantity = Math.max(1, nights);
  }

  if (periodRateOverride !== null && periodRateOverride !== undefined && periodRateOverride !== '') {
    rate = Number(periodRateOverride) || 0;
  }

  const originalAmount = Math.round(rate * quantity * 100) / 100;
  const type = String(discountType || 'FIXED').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FIXED';
  const value =
    discountValue !== null && discountValue !== undefined && discountValue !== ''
      ? Math.max(0, Number(discountValue) || 0)
      : Math.max(0, Number(discount) || 0);
  let discountAmount = 0;
  if (type === 'PERCENT') {
    discountAmount = Math.round(originalAmount * (Math.min(value, 100) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(value, originalAmount);
  }
  const services = Math.max(0, Number(servicesAmount) || 0);
  const taxes = Math.max(0, Number(taxesAmount) || 0);
  const afterDiscount = Math.round((originalAmount - discountAmount) * 100) / 100;
  const total = Math.round((afterDiscount + services + taxes) * 100) / 100;

  return {
    bookingPeriod: period,
    periodRate: rate,
    periodQuantity: quantity,
    nights: nights || quantity,
    dailyRent: daily,
    weeklyRent: weekly,
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

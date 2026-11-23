/**
 * Lease rent schedule engine.
 *
 * Source of truth for commencement is leaseStart (never createdAt).
 * Lease end is exclusive for billing (Jan 1 2025 → Jan 1 2026 = 12 months).
 * Rent-free months are concessions (amountDue 0) — not payments.
 * Advance allocations overlay paid amounts without changing cash income.
 */

const TZ = 'Africa/Nairobi';

export function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function partsInZone(date, timeZone = TZ) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(date));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')) };
}

export function monthKeyFromDate(date, timeZone = TZ) {
  const { y, m } = partsInZone(date, timeZone);
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonthsKey(yyyyMm, n) {
  const [y, m] = String(yyyyMm).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + Number(n), 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function compareMonth(a, b) {
  return String(a).localeCompare(String(b));
}

function lastDayOfMonth(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function dueDateForMonth(monthKey, dueDay, timeZone = TZ) {
  const [y, m] = String(monthKey).split('-').map(Number);
  const day = Math.min(Math.max(1, Number(dueDay) || 1), lastDayOfMonth(y, m - 1));
  return new Date(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+03:00`);
}

export function resolveDueDay(leaseStart, rentDueDay, timeZone = TZ) {
  if (rentDueDay != null && Number(rentDueDay) > 0) return Math.min(31, Number(rentDueDay));
  return partsInZone(leaseStart, timeZone).d;
}

/**
 * Inclusive start month, exclusive end month, from lease dates.
 * Open-ended leases generate through `throughMonth` (default: current month in TZ).
 */
export function leaseMonthKeys({ leaseStart, leaseEnd, throughMonth, timeZone = TZ }) {
  if (!leaseStart) return [];
  const startKey = monthKeyFromDate(leaseStart, timeZone);
  const dueDay = resolveDueDay(leaseStart, null, timeZone);
  const asOfKey = throughMonth || monthKeyFromDate(new Date(), timeZone);
  const endExclusive = leaseEnd
    ? (() => {
        const end = new Date(leaseEnd);
        const endDay = new Date(end);
        endDay.setHours(0, 0, 0, 0);
        let key = startKey;
        const keys = [];
        for (let i = 0; i < 360; i += 1) {
          const due = dueDateForMonth(key, dueDay, timeZone);
          if (due >= endDay) break;
          keys.push(key);
          key = addMonthsKey(key, 1);
        }
        return keys;
      })()
    : null;

  if (endExclusive) return endExclusive;

  const keys = [];
  let key = startKey;
  while (compareMonth(key, asOfKey) <= 0 && keys.length < 360) {
    keys.push(key);
    key = addMonthsKey(key, 1);
  }
  return keys;
}

export function isRentFreeMonth(monthKey, leaseStart, rentFreeMonths, timeZone = TZ) {
  const n = Math.max(0, Number(rentFreeMonths) || 0);
  if (n <= 0 || !leaseStart) return false;
  const startKey = monthKeyFromDate(leaseStart, timeZone);
  const lastFree = addMonthsKey(startKey, n);
  return compareMonth(monthKey, startKey) >= 0 && compareMonth(monthKey, lastFree) < 0;
}

function displayStatus({ amountDue, amountPaid, dueDate, isRentFree, isAdvance, asOf }) {
  if (isRentFree || (amountDue <= 0 && amountPaid <= 0)) return 'RENT_FREE';
  if (amountPaid + 0.001 >= amountDue && amountPaid > 0) {
    return isAdvance ? 'ADVANCE_PAID' : 'PAID';
  }
  if (amountPaid > 0) return 'PARTIAL';
  const today = new Date(asOf);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  if (due < today) return 'OVERDUE';
  if (due.getTime() === today.getTime()) return 'DUE';
  return 'UNPAID';
}

/**
 * Build the canonical rent schedule for a lease.
 */
export function buildLeaseSchedule(lease = {}, payments = [], opts = {}) {
  const timeZone = opts.timeZone || TZ;
  const asOf = opts.asOf ? new Date(opts.asOf) : new Date();
  const monthlyRent = money(lease.monthlyRent);
  const discount = money(lease.discount);
  const netRent = Math.max(0, money(monthlyRent - discount));
  const rentFreeMonths = Math.max(0, Number(lease.rentFreeMonths) || 0);
  const dueDay = resolveDueDay(lease.leaseStart, lease.rentDueDay, timeZone);
  const registeredAt = lease.createdAt || lease.registeredAt || null;

  const months = leaseMonthKeys({
    leaseStart: lease.leaseStart,
    leaseEnd: lease.leaseEnd,
    throughMonth: opts.throughMonth || monthKeyFromDate(asOf, timeZone),
    timeZone,
  });

  const payMap = new Map();
  for (const p of payments || []) {
    if (p?.month) payMap.set(p.month, p);
  }

  const periods = months.map((month, index) => {
    const rentFree = isRentFreeMonth(month, lease.leaseStart, rentFreeMonths, timeZone);
    const row = payMap.get(month);
    const amountDue = rentFree
      ? 0
      : row?.amountDue != null && Number(row.amountPaid) > 0
        ? money(row.amountDue)
        : netRent;
    const amountPaid = rentFree ? 0 : money(row?.amountPaid);
    const dueDate = dueDateForMonth(month, dueDay, timeZone);
    const isAdvance = Boolean(row?.isAdvance);
    const status = displayStatus({
      amountDue,
      amountPaid,
      dueDate,
      isRentFree: rentFree || Boolean(row?.isRentFree) || row?.status === 'RENT_FREE',
      isAdvance,
      asOf,
    });
    const outstanding =
      rentFree || status === 'RENT_FREE' ? 0 : Math.max(0, money(amountDue - amountPaid));

    return {
      index: index + 1,
      month,
      dueDate: dueDate.toISOString(),
      amountDue,
      amountPaid,
      outstanding,
      status,
      isRentFree: rentFree || status === 'RENT_FREE',
      isAdvance,
      paymentId: row?.id || null,
      method: row?.method || null,
      paymentDate: row?.paymentDate || null,
    };
  });

  const expectedRent = money(
    periods.filter((p) => !p.isRentFree).reduce((s, p) => s + p.amountDue, 0),
  );
  const collected = money(periods.reduce((s, p) => s + p.amountPaid, 0));
  const outstanding = money(periods.reduce((s, p) => s + p.outstanding, 0));
  const overdue = periods.filter((p) => p.status === 'OVERDUE' || (p.status === 'PARTIAL' && p.outstanding > 0 && new Date(p.dueDate) < asOf));
  const nextUnpaid = periods.find((p) => ['UNPAID', 'OVERDUE', 'DUE', 'PARTIAL'].includes(p.status));
  let paidThrough = null;
  for (const p of periods) {
    if (p.isRentFree || p.status === 'PAID' || p.status === 'ADVANCE_PAID') paidThrough = p.month;
    else break;
  }
  const currentlyRentFree = periods.some(
    (p) => p.isRentFree && p.month === monthKeyFromDate(asOf, timeZone),
  );

  return {
    leaseStart: lease.leaseStart,
    leaseEnd: lease.leaseEnd || null,
    registeredAt,
    monthlyRent: netRent,
    grossMonthlyRent: monthlyRent,
    discount,
    rentFreeMonths,
    rentDueDay: dueDay,
    billingFrequency: lease.paymentFrequency || 'MONTHLY',
    periods,
    summary: {
      periodCount: periods.length,
      rentFreeCount: periods.filter((p) => p.isRentFree).length,
      expectedRent,
      collected,
      outstanding,
      overdueCount: overdue.length,
      overdueAmount: money(overdue.reduce((s, p) => s + p.outstanding, 0)),
      paidThrough,
      nextDueMonth: nextUnpaid?.month || null,
      nextDueDate: nextUnpaid?.dueDate || null,
      currentlyRentFree,
    },
  };
}

export function chargeableUnpaidMonths(schedule, count) {
  const n = Math.max(0, Number(count) || 0);
  return (schedule.periods || [])
    .filter((p) => !p.isRentFree && p.outstanding > 0)
    .slice(0, n);
}

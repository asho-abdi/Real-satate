/**
 * Shared lease financial math — single source of truth for Unit Profile,
 * statements helpers, and outstanding breakdowns.
 *
 * Rules:
 * - MonthlyPayment.amountDue is the rent line total (may embed otherCharges).
 * - MonthlyPayment.otherCharges is a breakdown field inside amountDue — never
 *   add it again on top of amountDue when computing totals.
 * - LeaseCharge rows are standalone obligations — add them separately.
 * - Outstanding = max(0, sum(amountDue - amountPaid) across both sources).
 */

export function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export function serializePaymentLine(p) {
  const amountDue = money(p.amountDue);
  const amountPaid = money(p.amountPaid);
  const otherCharges = money(p.otherCharges);
  const rentDue =
    p.rentDue != null ? money(p.rentDue) : Math.max(0, money(amountDue - otherCharges));
  return {
    ...p,
    amountDue,
    amountPaid,
    rentDue,
    otherCharges,
    balance: Math.max(0, money(amountDue - amountPaid)),
  };
}

export function serializeChargeLine(c) {
  const amountDue = money(c.amountDue);
  const amountPaid = money(c.amountPaid);
  return {
    ...c,
    amountDue,
    amountPaid,
    balance: Math.max(0, money(amountDue - amountPaid)),
  };
}

/**
 * @param {object[]} payments - MonthlyPayment rows (or serialized)
 * @param {object[]} charges - LeaseCharge rows (or serialized)
 */
export function computeLeaseFinancials(payments = [], charges = []) {
  const payLines = payments.map(serializePaymentLine);
  const chargeLines = charges.filter((c) => !c.deletedAt).map(serializeChargeLine);

  const rentLineDue = payLines.reduce((s, p) => s + p.amountDue, 0);
  const rentLinePaid = payLines.reduce((s, p) => s + p.amountPaid, 0);
  const rentPortionDue = payLines.reduce((s, p) => s + p.rentDue, 0);
  const embeddedOtherDue = payLines.reduce((s, p) => s + p.otherCharges, 0);

  const chargesDue = chargeLines.reduce((s, c) => s + c.amountDue, 0);
  const chargesPaid = chargeLines.reduce((s, c) => s + c.amountPaid, 0);

  const totalDue = money(rentLineDue + chargesDue);
  const totalPaid = money(rentLinePaid + chargesPaid);
  const outstanding = Math.max(0, money(totalDue - totalPaid));

  return {
    payments: payLines,
    charges: chargeLines,
    financials: {
      monthlyRent: null, // filled by caller from lease terms
      rentDue: money(rentPortionDue),
      /** Standalone LeaseCharge dues only (not embedded otherCharges). */
      otherChargesDue: money(chargesDue),
      /** Informational: otherCharges already included in rent line amountDue. */
      embeddedOtherCharges: money(embeddedOtherDue),
      totalDue,
      rentPaid: money(rentLinePaid),
      otherChargesPaid: money(chargesPaid),
      totalPaid,
      outstanding,
    },
  };
}

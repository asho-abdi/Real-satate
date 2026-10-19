import { currentMonthKey } from '../utils/rent.js';

export const OWNER_MONTHLY_CATEGORY = 'MONTHLY_CHARGE';

function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/**
 * Find an existing owner monthly charge for a unit + month.
 * Matches MONTHLY_CHARGE and legacy MAINTENANCE owner charges (no lease).
 */
export async function findOwnerMonthlyCharge(tx, unitId, month) {
  return tx.leaseCharge.findFirst({
    where: {
      unitId,
      month: String(month),
      deletedAt: null,
      businessId: null,
      tenantId: null,
      category: { in: [OWNER_MONTHLY_CATEGORY, 'MAINTENANCE'] },
    },
  });
}

/**
 * Create the owner monthly charge for a sold shop when none exists for that month.
 * Does not create ShopMaintenancePayment rows.
 */
export async function ensureOwnerMonthlyCharge(tx, {
  unitId,
  month,
  amountDue,
  actorId = null,
  description,
}) {
  const due = money(amountDue);
  if (due <= 0) return null;

  const monthKey = month ? String(month) : currentMonthKey();
  const existing = await findOwnerMonthlyCharge(tx, unitId, monthKey);
  if (existing) return { charge: existing, created: false };

  const charge = await tx.leaseCharge.create({
    data: {
      businessId: null,
      tenantId: null,
      unitId,
      category: OWNER_MONTHLY_CATEGORY,
      description: description || `Monthly charge ${monthKey}`,
      amountDue: due,
      amountPaid: 0,
      status: 'UNPAID',
      chargeDate: new Date(),
      month: monthKey,
      createdById: actorId || null,
    },
  });

  return { charge, created: true };
}

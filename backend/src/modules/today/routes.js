import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import {
  getAccessibleBuildingIds,
  paymentBuildingFilter,
  resourceBuildingFilter,
  unitBuildingFilter,
} from '../../services/access.service.js';
import { OWNER_MONTHLY_CATEGORY } from '../../services/ownerCharge.service.js';

const router = Router();
router.use(authenticate);

const TZ_OFFSET = '+03:00'; // Africa/Nairobi (no DST)

function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function remaining(due, paid) {
  return Math.max(0, money(due) - money(paid));
}

/** Resolve calendar day in Nairobi time → UTC bounds. */
function dayRange(dateKey) {
  const key = String(dateKey || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return dayRange(`${y}-${m}-${d}`);
  }
  const start = new Date(`${key}T00:00:00${TZ_OFFSET}`);
  const end = new Date(`${key}T23:59:59.999${TZ_OFFSET}`);
  const monthKey = key.slice(0, 7);
  const dayOfMonth = Number(key.slice(8, 10));
  return { start, end, dateKey: key, monthKey, dayOfMonth };
}

function unitLabel(unit) {
  if (!unit) return { unitId: null, roomNumber: '—', building: '', buildingId: null, unitType: null, status: null };
  return {
    unitId: unit.id,
    roomNumber: unit.roomNumber || '—',
    building: unit.building?.name || '',
    buildingId: unit.buildingId || unit.building?.id || null,
    unitType: unit.unitType || null,
    usage: unit.usage || null,
    status: unit.status || null,
  };
}

function paymentBadge(status, balance) {
  if (balance <= 0 || String(status).toUpperCase() === 'PAID') return 'Paid';
  if (String(status).toUpperCase() === 'PARTIAL') return 'Partial';
  return 'Outstanding';
}

/**
 * GET /today — one-glance office board for a calendar day (default: today).
 * Query: ?date=YYYY-MM-DD (optional)
 */
router.get(
  '/',
  authorize('bookings:read'),
  asyncHandler(async (req, res) => {
    const buildingIds = await getAccessibleBuildingIds(req.user);
    const { start, end, dateKey, monthKey, dayOfMonth } = dayRange(req.query.date);

    const unitScope = resourceBuildingFilter(buildingIds);
    const bookingScope = unitBuildingFilter(buildingIds);
    const payScope = paymentBuildingFilter(buildingIds);

    const unitSelect = {
      id: true,
      roomNumber: true,
      unitType: true,
      usage: true,
      status: true,
      buildingId: true,
      building: { select: { id: true, name: true, code: true } },
      floor: { select: { name: true, level: true } },
    };

    const bookingInclude = {
      unit: { select: unitSelect },
      payments: {
        where: { paymentDate: { gte: start, lte: end } },
        select: { id: true, amount: true, paymentDate: true, method: true },
      },
    };

    const [
      availableUnits,
      checkIns,
      checkOuts,
      becomingFreeBookings,
      rentRows,
      chargeRows,
      ownerDueByDaySales,
      bookingPaymentsToday,
      salePaymentsToday,
      monthlyPaidToday,
    ] = await Promise.all([
      prisma.unit.findMany({
        where: {
          deletedAt: null,
          status: 'AVAILABLE',
          ...unitScope,
        },
        select: unitSelect,
        orderBy: [{ building: { name: 'asc' } }, { roomNumber: 'asc' }],
      }),

      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          checkIn: { gte: start, lte: end },
          ...bookingScope,
        },
        include: bookingInclude,
        orderBy: { checkIn: 'asc' },
      }),

      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          checkOut: { gte: start, lte: end },
          ...bookingScope,
        },
        include: bookingInclude,
        orderBy: { checkOut: 'asc' },
      }),

      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkOut: { gte: start, lte: end },
          ...bookingScope,
        },
        select: {
          id: true,
          unitId: true,
          fullName: true,
          checkOut: true,
          unit: { select: unitSelect },
        },
      }),

      prisma.monthlyPayment.findMany({
        where: {
          status: { in: ['UNPAID', 'PARTIAL'] },
          month: monthKey,
          ...payScope,
        },
        include: {
          tenant: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              unit: { select: unitSelect },
            },
          },
          business: {
            select: {
              id: true,
              businessName: true,
              phone: true,
              unit: { select: unitSelect },
            },
          },
        },
        orderBy: { month: 'asc' },
      }),

      prisma.leaseCharge.findMany({
        where: {
          deletedAt: null,
          status: { in: ['UNPAID', 'PARTIAL'] },
          ...unitBuildingFilter(buildingIds),
          OR: [
            { dueDate: { gte: start, lte: end } },
            {
              dueDate: null,
              chargeDate: { gte: start, lte: end },
            },
            {
              dueDate: null,
              month: monthKey,
              category: { in: [OWNER_MONTHLY_CATEGORY, 'MAINTENANCE'] },
              businessId: null,
              tenantId: null,
            },
          ],
        },
        include: {
          unit: { select: unitSelect },
          tenant: { select: { id: true, fullName: true, phone: true } },
          business: { select: { id: true, businessName: true, phone: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { chargeDate: 'asc' }],
      }),

      prisma.shopSale.findMany({
        where: {
          deletedAt: null,
          ownershipStatus: 'ACTIVE_OWNER',
          maintenanceDueDay: dayOfMonth,
          monthlyMaintenance: { gt: 0 },
          ...unitBuildingFilter(buildingIds),
        },
        select: {
          id: true,
          unitId: true,
          buyerName: true,
          phone: true,
          monthlyMaintenance: true,
          maintenanceDueDay: true,
          unit: { select: unitSelect },
        },
      }),

      prisma.bookingPayment.findMany({
        where: {
          paymentDate: { gte: start, lte: end },
          booking: {
            deletedAt: null,
            ...bookingScope,
          },
        },
        select: { amount: true },
      }),

      prisma.shopSalePayment.findMany({
        where: {
          paymentDate: { gte: start, lte: end },
          sale: {
            deletedAt: null,
            ...unitBuildingFilter(buildingIds),
          },
        },
        select: { amount: true },
      }),

      prisma.monthlyPayment.findMany({
        where: {
          paymentDate: { gte: start, lte: end },
          status: { in: ['PAID', 'PARTIAL'] },
          ...payScope,
        },
        select: { amountPaid: true },
      }),
    ]);

    // Owner charges due by shop sale due-day — surface unpaid month charge if not already listed
    const ownerChargeKeys = new Set(
      chargeRows
        .filter((c) => !c.businessId && !c.tenantId)
        .map((c) => `${c.unitId}:${c.month || monthKey}`),
    );
    const saleUnitIdsNeedingCharge = ownerDueByDaySales
      .map((s) => s.unitId)
      .filter((id) => !ownerChargeKeys.has(`${id}:${monthKey}`));

    const ownerDueExtras =
      saleUnitIdsNeedingCharge.length === 0
        ? []
        : await prisma.leaseCharge.findMany({
            where: {
              unitId: { in: saleUnitIdsNeedingCharge },
              month: monthKey,
              deletedAt: null,
              businessId: null,
              tenantId: null,
              status: { in: ['UNPAID', 'PARTIAL'] },
              category: { in: [OWNER_MONTHLY_CATEGORY, 'MAINTENANCE'] },
            },
            include: {
              unit: { select: unitSelect },
            },
          });

    const allCharges = [...chargeRows, ...ownerDueExtras];

    const availableToday = [
      ...availableUnits.map((u) => ({
        ...unitLabel(u),
        availability: 'available',
        badge: 'Available',
        note: null,
      })),
      ...becomingFreeBookings
        .filter((b) => b.unit && b.unit.status !== 'AVAILABLE')
        .map((b) => ({
          ...unitLabel(b.unit),
          availability: 'becoming',
          badge: 'Check-out',
          note: `Frees after ${b.fullName || 'guest'} checks out`,
          bookingId: b.id,
        })),
    ];

    // Dedupe units that are both available and becoming
    const seenUnits = new Set();
    const availableDeduped = [];
    for (const row of availableToday) {
      const id = row.unitId;
      if (!id || seenUnits.has(id)) continue;
      seenUnits.add(id);
      availableDeduped.push(row);
    }

    const mapBooking = (b, kind) => {
      const due = money(b.totalAmount);
      const paid = money(b.amountPaid);
      const bal = remaining(due, paid);
      return {
        id: b.id,
        code: b.code,
        kind,
        badge: kind === 'check_in' ? 'Check-in' : 'Check-out',
        guest: b.fullName,
        phone: b.phone,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        bookingPeriod: b.bookingPeriod,
        nights: b.nights,
        totalAmount: due,
        amountPaid: paid,
        balance: bal,
        paymentStatus: b.paymentStatus,
        paymentBadge: paymentBadge(b.paymentStatus, bal),
        bookingStatus: b.status,
        ...unitLabel(b.unit),
      };
    };

    const checkInsToday = checkIns.map((b) => mapBooking(b, 'check_in'));
    const checkOutsToday = checkOuts.map((b) => mapBooking(b, 'check_out'));

    const dueItems = [];

    for (const p of rentRows) {
      const due = money(p.amountDue);
      const paid = money(p.amountPaid);
      const bal = remaining(due, paid);
      if (bal <= 0) continue;
      const unit = p.tenant?.unit || p.business?.unit;
      dueItems.push({
        id: p.id,
        kind: 'RENT',
        badge: 'Due',
        paymentBadge: paymentBadge(p.status, bal),
        name: p.tenant?.fullName || p.business?.businessName || '—',
        phone: p.tenant?.phone || p.business?.phone || null,
        description: `Rent ${p.month}`,
        month: p.month,
        amountDue: due,
        amountPaid: paid,
        balance: bal,
        status: p.status,
        ...unitLabel(unit),
      });
    }

    for (const c of allCharges) {
      const due = money(c.amountDue);
      const paid = money(c.amountPaid);
      const bal = remaining(due, paid);
      if (bal <= 0) continue;
      const isOwner = !c.businessId && !c.tenantId;
      const isOwnerMonthly =
        isOwner &&
        [OWNER_MONTHLY_CATEGORY, 'MAINTENANCE'].includes(String(c.category || '').toUpperCase());
      dueItems.push({
        id: c.id,
        kind: isOwnerMonthly ? 'OWNER_MONTHLY' : 'OTHER_CHARGE',
        badge: 'Due',
        paymentBadge: paymentBadge(c.status, bal),
        name:
          c.business?.businessName ||
          c.tenant?.fullName ||
          (isOwnerMonthly ? 'Shop owner' : '—'),
        phone: c.business?.phone || c.tenant?.phone || null,
        description: c.description,
        category: c.category,
        month: c.month,
        dueDate: c.dueDate,
        amountDue: due,
        amountPaid: paid,
        balance: bal,
        status: c.status,
        ...unitLabel(c.unit),
      });
    }

    // Guest balances due today (check-in or check-out with unpaid balance)
    const guestDueSeen = new Set();
    for (const b of [...checkIns, ...checkOuts]) {
      if (guestDueSeen.has(b.id)) continue;
      guestDueSeen.add(b.id);
      const due = money(b.totalAmount);
      const paid = money(b.amountPaid);
      const bal = remaining(due, paid);
      if (bal <= 0) continue;
      dueItems.push({
        id: b.id,
        kind: 'GUEST',
        badge: 'Due',
        paymentBadge: paymentBadge(b.paymentStatus, bal),
        name: b.fullName,
        phone: b.phone,
        description: `Guest stay ${b.code || ''}`.trim(),
        month: null,
        amountDue: due,
        amountPaid: paid,
        balance: bal,
        status: b.paymentStatus,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        ...unitLabel(b.unit),
      });
    }

    const receivedToday = money(
      bookingPaymentsToday.reduce((s, p) => s + Number(p.amount), 0) +
        salePaymentsToday.reduce((s, p) => s + Number(p.amount), 0) +
        monthlyPaidToday.reduce((s, p) => s + Number(p.amountPaid), 0),
    );

    const totalDue = money(dueItems.reduce((s, i) => s + i.balance, 0));

    return success(res, {
      date: dateKey,
      timezone: 'Africa/Nairobi',
      generatedAt: new Date().toISOString(),
      summary: {
        availableUnits: availableDeduped.filter((u) => u.availability === 'available').length,
        becomingAvailable: availableDeduped.filter((u) => u.availability === 'becoming').length,
        checkIns: checkInsToday.length,
        checkOuts: checkOutsToday.length,
        dueCount: dueItems.length,
        totalDue,
        totalReceivedToday: receivedToday,
      },
      available: availableDeduped,
      checkIns: checkInsToday,
      checkOuts: checkOutsToday,
      due: dueItems,
    });
  }),
);

export default router;

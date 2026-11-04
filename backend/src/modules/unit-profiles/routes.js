import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { assertUnitBuildingAccess } from '../../services/access.service.js';
import { listUnitActivity } from '../../services/activity.service.js';
import { currentMonthKey } from '../../utils/rent.js';

const router = Router();
router.use(authenticate);

function money(v) {
  return Number(v || 0);
}

function daysUntil(date) {
  if (!date) return null;
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / (1000 * 60 * 60 * 24));
}

function leaseDisplayStatus(lease) {
  if (!lease) return null;
  if (lease.status === 'ENDED') return 'Terminated';
  const days = daysUntil(lease.leaseEnd);
  if (days != null && days < 0) return 'Expired';
  if (days != null && days <= 30) return 'Expiring Soon';
  return 'Active';
}

function serializeLease(row, kind, charges = []) {
  if (!row) return null;
  const payments = (row.payments || []).map((p) => {
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
  });

  const leaseCharges = (charges || [])
    .filter((c) => !c.deletedAt)
    .filter((c) =>
      kind === 'BUSINESS' ? c.businessId === row.id : c.tenantId === row.id,
    )
    .map((c) => {
      const amountDue = money(c.amountDue);
      const amountPaid = money(c.amountPaid);
      return {
        ...c,
        amountDue,
        amountPaid,
        balance: Math.max(0, money(amountDue - amountPaid)),
      };
    });

  // Correct revenue math:
  // Total Due = rent lines + standalone other charges
  // Total Paid = all payments applied
  // Outstanding = Total Due - Total Paid (never negative)
  const rentDueTotal = payments.reduce((s, p) => s + p.amountDue, 0);
  const rentPaidTotal = payments.reduce((s, p) => s + p.amountPaid, 0);
  const chargesDueTotal = leaseCharges.reduce((s, c) => s + c.amountDue, 0);
  const chargesPaidTotal = leaseCharges.reduce((s, c) => s + c.amountPaid, 0);
  const otherEmbedded = payments.reduce((s, p) => s + p.otherCharges, 0);

  const totalDue = money(rentDueTotal + chargesDueTotal);
  const totalPaid = money(rentPaidTotal + chargesPaidTotal);
  const outstanding = Math.max(0, money(totalDue - totalPaid));
  const rentRevenue = money(rentPaidTotal);
  const otherChargesRevenue = money(chargesPaidTotal + otherEmbedded);

  const unpaidOrPartial = [
    ...payments.filter((p) => p.status !== 'PAID'),
    ...leaseCharges.filter((c) => c.status !== 'PAID'),
  ];
  const nextPayment =
    unpaidOrPartial.sort((a, b) =>
      String(a.month || a.dueDate || a.chargeDate || '').localeCompare(
        String(b.month || b.dueDate || b.chargeDate || ''),
      ),
    )[0] || null;
  const lastPaid = [...payments, ...leaseCharges]
    .filter((p) => p.amountPaid > 0)
    .sort((a, b) =>
      String(b.paymentDate || b.updatedAt || b.chargeDate || '').localeCompare(
        String(a.paymentDate || a.updatedAt || a.chargeDate || ''),
      ),
    )[0] || null;

  const days = daysUntil(row.leaseEnd);
  return {
    id: row.id,
    kind,
    name: kind === 'BUSINESS' ? row.businessName : row.fullName,
    contactName: kind === 'BUSINESS' ? row.contactName : row.fullName,
    phone: row.phone,
    idNumber: kind === 'BUSINESS' ? row.licenseNumber : row.idNumber,
    identityDocument: row.identityDocument || null,
    identityDocumentName: row.identityDocumentName || null,
    monthlyRent: money(row.monthlyRent),
    discount: money(row.discount),
    netMonthlyRent: Math.max(0, money(row.monthlyRent) - money(row.discount)),
    securityDeposit: money(row.securityDeposit),
    paymentFrequency: row.paymentFrequency || 'MONTHLY',
    gracePeriodDays: row.gracePeriodDays || 0,
    notes: row.notes || null,
    leaseStart: row.leaseStart,
    leaseEnd: row.leaseEnd,
    status: row.status,
    displayStatus: leaseDisplayStatus(row),
    daysUntilExpiry: days,
    endedAt: row.endedAt || null,
    endReason: row.endReason || null,
    createdAt: row.createdAt,
    payments,
    charges: leaseCharges,
    financials: {
      monthlyRent: Math.max(0, money(row.monthlyRent) - money(row.discount)),
      rentDue: money(rentDueTotal),
      otherChargesDue: money(chargesDueTotal + otherEmbedded),
      totalDue,
      rentPaid: rentRevenue,
      otherChargesPaid: otherChargesRevenue,
      totalPaid,
      outstanding,
      lastPaymentAmount: lastPaid ? money(lastPaid.amountPaid) : 0,
      lastPaymentDate: lastPaid?.paymentDate || lastPaid?.chargeDate || null,
      nextPaymentMonth: nextPayment?.month || null,
      nextPaymentDue: nextPayment
        ? money((nextPayment.amountDue || 0) - (nextPayment.amountPaid || 0))
        : 0,
    },
  };
}

/**
 * GET /unit-profiles/:id
 * Central profile payload for shops, apartments, guest units, sold shops.
 * Mounted separately from /units CRUD to avoid overlapping routers.
 */
router.get(
  '/:id',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        building: { select: { id: true, code: true, name: true, address: true } },
        floor: { select: { id: true, name: true, level: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        businesses: {
          where: { deletedAt: null },
          include: {
            payments: { orderBy: { month: 'desc' } },
            charges: { where: { deletedAt: null }, orderBy: { chargeDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        tenants: {
          where: { deletedAt: null },
          include: {
            payments: { orderBy: { month: 'desc' } },
            charges: { where: { deletedAt: null }, orderBy: { chargeDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        leaseCharges: {
          where: { deletedAt: null },
          orderBy: { chargeDate: 'desc' },
        },
        shopSales: {
          where: { deletedAt: null },
          include: {
            salePayments: { orderBy: { paymentDate: 'desc' } },
            maintenancePayments: { orderBy: { month: 'desc' } },
          },
          orderBy: { saleDate: 'desc' },
        },
        bookings: {
          where: { deletedAt: null },
          orderBy: { checkIn: 'desc' },
          take: 20,
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
        expenses: {
          where: { deletedAt: null },
          orderBy: { expenseDate: 'desc' },
          take: 30,
        },
        maintenanceRecords: {
          where: { deletedAt: null },
          orderBy: { workDate: 'desc' },
          take: 40,
          include: {
            createdBy: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);

    const activeBusiness = unit.businesses.find((b) => b.status === 'ACTIVE') || null;
    const activeTenant = unit.tenants.find((t) => t.status === 'ACTIVE') || null;
    const activeSale =
      unit.shopSales.find((s) => s.ownershipStatus === 'ACTIVE_OWNER') || null;

    let profileMode = 'VACANT';
    if (unit.status === 'SOLD' || activeSale) profileMode = 'SOLD';
    else if (unit.usage === 'GUEST') profileMode = 'GUEST';
    else if (activeBusiness) profileMode = 'LEASED_SHOP';
    else if (activeTenant) profileMode = 'LEASED_APARTMENT';
    else if (unit.status === 'RESERVED') profileMode = 'RESERVED';
    else if (unit.status === 'MAINTENANCE') profileMode = 'MAINTENANCE';
    else if (
      unit.status === 'OCCUPIED' ||
      unit.businesses.length ||
      unit.tenants.length
    ) {
      profileMode = 'VACANT';
    } else profileMode = 'AVAILABLE';

    const allCharges = unit.leaseCharges || [];

    const activeLease = activeBusiness
      ? serializeLease(activeBusiness, 'BUSINESS', activeBusiness.charges || allCharges)
      : activeTenant
        ? serializeLease(activeTenant, 'TENANT', activeTenant.charges || allCharges)
        : null;

    const leaseHistory = [
      ...unit.businesses.map((b) => serializeLease(b, 'BUSINESS', b.charges || allCharges)),
      ...unit.tenants.map((t) => serializeLease(t, 'TENANT', t.charges || allCharges)),
    ].sort((a, b) => new Date(b.leaseStart) - new Date(a.leaseStart));

    const [documents, activity] = await Promise.all([
      prisma.entityDocument.findMany({
        where: {
          deletedAt: null,
          OR: [
            { unitId: unit.id },
            ...(activeBusiness ? [{ entityType: 'BUSINESS', entityId: activeBusiness.id }] : []),
            ...(activeTenant ? [{ entityType: 'TENANT', entityId: activeTenant.id }] : []),
            ...(activeSale ? [{ entityType: 'SHOP_SALE', entityId: activeSale.id }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      listUnitActivity(unit.id, { take: 40 }),
    ]);

    const ownerCharges = (allCharges || [])
      .filter((c) => !c.businessId && !c.tenantId)
      .map((c) => {
        const amountDue = money(c.amountDue);
        const amountPaid = money(c.amountPaid);
        return {
          ...c,
          amountDue,
          amountPaid,
          balance: Math.max(0, money(amountDue - amountPaid)),
        };
      });
    const ownerChargesDue = ownerCharges.reduce((s, c) => s + c.amountDue, 0);
    const ownerChargesPaid = ownerCharges.reduce((s, c) => s + c.amountPaid, 0);

    const financialSummary = activeLease
      ? {
          monthlyRent: activeLease.financials.monthlyRent,
          otherChargesDue: activeLease.financials.otherChargesDue,
          totalDue: activeLease.financials.totalDue,
          totalPaid: activeLease.financials.totalPaid,
          outstanding: activeLease.financials.outstanding,
          securityDeposit: activeLease.securityDeposit,
          lastPayment: activeLease.financials.lastPaymentAmount,
          lastPaymentDate: activeLease.financials.lastPaymentDate,
          nextPaymentMonth: activeLease.financials.nextPaymentMonth,
          rentPaid: activeLease.financials.rentPaid,
          otherChargesPaid: activeLease.financials.otherChargesPaid,
        }
      : activeSale
        ? {
            salePrice: money(activeSale.salePrice),
            amountPaid: money(activeSale.amountPaid),
            balance: Math.max(0, money(activeSale.salePrice) - money(activeSale.amountPaid)),
            monthlyMaintenance: money(activeSale.monthlyMaintenance),
            otherChargesDue: money(ownerChargesDue),
            otherChargesPaid: money(ownerChargesPaid),
            chargesOutstanding: Math.max(0, money(ownerChargesDue - ownerChargesPaid)),
          }
        : null;

    return success(res, {
      unit: {
        id: unit.id,
        roomNumber: unit.roomNumber,
        unitType: unit.unitType,
        usage: unit.usage,
        status: unit.status,
        transactionType: unit.transactionType,
        monthlyRent: money(unit.monthlyRent),
        weeklyRent: unit.weeklyRent != null ? money(unit.weeklyRent) : null,
        dailyRate: unit.dailyRate != null ? money(unit.dailyRate) : null,
        salePrice: unit.salePrice != null ? money(unit.salePrice) : null,
        discount: money(unit.discount),
        areaSqm: unit.areaSqm != null ? money(unit.areaSqm) : null,
        roomsCount: unit.roomsCount,
        bathroomsCount: unit.bathroomsCount,
        description: unit.description,
        notes: unit.notes,
        building: unit.building,
        floor: unit.floor,
        images: unit.images,
      },
      profileMode,
      ownershipType:
        profileMode === 'SOLD'
          ? 'Sold'
          : profileMode === 'LEASED_SHOP' || profileMode === 'LEASED_APARTMENT'
            ? 'Rental / Lease'
            : profileMode === 'GUEST'
              ? 'Guest / Airbnb'
              : 'Unassigned',
      activeLease,
      leaseHistory,
      ownerCharges,
      activeSale: activeSale
        ? {
            ...activeSale,
            salePrice: money(activeSale.salePrice),
            amountPaid: money(activeSale.amountPaid),
            balance: Math.max(0, money(activeSale.salePrice) - money(activeSale.amountPaid)),
            monthlyMaintenance: money(activeSale.monthlyMaintenance),
          }
        : null,
      bookings: (unit.bookings || []).map((b) => ({
        ...b,
        totalAmount: money(b.totalAmount),
        amountPaid: money(b.amountPaid),
        balance: Math.max(0, money(b.totalAmount) - money(b.amountPaid)),
      })),
      expenses: (unit.expenses || []).map((e) => ({
        ...e,
        amount: money(e.amount),
      })),
      maintenance: (unit.maintenanceRecords || []).map((m) => ({
        id: m.id,
        code: m.code,
        subject: m.subject,
        amount: money(m.amount),
        workDate: m.workDate,
        status: m.status,
        description: m.description,
        customData: m.customData,
        createdBy: m.createdBy
          ? `${m.createdBy.firstName || ''} ${m.createdBy.lastName || ''}`.trim() ||
            m.createdBy.email
          : null,
      })),
      maintenanceTotal: (unit.maintenanceRecords || [])
        .filter((m) => m.status !== 'CANCELLED')
        .reduce((s, m) => s + money(m.amount), 0),
      documents,
      activity: activity.map((a) => ({
        id: a.id,
        action: a.action,
        summary: a.summary,
        meta: a.meta,
        createdAt: a.createdAt,
        actor: a.actor
          ? `${a.actor.firstName || ''} ${a.actor.lastName || ''}`.trim() || a.actor.email
          : 'System',
      })),
      financialSummary,
      currentMonth: currentMonthKey(),
      availableActions: buildActions(profileMode, activeLease, unit),
    });
  }),
);

function buildActions(mode, lease, unit) {
  const actions = ['EDIT_UNIT', 'UPLOAD_DOCUMENT'];
  if (mode === 'AVAILABLE' || mode === 'VACANT') {
    if (unit.usage === 'SHOP' || unit.usage === 'OFFICE') {
      actions.push('CREATE_LEASE', 'RECORD_SALE');
    }
    if (unit.usage === 'APARTMENT') actions.push('CREATE_LEASE');
    if (unit.usage === 'GUEST') actions.push('CREATE_BOOKING');
  }
  if (mode === 'LEASED_SHOP' || mode === 'LEASED_APARTMENT') {
    actions.push(
      'RECORD_PAYMENT',
      'ADD_CHARGE',
      'EDIT_LEASE',
      'RENEW_LEASE',
      'TERMINATE_LEASE',
      'VIEW_TENANT',
    );
  }
  if (mode === 'SOLD') {
    actions.push('RECORD_SALE_PAYMENT', 'RECORD_MAINTENANCE', 'ADD_CHARGE');
  }
  if (mode === 'GUEST') {
    actions.push('CREATE_BOOKING', 'VIEW_BOOKINGS');
  }
  if (lease?.displayStatus === 'Expiring Soon' || lease?.displayStatus === 'Expired') {
    if (!actions.includes('RENEW_LEASE')) actions.push('RENEW_LEASE');
  }
  return actions;
}

export default router;

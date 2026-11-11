import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { currentMonthKey } from '../../utils/rent.js';
import { exportExcel, exportPdf } from '../../utils/export.js';
import {
  assertBuildingAccess,
  resourceBuildingFilter,
} from '../../services/access.service.js';

const router = Router();
router.use(authenticate);

function dayKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthsInRange(from, to) {
  const months = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    months.push(currentMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function resolvePeriod(query) {
  const period = String(query.period || 'monthly').toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let from;
  let to;
  let label;

  if (period === 'daily') {
    from = today;
    to = today;
    label = `Daily · ${dayKey(today)}`;
  } else if (period === 'weekly') {
    to = today;
    from = addDays(today, -6);
    label = `Weekly · ${dayKey(from)} → ${dayKey(to)}`;
  } else if (period === 'yearly') {
    from = new Date(today.getFullYear(), 0, 1);
    to = today;
    label = `Yearly · ${today.getFullYear()}`;
  } else if (period === 'custom') {
    if (!query.from || !query.to) {
      throw new AppError('from and to dates are required for custom period', 400);
    }
    from = startOfDay(query.from);
    to = startOfDay(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError('Invalid from/to dates', 400);
    }
    if (from > to) throw new AppError('from must be before to', 400);
    label = `Custom · ${dayKey(from)} → ${dayKey(to)}`;
  } else {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = today;
    label = `Monthly · ${currentMonthKey(today)}`;
  }

  return {
    type: ['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(period)
      ? period
      : 'monthly',
    from: startOfDay(dayKey(from)),
    to: endOfDay(dayKey(to)),
    fromKey: dayKey(from),
    toKey: dayKey(to),
    months: monthsInRange(from, to),
    label,
  };
}

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

async function buildSummaryReport(query, user) {
  const period = resolvePeriod(query);
  const buildingId = query.buildingId ? String(query.buildingId) : null;
  const floorId = query.floorId ? String(query.floorId) : null;
  const propertyTypeRaw = String(query.propertyType || query.usage || 'ALL').toUpperCase();
  const propertyType = ['SHOP', 'OFFICE', 'APARTMENT', 'GUEST'].includes(propertyTypeRaw)
    ? propertyTypeRaw
    : 'ALL';

  if (buildingId) {
    await assertBuildingAccess(user, buildingId, user.buildingIds);
  }

  let building = null;
  let floor = null;
  if (buildingId) {
    building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    if (!building) throw new AppError('Building not found', 404);
  }
  if (floorId) {
    floor = await prisma.floor.findFirst({
      where: {
        id: floorId,
        deletedAt: null,
        ...(buildingId ? { buildingId } : {}),
        ...resourceBuildingFilter(user.buildingIds),
      },
      select: {
        id: true,
        name: true,
        level: true,
        buildingId: true,
        building: { select: { id: true, code: true, name: true } },
      },
    });
    if (!floor) throw new AppError('Floor not found', 404);
    await assertBuildingAccess(user, floor.buildingId, user.buildingIds);
    if (!building) building = floor.building;
  }

  const unitWhere = {
    deletedAt: null,
    ...(buildingId
      ? { buildingId }
      : resourceBuildingFilter(user.buildingIds)),
    ...(floorId ? { floorId } : {}),
    ...(propertyType !== 'ALL' ? { usage: propertyType } : {}),
  };

  const units = await prisma.unit.findMany({
    where: unitWhere,
    select: {
      id: true,
      roomNumber: true,
      usage: true,
      status: true,
      unitType: true,
      monthlyRent: true,
      buildingId: true,
      floorId: true,
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
    orderBy: [{ buildingId: 'asc' }, { floorId: 'asc' }, { roomNumber: 'asc' }],
  });

  const unitIds = units.map((u) => u.id);
  const available = units.filter((u) => u.status === 'AVAILABLE').length;
  const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
  const reserved = units.filter((u) => u.status === 'RESERVED').length;
  const totalRooms = units.length;
  const occupancyRate = totalRooms
    ? Math.round((occupied / totalRooms) * 10000) / 100
    : 0;

  const byFloorMap = {};
  for (const u of units) {
    const key = u.floorId || 'none';
    if (!byFloorMap[key]) {
      byFloorMap[key] = {
        floorId: u.floorId,
        floorName: u.floor?.name || '—',
        buildingName: u.building?.name || '—',
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
      };
    }
    byFloorMap[key].total += 1;
    if (u.status === 'AVAILABLE') byFloorMap[key].available += 1;
    if (u.status === 'OCCUPIED') byFloorMap[key].occupied += 1;
    if (u.status === 'RESERVED') byFloorMap[key].reserved += 1;
  }

  const scopedUnits = Boolean(buildingId || floorId || propertyType !== 'ALL');
  const includeGuests = propertyType === 'ALL' || propertyType === 'GUEST';
  const bookingWhere = {
    deletedAt: null,
    status: { not: 'CANCELLED' },
    checkIn: { gte: period.from, lte: period.to },
    ...(includeGuests
      ? scopedUnits
        ? { unitId: { in: unitIds } }
        : {}
      : { id: { in: [] } }),
  };

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      unit: {
        select: {
          roomNumber: true,
          building: { select: { name: true, code: true } },
          floor: { select: { name: true } },
        },
      },
    },
    orderBy: { checkIn: 'desc' },
  });

  const paymentUnitFilter = scopedUnits
    ? {
        OR: [
          {
            tenant: {
              unit: {
                deletedAt: null,
                ...(buildingId ? { buildingId } : {}),
                ...(floorId ? { floorId } : {}),
              },
            },
          },
          {
            business: {
              unit: {
                deletedAt: null,
                ...(buildingId ? { buildingId } : {}),
                ...(floorId ? { floorId } : {}),
              },
            },
          },
        ],
      }
    : {};

  const paymentsRaw = await prisma.monthlyPayment.findMany({
    where: {
      AND: [
        paymentUnitFilter,
        {
          OR: [
            {
              paymentDate: { gte: period.from, lte: period.to },
              amountPaid: { gt: 0 },
            },
            {
              paymentDate: null,
              month: { in: period.months },
              amountPaid: { gt: 0 },
            },
          ],
        },
      ],
    },
    include: {
      tenant: {
        select: {
          fullName: true,
          unit: {
            select: {
              roomNumber: true,
              usage: true,
              building: { select: { name: true } },
              floor: { select: { name: true } },
            },
          },
        },
      },
      business: {
        select: {
          businessName: true,
          unit: {
            select: {
              roomNumber: true,
              usage: true,
              building: { select: { name: true } },
              floor: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ month: 'desc' }, { paymentDate: 'desc' }],
  });

  const outstandingPaymentsRaw = await prisma.monthlyPayment.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...paymentUnitFilter,
    },
    include: {
      tenant: {
        select: {
          fullName: true,
          unit: {
            select: {
              roomNumber: true,
              usage: true,
              building: { select: { name: true } },
            },
          },
        },
      },
      business: {
        select: {
          businessName: true,
          unit: {
            select: {
              roomNumber: true,
              usage: true,
              building: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { month: 'asc' },
  });

  function paymentMatchesPropertyType(p) {
    if (propertyType === 'ALL') return true;
    if (propertyType === 'GUEST') return false;
    const usage = String(
      p.business?.unit?.usage || p.tenant?.unit?.usage || '',
    ).toUpperCase();
    return usage === propertyType;
  }

  const payments = paymentsRaw.filter(paymentMatchesPropertyType);
  const outstandingPayments = outstandingPaymentsRaw.filter(paymentMatchesPropertyType);

  // Guest revenue = amount actually paid, not booking total
  const guestCollected = bookings.reduce((s, b) => s + Number(b.amountPaid || 0), 0);
  const rentCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const outstandingTotal = outstandingPayments.reduce(
    (s, p) => s + (Number(p.amountDue) - Number(p.amountPaid)),
    0,
  );

  const maintenanceWhere = {
    deletedAt: null,
    status: { not: 'CANCELLED' },
    workDate: { gte: period.from, lte: period.to },
    ...(buildingId ? { buildingId } : {}),
    ...(floorId
      ? { unit: { floorId, deletedAt: null } }
      : {}),
  };
  const maintenanceAgg = await prisma.maintenanceRecord.aggregate({
    where: maintenanceWhere,
    _sum: { amount: true },
    _count: true,
  });
  const maintenanceCost = Number(maintenanceAgg._sum.amount || 0);
  const grossRevenue = rentCollected + guestCollected;
  const netRevenue = grossRevenue - maintenanceCost;

  const checkIns = bookings.length;
  const checkOuts = includeGuests
    ? await prisma.booking.count({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          checkOut: { gte: period.from, lte: period.to },
          ...(scopedUnits ? { unitId: { in: unitIds } } : {}),
        },
      })
    : 0;

  const revenueLines = [
    ...payments.map((p) => {
      const usage = String(
        p.business?.unit?.usage || p.tenant?.unit?.usage || '',
      ).toUpperCase();
      const type =
        usage === 'OFFICE'
          ? 'office'
          : usage === 'SHOP'
            ? 'shop'
            : p.businessId
              ? 'shop'
              : 'rent';
      return {
        type,
        name: p.tenant?.fullName || p.business?.businessName || '—',
        roomNumber: p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
        building:
          p.tenant?.unit?.building?.name || p.business?.unit?.building?.name || '—',
        floor: p.tenant?.unit?.floor?.name || p.business?.unit?.floor?.name || '—',
        period: p.month,
        date: p.paymentDate ? dayKey(p.paymentDate) : null,
        amount: money(p.amountPaid),
        method: p.method || null,
        status: p.status,
      };
    }),
    ...bookings.map((b) => ({
      type: 'guest',
      name: b.fullName,
      roomNumber: b.unit?.roomNumber || '—',
      building: b.unit?.building?.name || '—',
      floor: b.unit?.floor?.name || '—',
      period: `${dayKey(b.checkIn)} → ${dayKey(b.checkOut)}`,
      date: dayKey(b.checkIn),
      amount: money(b.amountPaid || 0),
      totalAmount: money(b.totalAmount),
      method: b.paymentMethod || null,
      status: b.status,
    })),
  ];

  return {
    period: {
      type: period.type,
      from: period.fromKey,
      to: period.toKey,
      label: period.label,
    },
    scope: {
      buildingId: building?.id || null,
      buildingName: building?.name || null,
      buildingCode: building?.code || null,
      floorId: floor?.id || null,
      floorName: floor?.name || null,
      propertyType,
      label: [
        floor
          ? `${building?.name || 'Building'} · ${floor.name}`
          : building
            ? building.name
            : 'All buildings',
        propertyType === 'ALL'
          ? null
          : propertyType === 'SHOP'
            ? 'Shops'
            : propertyType === 'OFFICE'
              ? 'Offices'
              : propertyType === 'APARTMENT'
                ? 'Apartments'
                : 'Guest',
      ]
        .filter(Boolean)
        .join(' · '),
    },
    summary: {
      totalRooms,
      available,
      occupied,
      reserved,
      occupancyRate,
      rentCollected: money(rentCollected),
      guestCollected: money(guestCollected),
      revenueTotal: money(grossRevenue),
      maintenanceCost: money(maintenanceCost),
      maintenanceCount: maintenanceAgg._count || 0,
      netRevenue: money(netRevenue),
      outstanding: money(outstandingTotal),
      bookingsCount: bookings.length,
      checkIns,
      checkOuts,
    },
    occupancyByFloor: Object.values(byFloorMap),
    rooms: units.map((u) => ({
      id: u.id,
      roomNumber: u.roomNumber,
      usage: u.usage,
      status: u.status,
      unitType: u.unitType,
      monthlyRent: money(u.monthlyRent),
      building: u.building?.name || '—',
      floor: u.floor?.name || '—',
    })),
    revenueLines,
    outstanding: outstandingPayments.map((p) => ({
      name: p.tenant?.fullName || p.business?.businessName || '—',
      roomNumber: p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
      building: p.tenant?.unit?.building?.name || p.business?.unit?.building?.name || '—',
      month: p.month,
      amountDue: money(p.amountDue),
      amountPaid: money(p.amountPaid),
      balance: money(Number(p.amountDue) - Number(p.amountPaid)),
      status: p.status,
    })),
    bookings: bookings.map((b) => ({
      code: b.code,
      fullName: b.fullName,
      roomNumber: b.unit?.roomNumber || '—',
      building: b.unit?.building?.name || '—',
      floor: b.unit?.floor?.name || '—',
      checkIn: dayKey(b.checkIn),
      checkOut: dayKey(b.checkOut),
      totalAmount: money(b.totalAmount),
      status: b.status,
    })),
  };
}

router.get(
  '/summary',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const report = await buildSummaryReport(req.query, req.user);
    return success(res, report);
  }),
);

router.get(
  '/export',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const report = await buildSummaryReport(req.query, req.user);
    const filename = `report-${report.period.from}-to-${report.period.to}`;

    const rows = [
      ...report.revenueLines.map((r) => ({
        section: 'Revenue',
        type: String(r.type || '').toUpperCase(),
        name: r.name,
        building: r.building,
        floor: r.floor,
        room: r.roomNumber,
        period: r.period,
        amount: r.amount,
        status: r.status,
      })),
      ...report.rooms.map((r) => ({
        section: 'Occupancy',
        type: String(r.usage || '').toUpperCase(),
        name: r.roomNumber,
        building: r.building,
        floor: r.floor,
        room: r.roomNumber,
        period: '—',
        amount: r.monthlyRent,
        status: r.status,
      })),
      ...report.outstanding.map((r) => ({
        section: 'Outstanding',
        type: 'BALANCE',
        name: r.name,
        building: r.building,
        floor: '—',
        room: r.roomNumber,
        period: r.month,
        amount: r.balance,
        status: r.status,
      })),
    ];

    const columns = [
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Name / Room', key: 'name', width: 22 },
      { header: 'Building', key: 'building', width: 18 },
      { header: 'Floor', key: 'floor', width: 14 },
      { header: 'Room', key: 'room', width: 10 },
      { header: 'Period / Status', key: 'period', width: 22 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    if (format === 'pdf') {
      const pdfColumns = [
        { header: 'Section', key: 'section', width: 14 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Name / Room', key: 'name', width: 20 },
        { header: 'Building', key: 'building', width: 18 },
        { header: 'Floor', key: 'floor', width: 12 },
        { header: 'Room', key: 'room', width: 10 },
        { header: 'Period', key: 'period', width: 16 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
      ];
      const subtitle = [
        report.scope?.label,
        report.period?.label,
        report.period?.from && report.period?.to
          ? `${report.period.from} → ${report.period.to}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const settingRows = await prisma.setting.findMany({ where: { key: { in: ['app.name', 'currency'] } } });
      const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
      const currency = settings.currency || 'KES';
      const sm = report.summary || {};
      const amt = (v) => `${currency} ${Number(v || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
      const kpis = [
        { label: 'Gross revenue', value: amt(sm.revenueTotal), accent: true },
        { label: 'Net revenue', value: amt(sm.netRevenue) },
        { label: 'Outstanding', value: amt(sm.outstanding), color: Number(sm.outstanding) > 0 ? '#b4232f' : undefined },
        {
          label: 'Occupancy',
          value: `${Math.round(Number(sm.occupancyRate) || 0)}% · ${sm.occupied ?? 0}/${sm.totalRooms ?? 0} units`,
        },
        { label: 'Maintenance cost', value: amt(sm.maintenanceCost) },
      ];
      return exportPdf(res, filename, 'Property Report', pdfColumns, rows, {
        subtitle,
        kpis,
        currency,
        companyName: settings['app.name'],
      });
    }
    return exportExcel(res, filename, columns, rows);
  }),
);

router.get(
  '/dashboard',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const today = dayKey();
    const month = currentMonthKey();
    const now = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const buildingScope = resourceBuildingFilter(req.user.buildingIds);
    const nestedScope =
      req.user.buildingIds === null
        ? {}
        : { unit: { buildingId: { in: req.user.buildingIds } } };
    const paymentScope =
      req.user.buildingIds === null
        ? {}
        : {
            OR: [
              { tenant: { unit: { buildingId: { in: req.user.buildingIds } } } },
              { business: { unit: { buildingId: { in: req.user.buildingIds } } } },
            ],
          };

    const [
      totalBuildings,
      totalRooms,
      occupiedRooms,
      availableRooms,
      currentGuests,
      currentTenants,
      commercialShops,
      commercialOffices,
      payments,
      bookingRevenue,
      todayCheckIns,
      todayCheckOuts,
    ] = await Promise.all([
      prisma.building.count({
        where: {
          deletedAt: null,
          ...(req.user.buildingIds === null ? {} : { id: { in: req.user.buildingIds } }),
        },
      }),
      prisma.unit.count({ where: { deletedAt: null, ...buildingScope } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'OCCUPIED', ...buildingScope } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'AVAILABLE', ...buildingScope } }),
      prisma.booking.count({ where: { deletedAt: null, status: 'CHECKED_IN', ...nestedScope } }),
      prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE', ...nestedScope } }),
      prisma.unit.count({ where: { deletedAt: null, usage: 'SHOP', ...buildingScope } }),
      prisma.unit.count({ where: { deletedAt: null, usage: 'OFFICE', ...buildingScope } }),
      prisma.monthlyPayment.findMany({
        where: { month, ...paymentScope },
        select: { amountPaid: true, amountDue: true, status: true },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          checkIn: { lte: todayEnd },
          checkOut: { gte: todayStart },
          ...nestedScope,
        },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          checkIn: { gte: todayStart, lte: todayEnd },
          ...nestedScope,
        },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          checkOut: { gte: todayStart, lte: todayEnd },
          ...nestedScope,
        },
      }),
    ]);

    const paymentRevenue = payments
      .filter((p) => Number(p.amountPaid) > 0)
      .reduce((s, p) => s + Number(p.amountPaid), 0);

    const guestRevenue = bookingRevenue
      .filter((b) => currentMonthKey(b.checkIn) === month)
      .reduce((s, b) => s + Number(b.amountPaid || 0), 0);

    const [outstandingAll, outstandingCharges, outstandingSales] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        select: { amountDue: true, amountPaid: true },
      }),
      prisma.leaseCharge.findMany({
        where: { deletedAt: null, status: { in: ['UNPAID', 'PARTIAL'] } },
        select: { amountDue: true, amountPaid: true },
      }),
      prisma.shopSale.findMany({
        where: {
          deletedAt: null,
          ownershipStatus: 'ACTIVE_OWNER',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        select: { salePrice: true, amountPaid: true },
      }),
    ]);

    const outstandingPayments =
      outstandingAll.reduce((s, p) => s + (Number(p.amountDue) - Number(p.amountPaid)), 0) +
      outstandingCharges.reduce((s, c) => s + (Number(c.amountDue) - Number(c.amountPaid)), 0) +
      outstandingSales.reduce((s, sale) => s + (Number(sale.salePrice) - Number(sale.amountPaid)), 0);

    const [
      forSale,
      forRent,
      bothOffer,
      soldUnits,
      reservedUnits,
      maintenanceUnits,
      activeBookings,
      upcomingCheckIns,
      upcomingCheckOuts,
      expenseAgg,
      expenseMonth,
      maintenanceAgg,
      maintenanceMonth,
      workActive,
      workCompleted,
      workPending,
      bookingOutstanding,
      salesAgg,
      guestBookingPaid,
    ] = await Promise.all([
      prisma.building.count({
        where: {
          deletedAt: null,
          transactionType: { in: ['FOR_SALE', 'BOTH'] },
          ...(req.user.buildingIds === null ? {} : { id: { in: req.user.buildingIds } }),
        },
      }),
      prisma.building.count({
        where: {
          deletedAt: null,
          transactionType: { in: ['FOR_RENT', 'BOTH'] },
          ...(req.user.buildingIds === null ? {} : { id: { in: req.user.buildingIds } }),
        },
      }),
      prisma.building.count({
        where: {
          deletedAt: null,
          transactionType: 'BOTH',
          ...(req.user.buildingIds === null ? {} : { id: { in: req.user.buildingIds } }),
        },
      }),
      prisma.unit.count({ where: { deletedAt: null, status: 'SOLD', ...buildingScope } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'RESERVED', ...buildingScope } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'MAINTENANCE', ...buildingScope } }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          ...nestedScope,
        },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkIn: { gt: todayEnd },
          ...nestedScope,
        },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkOut: { gt: todayEnd },
          ...nestedScope,
        },
      }),
      prisma.expense.aggregate({
        where: { deletedAt: null, ...buildingScope },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          deletedAt: null,
          expenseDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          ...buildingScope,
        },
        _sum: { amount: true },
      }),
      prisma.maintenanceRecord.aggregate({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          ...buildingScope,
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.maintenanceRecord.aggregate({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          workDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          ...buildingScope,
        },
        _sum: { amount: true },
      }),
      prisma.workProgress.count({
        where: {
          deletedAt: null,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD'] },
          ...buildingScope,
        },
      }),
      prisma.workProgress.count({
        where: { deletedAt: null, status: 'COMPLETED', ...buildingScope },
      }),
      prisma.workProgress.count({
        where: {
          deletedAt: null,
          status: { in: ['NOT_STARTED', 'ON_HOLD'] },
          ...buildingScope,
        },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          status: { not: 'CANCELLED' },
          ...nestedScope,
        },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.unit.aggregate({
        where: { deletedAt: null, status: 'SOLD', ...buildingScope },
        _sum: { salePrice: true },
      }),
      prisma.booking.aggregate({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          ...nestedScope,
        },
        _sum: { amountPaid: true },
      }),
    ]);

    const guestOutstanding = bookingOutstanding.reduce(
      (s, b) => s + (Number(b.totalAmount) - Number(b.amountPaid)),
      0,
    );

    const activeWork = await prisma.workProgress.findMany({
      where: {
        deletedAt: null,
        status: { in: ['IN_PROGRESS', 'NOT_STARTED', 'ON_HOLD'] },
        ...buildingScope,
      },
      include: {
        building: { select: { name: true, code: true } },
        unit: { select: { roomNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    });

    return success(res, {
      totalBuildings,
      totalRooms,
      occupiedRooms,
      availableRooms,
      currentGuests,
      currentTenants,
      commercialShops,
      commercialOffices,
      monthlyRevenue: Math.round((paymentRevenue + guestRevenue) * 100) / 100,
      outstandingPayments: Math.round((outstandingPayments + guestOutstanding) * 100) / 100,
      todayCheckIns,
      todayCheckOuts,
      forSale,
      forRent,
      bothOffer,
      soldUnits,
      reservedUnits,
      maintenanceUnits,
      activeBookings,
      upcomingCheckIns,
      upcomingCheckOuts,
      totalExpenses: Number(expenseAgg._sum.amount || 0),
      expensesThisMonth: Number(expenseMonth._sum.amount || 0),
      maintenanceSpent: Number(maintenanceAgg._sum.amount || 0),
      maintenanceThisMonth: Number(maintenanceMonth._sum.amount || 0),
      maintenanceCount: maintenanceAgg._count || 0,
      totalRentalIncome: Math.round(
        (paymentRevenue + Number(guestBookingPaid._sum.amountPaid || 0)) * 100,
      ) / 100,
      netRevenue: Math.round(
        (paymentRevenue +
          Number(guestBookingPaid._sum.amountPaid || 0) -
          Number(maintenanceAgg._sum.amount || 0)) *
          100,
      ) / 100,
      totalSales: Number(salesAgg._sum.salePrice || 0),
      workActive,
      workCompleted,
      workPending,
      activeWork: activeWork.map((w) => ({
        id: w.id,
        title: w.title,
        progressPercent: w.progressPercent,
        status: w.status,
        building: w.building?.name,
        unit: w.unit?.roomNumber || null,
        assignedTo: w.assignedTo,
      })),
    });
  }),
);

router.get(
  '/occupancy',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const units = await prisma.unit.findMany({
      where: { deletedAt: null, ...resourceBuildingFilter(req.user.buildingIds) },
      select: {
        id: true,
        roomNumber: true,
        usage: true,
        status: true,
        unitType: true,
        building: { select: { id: true, code: true, name: true } },
        floor: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ buildingId: 'asc' }, { roomNumber: 'asc' }],
    });

    const byBuilding = {};
    for (const u of units) {
      const key = u.building.code;
      if (!byBuilding[key]) {
        byBuilding[key] = {
          building: u.building,
          total: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          units: [],
        };
      }
      byBuilding[key].total += 1;
      if (u.status === 'AVAILABLE') byBuilding[key].available += 1;
      if (u.status === 'OCCUPIED') byBuilding[key].occupied += 1;
      if (u.status === 'RESERVED') byBuilding[key].reserved += 1;
      byBuilding[key].units.push(u);
    }

    const total = units.length;
    const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
    const rate = total ? Math.round((occupied / total) * 10000) / 100 : 0;

    return success(res, {
      occupancyRate: rate,
      total,
      occupied,
      available: units.filter((u) => u.status === 'AVAILABLE').length,
      reserved: units.filter((u) => u.status === 'RESERVED').length,
      byBuilding: Object.values(byBuilding),
    });
  }),
);

router.get(
  '/revenue',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const month = req.query.month ? String(req.query.month) : currentMonthKey();

    const payments = await prisma.monthlyPayment.findMany({
      where: { month },
      include: {
        tenant: { select: { fullName: true } },
        business: { select: { businessName: true } },
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        checkIn: {
          gte: new Date(`${month}-01T00:00:00.000Z`),
          lt: new Date(
            new Date(`${month}-01T00:00:00.000Z`).getFullYear(),
            new Date(`${month}-01T00:00:00.000Z`).getMonth() + 1,
            1,
          ),
        },
      },
      select: {
        code: true,
        fullName: true,
        totalAmount: true,
        amountPaid: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    });

    const rentCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
    // Guest revenue = amount paid, not booking total
    const guestCollected = bookings.reduce((s, b) => s + Number(b.amountPaid || 0), 0);

    return success(res, {
      month,
      rentCollected: Math.round(rentCollected * 100) / 100,
      guestCollected: Math.round(guestCollected * 100) / 100,
      total: Math.round((rentCollected + guestCollected) * 100) / 100,
      payments: payments.map((p) => ({
        ...p,
        amountDue: Number(p.amountDue),
        amountPaid: Number(p.amountPaid),
      })),
      bookings: bookings.map((b) => ({
        ...b,
        totalAmount: Number(b.totalAmount),
        amountPaid: Number(b.amountPaid || 0),
        balance: Math.max(0, Math.round((Number(b.totalAmount) - Number(b.amountPaid || 0)) * 100) / 100),
      })),
    });
  }),
);

router.get(
  '/outstanding',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const unitSelect = {
      id: true,
      roomNumber: true,
      usage: true,
      building: { select: { name: true, code: true } },
      floor: { select: { name: true, level: true } },
    };
    const usageLabel = (usage) =>
      String(usage || '').toUpperCase() === 'OFFICE' ? 'Office' : 'Shop';

    const [rentRows, chargeRows, sales, bookings] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
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
        orderBy: [{ month: 'asc' }],
      }),
      prisma.leaseCharge.findMany({
        where: {
          deletedAt: null,
          status: { in: ['UNPAID', 'PARTIAL'] },
        },
        include: {
          unit: { select: unitSelect },
          tenant: { select: { id: true, fullName: true, phone: true } },
          business: { select: { id: true, businessName: true, phone: true } },
        },
        orderBy: [{ month: 'asc' }, { chargeDate: 'asc' }],
      }),
      prisma.shopSale.findMany({
        where: {
          deletedAt: null,
          ownershipStatus: 'ACTIVE_OWNER',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        include: {
          unit: { select: unitSelect },
        },
        orderBy: { saleDate: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        include: {
          unit: { select: unitSelect },
        },
        orderBy: { checkIn: 'asc' },
      }),
    ]);

    const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const remaining = (due, paid) => Math.max(0, money(due - paid));

    const items = [
      ...rentRows.map((p) => {
        const amountDue = money(p.amountDue);
        const amountPaid = money(p.amountPaid);
        return {
          id: p.id,
          kind: 'RENT',
          source: 'monthly_payment',
          name: p.tenant?.fullName || p.business?.businessName || '—',
          phone: p.tenant?.phone || p.business?.phone || null,
          unitId: p.tenant?.unit?.id || p.business?.unit?.id || null,
          roomNumber: p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
          building: p.tenant?.unit?.building?.name || p.business?.unit?.building?.name || '',
          floor: p.tenant?.unit?.floor?.name || p.business?.unit?.floor?.name || '',
          month: p.month,
          description: `Rent ${p.month}`,
          amountDue,
          amountPaid,
          balance: remaining(amountDue, amountPaid),
          status: p.status,
          method: p.method,
          paymentDate: p.paymentDate,
          recordAction: 'UPDATE_PAYMENT',
        };
      }),
      ...chargeRows.map((c) => {
        const amountDue = money(c.amountDue);
        const amountPaid = money(c.amountPaid);
        const isOwner = !c.businessId && !c.tenantId;
        return {
          id: c.id,
          kind: isOwner ? 'OWNER_MONTHLY' : 'OTHER_CHARGE',
          source: 'lease_charge',
          name:
            c.business?.businessName ||
            c.tenant?.fullName ||
            (isOwner ? `${usageLabel(c.unit?.usage)} owner` : '—'),
          phone: c.business?.phone || c.tenant?.phone || null,
          unitId: c.unitId,
          roomNumber: c.unit?.roomNumber || '—',
          building: c.unit?.building?.name || '',
          floor: c.unit?.floor?.name || '',
          month: c.month,
          description: c.description,
          usage: c.unit?.usage || null,
          category: c.category,
          amountDue,
          amountPaid,
          balance: remaining(amountDue, amountPaid),
          status: c.status,
          method: null,
          paymentDate: null,
          recordAction: 'UPDATE_CHARGE',
        };
      }),
      ...sales.map((s) => {
        const amountDue = money(s.salePrice);
        const amountPaid = money(s.amountPaid);
        return {
          id: s.id,
          kind: 'SALE_BALANCE',
          source: 'shop_sale',
          name: s.buyerName,
          phone: s.phone,
          unitId: s.unitId,
          roomNumber: s.unit?.roomNumber || '—',
          building: s.unit?.building?.name || '',
          floor: s.unit?.floor?.name || '',
          month: null,
          description: `${usageLabel(s.unit?.usage)} sale balance`,
          usage: s.unit?.usage || null,
          amountDue,
          amountPaid,
          balance: remaining(amountDue, amountPaid),
          status: s.paymentStatus,
          method: null,
          paymentDate: s.saleDate,
          recordAction: 'SALE_PAYMENT',
        };
      }),
      ...bookings.map((b) => {
        const amountDue = money(b.totalAmount);
        const amountPaid = money(b.amountPaid);
        return {
          id: b.id,
          kind: 'GUEST',
          source: 'booking',
          name: b.fullName,
          phone: b.phone || null,
          unitId: b.unitId,
          roomNumber: b.unit?.roomNumber || '—',
          building: b.unit?.building?.name || '',
          floor: b.unit?.floor?.name || '',
          month: null,
          description: `Guest stay ${b.code || ''}`.trim(),
          amountDue,
          amountPaid,
          balance: remaining(amountDue, amountPaid),
          status: b.paymentStatus,
          method: b.paymentMethod,
          paymentDate: b.checkIn,
          recordAction: 'BOOKING_PAYMENT',
        };
      }),
    ].filter((r) => r.balance > 0);

    const total = items.reduce((s, r) => s + r.balance, 0);

    return success(res, {
      total: money(total),
      count: items.length,
      items,
      byKind: {
        rent: money(items.filter((i) => i.kind === 'RENT').reduce((s, i) => s + i.balance, 0)),
        otherCharges: money(
          items.filter((i) => i.kind === 'OTHER_CHARGE').reduce((s, i) => s + i.balance, 0),
        ),
        ownerMonthly: money(
          items.filter((i) => i.kind === 'OWNER_MONTHLY').reduce((s, i) => s + i.balance, 0),
        ),
        saleBalance: money(
          items.filter((i) => i.kind === 'SALE_BALANCE').reduce((s, i) => s + i.balance, 0),
        ),
        guest: money(items.filter((i) => i.kind === 'GUEST').reduce((s, i) => s + i.balance, 0)),
      },
    });
  }),
);

router.get(
  '/guests',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { deletedAt: null },
      include: {
        unit: {
          include: {
            building: { select: { id: true, code: true, name: true } },
            floor: { select: { id: true, name: true, level: true } },
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    return success(res, {
      current: bookings.filter((b) => b.status === 'CHECKED_IN').length,
      upcoming: bookings.filter((b) => b.status === 'CONFIRMED').length,
      items: bookings.map((b) => ({
        ...b,
        monthlyRent: Number(b.monthlyRent),
        dailyRent: Number(b.dailyRent),
        discount: Number(b.discount),
        totalAmount: Number(b.totalAmount),
      })),
    });
  }),
);

router.get(
  '/tenants',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const [tenants, businesses] = await Promise.all([
      prisma.tenant.findMany({
        where: { deletedAt: null },
        include: {
          unit: {
            include: {
              building: { select: { id: true, code: true, name: true } },
            },
          },
          payments: { orderBy: { month: 'desc' }, take: 3 },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.business.findMany({
        where: { deletedAt: null },
        include: {
          unit: {
            select: {
              id: true,
              roomNumber: true,
              usage: true,
              building: { select: { id: true, code: true, name: true } },
            },
          },
          payments: { orderBy: { month: 'desc' }, take: 3 },
        },
        orderBy: { businessName: 'asc' },
      }),
    ]);

    const mapBiz = (b) => ({
      ...b,
      usage: b.unit?.usage || null,
      monthlyRent: Number(b.monthlyRent),
      discount: Number(b.discount),
      payments: b.payments.map((p) => ({
        ...p,
        amountDue: Number(p.amountDue),
        amountPaid: Number(p.amountPaid),
      })),
    });
    const shopBiz = businesses.filter((b) => b.unit?.usage === 'SHOP');
    const officeBiz = businesses.filter((b) => b.unit?.usage === 'OFFICE');

    return success(res, {
      apartments: {
        active: tenants.filter((t) => t.status === 'ACTIVE').length,
        items: tenants.map((t) => ({
          ...t,
          monthlyRent: Number(t.monthlyRent),
          discount: Number(t.discount),
          payments: t.payments.map((p) => ({
            ...p,
            amountDue: Number(p.amountDue),
            amountPaid: Number(p.amountPaid),
          })),
        })),
      },
      shops: {
        active: shopBiz.filter((b) => b.status === 'ACTIVE').length,
        items: shopBiz.map(mapBiz),
      },
      offices: {
        active: officeBiz.filter((b) => b.status === 'ACTIVE').length,
        items: officeBiz.map(mapBiz),
      },
    });
  }),
);

export default router;

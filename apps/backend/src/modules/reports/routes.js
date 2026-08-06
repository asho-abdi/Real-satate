import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { currentMonthKey } from '../../utils/rent.js';
import { exportExcel, exportPdf } from '../../utils/export.js';

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

async function buildSummaryReport(query) {
  const period = resolvePeriod(query);
  const buildingId = query.buildingId ? String(query.buildingId) : null;
  const floorId = query.floorId ? String(query.floorId) : null;

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
    if (!building) building = floor.building;
  }

  const unitWhere = {
    deletedAt: null,
    ...(buildingId ? { buildingId } : {}),
    ...(floorId ? { floorId } : {}),
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

  const scopedUnits = Boolean(buildingId || floorId);
  const bookingWhere = {
    deletedAt: null,
    status: { not: 'CANCELLED' },
    checkIn: { gte: period.from, lte: period.to },
    ...(scopedUnits ? { unitId: { in: unitIds } } : {}),
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

  const payments = await prisma.monthlyPayment.findMany({
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
              building: { select: { name: true } },
              floor: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ month: 'desc' }, { paymentDate: 'desc' }],
  });

  const outstandingPayments = await prisma.monthlyPayment.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...paymentUnitFilter,
    },
    include: {
      tenant: {
        select: {
          fullName: true,
          unit: { select: { roomNumber: true, building: { select: { name: true } } } },
        },
      },
      business: {
        select: {
          businessName: true,
          unit: { select: { roomNumber: true, building: { select: { name: true } } } },
        },
      },
    },
    orderBy: { month: 'asc' },
  });

  const guestCollected = bookings.reduce((s, b) => s + Number(b.totalAmount), 0);
  const rentCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const outstandingTotal = outstandingPayments.reduce(
    (s, p) => s + (Number(p.amountDue) - Number(p.amountPaid)),
    0,
  );

  const checkIns = bookings.length;
  const checkOuts = await prisma.booking.count({
    where: {
      deletedAt: null,
      status: { not: 'CANCELLED' },
      checkOut: { gte: period.from, lte: period.to },
      ...(scopedUnits ? { unitId: { in: unitIds } } : {}),
    },
  });

  const revenueLines = [
    ...payments.map((p) => ({
      type: 'rent',
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
    })),
    ...bookings.map((b) => ({
      type: 'guest',
      name: b.fullName,
      roomNumber: b.unit?.roomNumber || '—',
      building: b.unit?.building?.name || '—',
      floor: b.unit?.floor?.name || '—',
      period: `${dayKey(b.checkIn)} → ${dayKey(b.checkOut)}`,
      date: dayKey(b.checkIn),
      amount: money(b.totalAmount),
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
      label: floor
        ? `${building?.name || 'Building'} · ${floor.name}`
        : building
          ? building.name
          : 'All buildings',
    },
    summary: {
      totalRooms,
      available,
      occupied,
      reserved,
      occupancyRate,
      rentCollected: money(rentCollected),
      guestCollected: money(guestCollected),
      revenueTotal: money(rentCollected + guestCollected),
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
    const report = await buildSummaryReport(req.query);
    return success(res, report);
  }),
);

router.get(
  '/export',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const report = await buildSummaryReport(req.query);
    const title = `Property Report · ${report.scope.label} · ${report.period.label}`;
    const filename = `report-${report.period.from}-to-${report.period.to}`;

    const rows = [
      ...report.revenueLines.map((r) => ({
        section: 'Revenue',
        type: r.type,
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
        type: r.usage,
        name: r.roomNumber,
        building: r.building,
        floor: r.floor,
        room: r.roomNumber,
        period: r.status,
        amount: r.monthlyRent,
        status: r.status,
      })),
      ...report.outstanding.map((r) => ({
        section: 'Outstanding',
        type: 'balance',
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
      return exportPdf(res, filename, title, columns, rows);
    }
    return exportExcel(res, filename, columns, rows);
  }),
);

router.get(
  '/dashboard',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const today = dayKey();
    const month = currentMonthKey();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [
      totalBuildings,
      totalRooms,
      occupiedRooms,
      availableRooms,
      currentGuests,
      currentTenants,
      commercialShops,
      payments,
      bookingRevenue,
      todayCheckIns,
      todayCheckOuts,
    ] = await Promise.all([
      prisma.building.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { deletedAt: null } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'OCCUPIED' } }),
      prisma.unit.count({ where: { deletedAt: null, status: 'AVAILABLE' } }),
      prisma.booking.count({ where: { deletedAt: null, status: 'CHECKED_IN' } }),
      prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.unit.count({ where: { deletedAt: null, usage: 'SHOP' } }),
      prisma.monthlyPayment.findMany({
        where: { month },
        select: { amountPaid: true, amountDue: true, status: true },
      }),
      prisma.booking.findMany({
        where: { deletedAt: null, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, checkIn: true },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          checkIn: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          checkOut: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    const paymentRevenue = payments
      .filter((p) => Number(p.amountPaid) > 0)
      .reduce((s, p) => s + Number(p.amountPaid), 0);

    const guestRevenue = bookingRevenue
      .filter((b) => currentMonthKey(b.checkIn) === month)
      .reduce((s, b) => s + Number(b.totalAmount), 0);

    const outstandingAll = await prisma.monthlyPayment.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
      select: { amountDue: true, amountPaid: true },
    });

    const outstandingPayments = outstandingAll.reduce(
      (s, p) => s + (Number(p.amountDue) - Number(p.amountPaid)),
      0,
    );

    return success(res, {
      totalBuildings,
      totalRooms,
      occupiedRooms,
      availableRooms,
      currentGuests,
      currentTenants,
      commercialShops,
      monthlyRevenue: Math.round((paymentRevenue + guestRevenue) * 100) / 100,
      outstandingPayments: Math.round(outstandingPayments * 100) / 100,
      todayCheckIns,
      todayCheckOuts,
    });
  }),
);

router.get(
  '/occupancy',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const units = await prisma.unit.findMany({
      where: { deletedAt: null },
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
        checkIn: true,
        checkOut: true,
        status: true,
      },
    });

    const rentCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
    const guestCollected = bookings.reduce((s, b) => s + Number(b.totalAmount), 0);

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
      })),
    });
  }),
);

router.get(
  '/outstanding',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    const payments = await prisma.monthlyPayment.findMany({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
      include: {
        tenant: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            unit: {
              select: {
                roomNumber: true,
                building: { select: { name: true, code: true } },
              },
            },
          },
        },
        business: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            unit: {
              select: {
                roomNumber: true,
                building: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: [{ month: 'asc' }],
    });

    const rows = payments.map((p) => ({
      ...p,
      amountDue: Number(p.amountDue),
      amountPaid: Number(p.amountPaid),
      balance: Math.round((Number(p.amountDue) - Number(p.amountPaid)) * 100) / 100,
    }));

    const total = rows.reduce((s, r) => s + r.balance, 0);

    return success(res, {
      total: Math.round(total * 100) / 100,
      count: rows.length,
      items: rows,
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
            include: {
              building: { select: { id: true, code: true, name: true } },
            },
          },
          payments: { orderBy: { month: 'desc' }, take: 3 },
        },
        orderBy: { businessName: 'asc' },
      }),
    ]);

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
        active: businesses.filter((b) => b.status === 'ACTIVE').length,
        items: businesses.map((b) => ({
          ...b,
          monthlyRent: Number(b.monthlyRent),
          discount: Number(b.discount),
          payments: b.payments.map((p) => ({
            ...p,
            amountDue: Number(p.amountDue),
            amountPaid: Number(p.amountPaid),
          })),
        })),
      },
    });
  }),
);

export default router;

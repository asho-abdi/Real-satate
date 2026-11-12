import prisma from '../config/database.js';

function decimalToNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

function occupancyRate(occupied, total) {
  if (!total) return 0;
  return Number(((occupied / total) * 100).toFixed(2));
}

export async function getDashboardStats() {
  const soft = { deletedAt: null };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalBuildings,
    totalFloors,
    totalUnits,
    availableUnits,
    occupiedUnits,
    reservedUnits,
    cleaningUnits,
    maintenanceUnits,
    residentialTenants,
    commercialTenants,
    guests,
    activeLeases,
    openMaintenance,
    paymentsAgg,
    invoiceBalance,
    upcomingCheckIns,
    upcomingCheckOuts,
    unitsByMode,
    occupiedByMode,
  ] = await Promise.all([
    prisma.building.count({ where: soft }),
    prisma.floor.count({ where: soft }),
    prisma.unit.count({ where: soft }),
    prisma.unit.count({ where: { ...soft, status: 'AVAILABLE' } }),
    prisma.unit.count({ where: { ...soft, status: 'OCCUPIED' } }),
    prisma.unit.count({ where: { ...soft, status: 'RESERVED' } }),
    prisma.unit.count({ where: { ...soft, status: 'CLEANING' } }),
    prisma.unit.count({ where: { ...soft, status: 'MAINTENANCE' } }),
    prisma.residentialTenant.count({ where: soft }),
    prisma.commercialTenant.count({ where: soft }),
    prisma.guest.count({ where: soft }),
    prisma.lease.count({ where: { ...soft, status: 'ACTIVE' } }),
    prisma.maintenanceRequest.count({
      where: { ...soft, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
    }),
    prisma.payment.aggregate({
      where: { ...soft, status: 'COMPLETED', paidAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { ...soft, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
      _sum: { balance: true },
    }),
    prisma.reservation.count({
      where: {
        ...soft,
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkInDate: { gte: now, lte: nextWeek },
      },
    }),
    prisma.reservation.count({
      where: {
        ...soft,
        status: { in: ['CHECKED_IN', 'CONFIRMED'] },
        checkOutDate: { gte: now, lte: nextWeek },
      },
    }),
    prisma.unit.groupBy({
      by: ['occupancyMode'],
      where: soft,
      _count: true,
    }),
    prisma.unit.groupBy({
      by: ['occupancyMode'],
      where: { ...soft, status: 'OCCUPIED' },
      _count: true,
    }),
  ]);

  const modeTotals = Object.fromEntries(unitsByMode.map((r) => [r.occupancyMode, r._count]));
  const modeOccupied = Object.fromEntries(occupiedByMode.map((r) => [r.occupancyMode, r._count]));

  return {
    totalBuildings,
    totalFloors,
    totalUnits,
    availableUnits,
    occupiedUnits,
    reservedUnits,
    cleaningUnits,
    maintenanceUnits,
    vacantUnits: availableUnits,
    residentialTenants,
    commercialTenants,
    airbnbGuests: guests,
    activeTenants: residentialTenants + commercialTenants,
    activeLeases,
    openMaintenance,
    upcomingCheckIns,
    upcomingCheckOuts,
    monthlyRevenue: decimalToNumber(paymentsAgg._sum.amount),
    outstandingBalance: decimalToNumber(invoiceBalance._sum.balance),
    occupancyRate: occupancyRate(occupiedUnits, totalUnits),
    residentialOccupancy: occupancyRate(
      modeOccupied.RESIDENTIAL || 0,
      modeTotals.RESIDENTIAL || 0,
    ),
    commercialOccupancy: occupancyRate(
      modeOccupied.COMMERCIAL || 0,
      modeTotals.COMMERCIAL || 0,
    ),
    airbnbOccupancy: occupancyRate(modeOccupied.AIRBNB || 0, modeTotals.AIRBNB || 0),
    unitsByStatus: {
      AVAILABLE: availableUnits,
      OCCUPIED: occupiedUnits,
      RESERVED: reservedUnits,
      CLEANING: cleaningUnits,
      MAINTENANCE: maintenanceUnits,
    },
    counts: {
      buildings: totalBuildings,
      floors: totalFloors,
      units: totalUnits,
      residentialTenants,
      commercialTenants,
      guests,
      activeLeases,
      openMaintenance,
      paymentsThisMonth: paymentsAgg._count,
    },
    revenue: {
      paymentsTotal: decimalToNumber(paymentsAgg._sum.amount),
    },
    occupancy: {
      occupied: occupiedUnits,
      total: totalUnits,
      rate: occupancyRate(occupiedUnits, totalUnits) / 100,
    },
  };
}

export async function getOccupancyReport() {
  const soft = { deletedAt: null };
  const [byStatus, byMode, byBuilding] = await Promise.all([
    prisma.unit.groupBy({ by: ['status'], where: soft, _count: true }),
    prisma.unit.groupBy({ by: ['occupancyMode'], where: soft, _count: true }),
    prisma.unit.groupBy({
      by: ['buildingId', 'status'],
      where: soft,
      _count: true,
    }),
  ]);

  const buildings = await prisma.building.findMany({
    where: soft,
    select: { id: true, code: true, name: true },
  });
  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b]));

  const buildingStats = {};
  for (const row of byBuilding) {
    if (!buildingStats[row.buildingId]) {
      const b = buildingMap[row.buildingId] || { id: row.buildingId, code: '', name: '' };
      buildingStats[row.buildingId] = {
        buildingId: row.buildingId,
        code: b.code,
        name: b.name,
        total: 0,
        occupied: 0,
        byStatus: {},
      };
    }
    buildingStats[row.buildingId].total += row._count;
    buildingStats[row.buildingId].byStatus[row.status] = row._count;
    if (row.status === 'OCCUPIED') buildingStats[row.buildingId].occupied += row._count;
  }

  const buildingRows = Object.values(buildingStats).map((b) => ({
    ...b,
    occupancyRate: occupancyRate(b.occupied, b.total),
  }));

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count })),
    byMode: byMode.map((r) => ({ occupancyMode: r.occupancyMode, count: r._count })),
    byBuilding: buildingRows,
  };
}

export async function getRevenueByMonth() {
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, status: 'COMPLETED', paidAt: { not: null } },
    select: { amount: true, paidAt: true, type: true },
    orderBy: { paidAt: 'asc' },
  });

  /** @type {Record<string, { month: string, residential: number, commercial: number, airbnb: number, total: number }>} */
  const byMonth = {};
  for (const p of payments) {
    const d = new Date(p.paidAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) {
      byMonth[key] = { month: key, residential: 0, commercial: 0, airbnb: 0, other: 0, total: 0 };
    }
    const amount = decimalToNumber(p.amount);
    byMonth[key].total += amount;
    if (p.type === 'MONTHLY_RENT') byMonth[key].residential += amount;
    else if (p.type === 'BUSINESS_RENT') byMonth[key].commercial += amount;
    else if (p.type === 'DAILY_BOOKING') byMonth[key].airbnb += amount;
    else byMonth[key].other += amount;
  }

  return Object.values(byMonth);
}

export async function getFinancialReport() {
  const soft = { deletedAt: null };

  const [invoicesAgg, paymentsAgg, invoicesByStatus, paymentsByStatus, utilityAgg, serviceAgg] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: soft,
        _sum: { total: true, balance: true, subtotal: true, tax: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: soft,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: soft,
        _sum: { total: true, balance: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['status'],
        where: soft,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.utilityCharge.aggregate({
        where: soft,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.serviceCharge.aggregate({
        where: soft,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  const completedPayments = await prisma.payment.aggregate({
    where: { ...soft, status: 'COMPLETED' },
    _sum: { amount: true },
  });

  return {
    invoices: {
      count: invoicesAgg._count,
      total: decimalToNumber(invoicesAgg._sum.total),
      balance: decimalToNumber(invoicesAgg._sum.balance),
      byStatus: invoicesByStatus.map((r) => ({
        status: r.status,
        count: r._count,
        total: decimalToNumber(r._sum.total),
        balance: decimalToNumber(r._sum.balance),
      })),
    },
    payments: {
      count: paymentsAgg._count,
      total: decimalToNumber(paymentsAgg._sum.amount),
      completed: decimalToNumber(completedPayments._sum.amount),
      byStatus: paymentsByStatus.map((r) => ({
        status: r.status,
        count: r._count,
        total: decimalToNumber(r._sum.amount),
      })),
    },
    utilityCharges: {
      count: utilityAgg._count,
      total: decimalToNumber(utilityAgg._sum.amount),
    },
    serviceCharges: {
      count: serviceAgg._count,
      total: decimalToNumber(serviceAgg._sum.amount),
    },
  };
}

export async function getBuildingReport() {
  const soft = { deletedAt: null };
  const buildings = await prisma.building.findMany({
    where: soft,
    include: {
      _count: {
        select: {
          floors: { where: soft },
          units: { where: soft },
          maintenance: { where: { ...soft, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const unitCounts = await prisma.unit.groupBy({
    by: ['buildingId', 'status'],
    where: soft,
    _count: true,
  });

  const statusByBuilding = {};
  for (const row of unitCounts) {
    if (!statusByBuilding[row.buildingId]) statusByBuilding[row.buildingId] = {};
    statusByBuilding[row.buildingId][row.status] = row._count;
  }

  return buildings.map((b) => {
    const byStatus = statusByBuilding[b.id] || {};
    const occupied = byStatus.OCCUPIED || 0;
    const total = b._count.units;
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      city: b.city,
      floors: b._count.floors,
      units: total,
      occupied,
      available: byStatus.AVAILABLE || 0,
      openMaintenance: b._count.maintenance,
      occupancyRate: occupancyRate(occupied, total),
      byStatus,
    };
  });
}

export async function getUnitReport() {
  const soft = { deletedAt: null };
  const units = await prisma.unit.findMany({
    where: soft,
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, floorNumber: true, name: true } },
      category: { select: { id: true, name: true } },
      type: { select: { id: true, name: true } },
    },
    orderBy: { code: 'asc' },
  });

  return units.map((u) => ({
    id: u.id,
    code: u.code,
    name: u.name,
    occupancyMode: u.occupancyMode,
    status: u.status,
    cleaningStatus: u.cleaningStatus,
    rentPrice: decimalToNumber(u.rentPrice),
    dailyRate: decimalToNumber(u.dailyRate),
    building: u.building?.name || u.building?.code || '',
    floor: u.floor?.name || (u.floor ? String(u.floor.floorNumber) : ''),
    category: u.category?.name || '',
    type: u.type?.name || '',
  }));
}

export async function getTenantReport() {
  const soft = { deletedAt: null };
  const [residential, commercial, guests] = await Promise.all([
    prisma.residentialTenant.findMany({
      where: soft,
      include: { unit: { select: { id: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.commercialTenant.findMany({
      where: soft,
      include: { unit: { select: { id: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.guest.count({ where: soft }),
  ]);

  return {
    residential: residential.map((t) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      phone: t.phone,
      status: t.status,
      unit: t.unit?.code || '',
    })),
    commercial: commercial.map((t) => ({
      id: t.id,
      companyName: t.companyName,
      contactName: t.contactName,
      email: t.email,
      phone: t.phone,
      status: t.status,
      unit: t.unit?.code || '',
    })),
    guests,
    totals: {
      residential: residential.length,
      commercial: commercial.length,
      guests,
    },
  };
}

export async function getMaintenanceReport() {
  const soft = { deletedAt: null };
  const [byStatus, byPriority, openItems] = await Promise.all([
    prisma.maintenanceRequest.groupBy({ by: ['status'], where: soft, _count: true }),
    prisma.maintenanceRequest.groupBy({ by: ['priority'], where: soft, _count: true }),
    prisma.maintenanceRequest.findMany({
      where: { ...soft, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      include: {
        unit: { select: { code: true } },
        building: { select: { code: true, name: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count })),
    byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count })),
    openItems: openItems.map((m) => ({
      id: m.id,
      code: m.code,
      title: m.title,
      priority: m.priority,
      status: m.status,
      unit: m.unit?.code || '',
      building: m.building?.name || m.building?.code || '',
      technician: m.technician
        ? `${m.technician.firstName} ${m.technician.lastName}`
        : '',
      openedAt: m.openedAt,
    })),
  };
}

/**
 * Flatten report data into columns + rows for export.
 * @param {string} type
 */
export async function getExportDataset(type) {
  switch (type) {
    case 'dashboard': {
      const data = await getDashboardStats();
      return {
        title: 'Dashboard Summary',
        columns: [
          { header: 'Metric', key: 'metric' },
          { header: 'Value', key: 'value' },
        ],
        rows: [
          { metric: 'totalBuildings', value: data.totalBuildings },
          { metric: 'totalFloors', value: data.totalFloors },
          { metric: 'totalUnits', value: data.totalUnits },
          { metric: 'occupiedUnits', value: data.occupiedUnits },
          { metric: 'availableUnits', value: data.availableUnits },
          { metric: 'occupancyRate', value: data.occupancyRate },
          { metric: 'monthlyRevenue', value: data.monthlyRevenue },
          { metric: 'outstandingBalance', value: data.outstandingBalance },
          { metric: 'activeLeases', value: data.activeLeases },
          { metric: 'openMaintenance', value: data.openMaintenance },
        ],
      };
    }
    case 'occupancy': {
      const data = await getOccupancyReport();
      return {
        title: 'Occupancy Report',
        columns: [
          { header: 'Building', key: 'name' },
          { header: 'Code', key: 'code' },
          { header: 'Total', key: 'total' },
          { header: 'Occupied', key: 'occupied' },
          { header: 'Occupancy %', key: 'occupancyRate' },
        ],
        rows: data.byBuilding,
      };
    }
    case 'revenue': {
      const rows = await getRevenueByMonth();
      return {
        title: 'Revenue by Month',
        columns: [
          { header: 'Month', key: 'month' },
          { header: 'Residential', key: 'residential' },
          { header: 'Commercial', key: 'commercial' },
          { header: 'Airbnb', key: 'airbnb' },
          { header: 'Total', key: 'total' },
        ],
        rows,
      };
    }
    case 'financial': {
      const data = await getFinancialReport();
      return {
        title: 'Financial Summary',
        columns: [
          { header: 'Category', key: 'category' },
          { header: 'Count', key: 'count' },
          { header: 'Total', key: 'total' },
        ],
        rows: [
          { category: 'Invoices', count: data.invoices.count, total: data.invoices.total },
          { category: 'Invoice Balance', count: '', total: data.invoices.balance },
          { category: 'Payments', count: data.payments.count, total: data.payments.total },
          { category: 'Payments Completed', count: '', total: data.payments.completed },
          { category: 'Utility Charges', count: data.utilityCharges.count, total: data.utilityCharges.total },
          { category: 'Service Charges', count: data.serviceCharges.count, total: data.serviceCharges.total },
        ],
      };
    }
    case 'building': {
      const rows = await getBuildingReport();
      return {
        title: 'Building Report',
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Name', key: 'name' },
          { header: 'City', key: 'city' },
          { header: 'Floors', key: 'floors' },
          { header: 'Units', key: 'units' },
          { header: 'Occupied', key: 'occupied' },
          { header: 'Occupancy %', key: 'occupancyRate' },
          { header: 'Open Maintenance', key: 'openMaintenance' },
        ],
        rows,
      };
    }
    case 'unit': {
      const rows = await getUnitReport();
      return {
        title: 'Unit Report',
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Building', key: 'building' },
          { header: 'Floor', key: 'floor' },
          { header: 'Mode', key: 'occupancyMode' },
          { header: 'Status', key: 'status' },
          { header: 'Rent', key: 'rentPrice' },
          { header: 'Daily Rate', key: 'dailyRate' },
        ],
        rows,
      };
    }
    case 'tenant': {
      const data = await getTenantReport();
      return {
        title: 'Tenant Report',
        columns: [
          { header: 'Type', key: 'type' },
          { header: 'Name', key: 'name' },
          { header: 'Email', key: 'email' },
          { header: 'Status', key: 'status' },
          { header: 'Unit', key: 'unit' },
        ],
        rows: [
          ...data.residential.map((t) => ({
            type: 'Residential',
            name: t.name,
            email: t.email || '',
            status: t.status,
            unit: t.unit,
          })),
          ...data.commercial.map((t) => ({
            type: 'Commercial',
            name: t.companyName,
            email: t.email || '',
            status: t.status,
            unit: t.unit,
          })),
        ],
      };
    }
    case 'maintenance': {
      const data = await getMaintenanceReport();
      return {
        title: 'Maintenance Report',
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Title', key: 'title' },
          { header: 'Priority', key: 'priority' },
          { header: 'Status', key: 'status' },
          { header: 'Unit', key: 'unit' },
          { header: 'Building', key: 'building' },
          { header: 'Technician', key: 'technician' },
        ],
        rows: data.openItems,
      };
    }
    default:
      return null;
  }
}

export default {
  getDashboardStats,
  getOccupancyReport,
  getRevenueByMonth,
  getFinancialReport,
  getBuildingReport,
  getUnitReport,
  getTenantReport,
  getMaintenanceReport,
  getExportDataset,
};

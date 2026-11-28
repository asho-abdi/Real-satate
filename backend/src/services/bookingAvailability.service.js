import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { periodBookingTotal, roundMoney } from '../utils/rent.js';
import { logActivity } from './activity.service.js';
import { isAdminUser } from './access.service.js';
import {
  BUILDING_PROPERTY_TYPES,
  buildingHasPropertyType,
} from '../constants/buildingFeatures.js';

const ACTIVE_BOOKING_STATUSES = ['CONFIRMED', 'CHECKED_IN'];

/** Inclusive check-in day, exclusive check-out day (hotel nights). */
export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toYmd(d) {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d, n) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * True overlap for occupied nights: [checkIn, checkOut) ∩ [start, end) ≠ ∅
 * Equivalent Prisma: checkIn < end AND checkOut > start
 */
export async function findOverlappingBooking(tx, unitId, checkIn, checkOut, excludeId = null) {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  if (!(end > start)) return null;

  return tx.booking.findFirst({
    where: {
      unitId,
      deletedAt: null,
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      checkIn: { lt: end },
      checkOut: { gt: start },
    },
    select: {
      id: true,
      code: true,
      fullName: true,
      checkIn: true,
      checkOut: true,
      status: true,
    },
  });
}

export async function assertUnitAvailableForStay(tx, unitId, checkIn, checkOut, excludeId = null) {
  const unit = await tx.unit.findFirst({
    where: { id: unitId, deletedAt: null },
    select: {
      id: true,
      roomNumber: true,
      status: true,
      usage: true,
    },
  });
  if (!unit) throw new AppError('Unit not found', 404);
  if (unit.usage !== 'GUEST') {
    throw new AppError('Only guest rooms can be booked on the availability calendar', 400);
  }
  if (unit.status === 'MAINTENANCE') {
    throw new AppError(`Room ${unit.roomNumber} is under maintenance and cannot be booked`, 409);
  }
  if (unit.status === 'SOLD') {
    throw new AppError(`Room ${unit.roomNumber} is sold and cannot be booked`, 409);
  }

  const overlap = await findOverlappingBooking(tx, unitId, checkIn, checkOut, excludeId);
  if (overlap) {
    throw new AppError(
      `Room ${unit.roomNumber} is not available — conflicts with ${overlap.code} (${overlap.fullName}) ${toYmd(overlap.checkIn)} → ${toYmd(overlap.checkOut)}`,
      409,
    );
  }
  return unit;
}

function deriveUnitStatusForStay(checkIn) {
  const today = startOfDay(new Date());
  const checkInDay = startOfDay(checkIn);
  return checkInDay <= today ? 'OCCUPIED' : 'RESERVED';
}

async function refreshUnitStatus(tx, unitId) {
  const unit = await tx.unit.findFirst({
    where: { id: unitId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!unit || unit.status === 'MAINTENANCE' || unit.status === 'SOLD') return;

  const today = startOfDay(new Date());
  const active = await tx.booking.findMany({
    where: {
      unitId,
      deletedAt: null,
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
    select: { checkIn: true, checkOut: true, status: true },
    orderBy: { checkIn: 'asc' },
  });

  if (!active.length) {
    await tx.unit.update({ where: { id: unitId }, data: { status: 'AVAILABLE' } });
    return;
  }

  const checkedIn = active.find(
    (b) => b.status === 'CHECKED_IN' || (startOfDay(b.checkIn) <= today && startOfDay(b.checkOut) > today),
  );
  if (checkedIn) {
    await tx.unit.update({ where: { id: unitId }, data: { status: 'OCCUPIED' } });
    return;
  }

  await tx.unit.update({ where: { id: unitId }, data: { status: 'RESERVED' } });
}

/**
 * Calendar payload: guest rooms + bookings overlapping [from, to), occupancy stats.
 */
export async function getBookingCalendar(reqUser, query = {}) {
  const from = startOfDay(query.from || new Date());
  const daySpan = Math.min(92, Math.max(1, Number(query.days) || 14));
  const to = addDays(from, daySpan);

  const buildingId = query.buildingId || null;
  const floorId = query.floorId || null;
  const unitId = query.unitId || null;
  const unitType = query.unitType || null;
  const status = query.status ? String(query.status).toUpperCase() : null;
  const guestSearch = String(query.search || query.guest || '').trim();

  // buildingIds: null = admin (all). Array = scoped staff. Unit rows filter on buildingId directly.
  const buildingIds = reqUser.buildingIds;
  const scopedBuildings =
    buildingIds === null || isAdminUser(reqUser)
      ? {}
      : { buildingId: { in: Array.isArray(buildingIds) ? buildingIds : [] } };

  const unitWhere = {
    deletedAt: null,
    usage: 'GUEST',
    building: {
      deletedAt: null,
      // Only buildings that explicitly enable guest bookings
      propertyTypes: { has: BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS },
    },
    ...scopedBuildings,
    ...(buildingId ? { buildingId } : {}),
    ...(floorId ? { floorId } : {}),
    ...(unitId ? { id: unitId } : {}),
    ...(unitType ? { unitType: String(unitType).toUpperCase() } : {}),
  };

  let rooms = await prisma.unit.findMany({
    where: unitWhere,
    include: {
      building: { select: { id: true, code: true, name: true, propertyTypes: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
    orderBy: [
      { building: { name: 'asc' } },
      { floor: { level: 'asc' } },
      { roomNumber: 'asc' },
    ],
  });

  rooms = rooms.filter((r) =>
    buildingHasPropertyType(r.building, BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS),
  );

  // Explicit building selected without guest feature → empty calendar (no leak)
  if (buildingId && rooms.length === 0) {
    const building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
      select: { id: true, name: true, propertyTypes: true },
    });
    if (building && !buildingHasPropertyType(building, BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS)) {
      throw new AppError(
        `${building.name} does not support guest bookings`,
        403,
      );
    }
  }

  const roomIds = rooms.map((r) => r.id);
  if (!roomIds.length) {
    return {
      from: toYmd(from),
      to: toYmd(to),
      days: daySpan,
      rooms: [],
      bookings: [],
      blocks: [],
      stats: {
        totalRooms: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        reservedRooms: 0,
        maintenanceRooms: 0,
        occupancyPercent: 0,
      },
      legend: calendarLegend(),
    };
  }

  const bookingWhere = {
    deletedAt: null,
    unitId: { in: roomIds },
    // Overlap window [from, to): checkIn < to AND checkOut > from
    checkIn: { lt: to },
    checkOut: { gt: from },
    ...(status && status !== 'MAINTENANCE'
      ? { status }
      : {
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] },
        }),
    ...(guestSearch
      ? {
          OR: [
            { fullName: { contains: guestSearch, mode: 'insensitive' } },
            { phone: { contains: guestSearch, mode: 'insensitive' } },
            { code: { contains: guestSearch, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    select: {
      id: true,
      code: true,
      unitId: true,
      fullName: true,
      phone: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      amountPaid: true,
      bookingPeriod: true,
      periodRate: true,
      dailyRent: true,
      unit: {
        select: {
          roomNumber: true,
          building: { select: { name: true } },
          floor: { select: { name: true } },
        },
      },
    },
    orderBy: { checkIn: 'asc' },
  });

  const visibleBookings = bookings
    .filter((b) => {
      // Calendar bars: hide cancelled unless explicitly filtered
      if (!status && b.status === 'CANCELLED') return false;
      return true;
    })
    .map((b) => ({
      id: b.id,
      code: b.code,
      unitId: b.unitId,
      roomNumber: b.unit?.roomNumber,
      building: b.unit?.building?.name,
      floor: b.unit?.floor?.name,
      fullName: b.fullName,
      phone: b.phone,
      checkIn: toYmd(b.checkIn),
      checkOut: toYmd(b.checkOut),
      nights: Number(b.nights),
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalAmount: Number(b.totalAmount),
      amountPaid: Number(b.amountPaid),
      balance: roundMoney(Math.max(0, Number(b.totalAmount) - Number(b.amountPaid))),
      bookingPeriod: b.bookingPeriod,
      periodRate: Number(b.periodRate || b.dailyRent || 0),
      dailyRent: Number(b.dailyRent || 0),
    }));

  const blocks = rooms
    .filter((r) => r.status === 'MAINTENANCE')
    .map((r) => ({
      id: `maint-${r.id}`,
      type: 'MAINTENANCE',
      unitId: r.id,
      roomNumber: r.roomNumber,
      fullName: 'Maintenance',
      code: 'BLOCKED',
      checkIn: toYmd(from),
      checkOut: toYmd(to),
      status: 'MAINTENANCE',
    }));

  const today = startOfDay(new Date());
  const focusDay = from <= today && today < to ? today : from;

  let occupied = 0;
  let reserved = 0;
  let available = 0;
  let maintenance = 0;

  for (const room of rooms) {
    if (room.status === 'MAINTENANCE') {
      maintenance += 1;
      continue;
    }
    const roomBookings = visibleBookings.filter(
      (b) =>
        b.unitId === room.id &&
        ACTIVE_BOOKING_STATUSES.includes(b.status) &&
        startOfDay(b.checkIn) <= focusDay &&
        startOfDay(b.checkOut) > focusDay,
    );
    if (roomBookings.some((b) => b.status === 'CHECKED_IN')) occupied += 1;
    else if (roomBookings.length) reserved += 1;
    else if (room.status === 'OCCUPIED') occupied += 1;
    else if (room.status === 'RESERVED') reserved += 1;
    else available += 1;
  }

  const totalRooms = rooms.length;
  const occupancyDenom = Math.max(1, totalRooms - maintenance);
  const occupancyPercent = roundMoney(((occupied + reserved) / occupancyDenom) * 100);

  return {
    from: toYmd(from),
    to: toYmd(to),
    days: daySpan,
    today: toYmd(today),
    rooms: rooms.map((r) => ({
      id: r.id,
      roomNumber: r.roomNumber,
      unitType: r.unitType,
      status: r.status,
      dailyRate: r.dailyRate != null ? Number(r.dailyRate) : null,
      weeklyRent: r.weeklyRent != null ? Number(r.weeklyRent) : null,
      monthlyRent: Number(r.monthlyRent),
      buildingId: r.buildingId,
      floorId: r.floorId,
      building: r.building?.name,
      buildingCode: r.building?.code,
      floor: r.floor?.name,
      floorLevel: r.floor?.level,
    })),
    bookings: visibleBookings,
    blocks,
    stats: {
      totalRooms,
      availableRooms: available,
      occupiedRooms: occupied,
      reservedRooms: reserved,
      maintenanceRooms: maintenance,
      occupancyPercent,
    },
    legend: calendarLegend(),
  };
}

function calendarLegend() {
  return [
    { key: 'CONFIRMED', label: 'Confirmed', color: '#2563eb' },
    { key: 'CHECKED_IN', label: 'Checked-in', color: '#15803d' },
    { key: 'CHECKED_OUT', label: 'Checked-out', color: '#6b7280' },
    { key: 'CANCELLED', label: 'Cancelled', color: '#dc2626' },
    { key: 'MAINTENANCE', label: 'Maintenance / Blocked', color: '#374151' },
  ];
}

/**
 * Move / reschedule a booking onto another room and/or dates.
 * Transaction-safe with overlap validation + activity audit.
 */
export async function rescheduleBooking(
  bookingId,
  { unitId, checkIn, checkOut },
  { userId = null, bookingInclude } = {},
) {
  if (!checkIn || !checkOut) {
    throw new AppError('checkIn and checkOut are required', 400);
  }

  const nextIn = startOfDay(checkIn);
  const nextOut = startOfDay(checkOut);
  if (!(nextOut > nextIn)) {
    throw new AppError('checkOut must be after checkIn', 400);
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (!['CONFIRMED', 'CHECKED_IN'].includes(booking.status)) {
      throw new AppError(`Cannot move a ${booking.status} booking`, 400);
    }

    const targetUnitId = unitId || booking.unitId;
    const roomChanged = targetUnitId !== booking.unitId;
    const datesChanged =
      toYmd(booking.checkIn) !== toYmd(nextIn) || toYmd(booking.checkOut) !== toYmd(nextOut);

    if (!roomChanged && !datesChanged) {
      return tx.booking.findFirst({
        where: { id: booking.id },
        include: bookingInclude,
      });
    }

    if (booking.status === 'CHECKED_IN' && roomChanged) {
      // Allow room change for checked-in guests (room move) but keep check-in day
      if (toYmd(nextIn) !== toYmd(booking.checkIn)) {
        throw new AppError('Cannot change check-in date for a checked-in guest', 400);
      }
    }

    await assertUnitAvailableForStay(tx, targetUnitId, nextIn, nextOut, booking.id);

    const unit = await tx.unit.findFirst({
      where: { id: targetUnitId, deletedAt: null },
      select: { id: true, monthlyRent: true, dailyRate: true, roomNumber: true },
    });

    const totals = periodBookingTotal({
      monthlyRent: unit.monthlyRent,
      dailyRate: booking.periodRate || booking.dailyRent || unit.dailyRate,
      bookingPeriod: booking.bookingPeriod || 'DAILY',
      periodRate: booking.periodRate || booking.dailyRent,
      checkIn: nextIn,
      checkOut: nextOut,
      discountType: booking.discountType || 'FIXED',
      discountValue: booking.discountValue ?? booking.discount,
      servicesAmount: booking.servicesAmount,
      taxesAmount: booking.taxesAmount,
    });

    const paid = Number(booking.amountPaid);
    const paymentStatus =
      paid <= 0
        ? 'UNPAID'
        : paid + 0.009 >= totals.totalAmount
          ? 'PAID'
          : 'PARTIAL';

    const today = startOfDay(new Date());
    let nextStatus = booking.status;
    if (booking.status === 'CONFIRMED' && nextIn <= today) {
      nextStatus = 'CHECKED_IN';
    }

    const previousUnitId = booking.unitId;
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        unitId: targetUnitId,
        checkIn: nextIn,
        checkOut: nextOut,
        nights: totals.nights,
        periodQuantity: totals.periodQuantity,
        periodRate: totals.periodRate,
        dailyRent: totals.dailyRent,
        monthlyRent: unit.monthlyRent,
        originalAmount: totals.originalAmount,
        discount: totals.discount,
        discountValue: totals.discountValue,
        discountType: totals.discountType,
        totalAmount: totals.totalAmount,
        paymentStatus,
        status: nextStatus,
      },
      include: bookingInclude,
    });

    await refreshUnitStatus(tx, previousUnitId);
    await refreshUnitStatus(tx, targetUnitId);

    // If checked-in stay moved onto today, mark target occupied
    if (nextStatus === 'CHECKED_IN') {
      await tx.unit.update({
        where: { id: targetUnitId },
        data: { status: deriveUnitStatusForStay(nextIn) },
      });
    }

    await logActivity({
      entityType: 'BOOKING',
      entityId: booking.id,
      unitId: targetUnitId,
      action: 'BOOKING_RESCHEDULED',
      summary: roomChanged
        ? `Moved ${booking.code} to room ${unit.roomNumber} (${toYmd(nextIn)} → ${toYmd(nextOut)})`
        : `Rescheduled ${booking.code} to ${toYmd(nextIn)} → ${toYmd(nextOut)}`,
      meta: {
        previous: {
          unitId: previousUnitId,
          checkIn: toYmd(booking.checkIn),
          checkOut: toYmd(booking.checkOut),
        },
        next: {
          unitId: targetUnitId,
          checkIn: toYmd(nextIn),
          checkOut: toYmd(nextOut),
        },
      },
      actorId: userId,
      tx,
    });

    return updated;
  });
}

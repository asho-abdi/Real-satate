import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { bookingTotal } from '../../utils/rent.js';

const router = Router();
router.use(authenticate);

const bookingInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
};

function serializeBooking(b) {
  if (!b) return b;
  return {
    ...b,
    monthlyRent: Number(b.monthlyRent),
    dailyRent: Number(b.dailyRent),
    discount: Number(b.discount),
    totalAmount: Number(b.totalAmount),
    amountPaid: Number(b.amountPaid ?? 0),
  };
}

function derivePaymentStatus(amountPaid, totalAmount) {
  const paid = Math.round(Number(amountPaid || 0) * 100) / 100;
  const due = Math.round(Number(totalAmount || 0) * 100) / 100;
  if (paid <= 0) return 'UNPAID';
  if (paid >= due) return 'PAID';
  return 'PARTIAL';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function nextBookingCode(tx = prisma) {
  const latest = await tx.booking.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const match = latest?.code?.match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1001;
  return `BK-${next}`;
}

async function hasOverlappingBooking(tx, unitId, checkIn, checkOut, excludeId = null) {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  const overlapping = await tx.booking.findFirst({
    where: {
      unitId,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      checkIn: { lt: end },
      checkOut: { gt: start },
    },
    select: { id: true, code: true },
  });
  return overlapping;
}

router.get(
  '/',
  authorize('bookings:read'),
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const where = {
      deletedAt: null,
      unit: { deletedAt: null, building: { deletedAt: null } },
      ...(search
        ? {
            OR: [
              { fullName: { contains: String(search), mode: 'insensitive' } },
              { phone: { contains: String(search), mode: 'insensitive' } },
              { unit: { roomNumber: { contains: String(search), mode: 'insensitive' } } },
              { code: { contains: String(search), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const data = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { checkIn: 'desc' },
    });
    return success(res, data.map(serializeBooking));
  }),
);

router.post(
  '/',
  authorize('bookings:create'),
  asyncHandler(async (req, res) => {
    const {
      unitId,
      fullName,
      phone,
      idNumber,
      nationality,
      gender,
      emergencyContact,
      checkIn,
      checkOut,
      discount = 0,
      paymentMethod = 'CASH',
      amountPaid,
    } = req.body || {};

    if (!unitId || !fullName || !phone || !idNumber || !checkIn || !checkOut) {
      throw new AppError(
        'unitId, fullName, phone, idNumber, checkIn, and checkOut are required',
        400,
      );
    }

    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        deletedAt: null,
        building: { deletedAt: null },
        floor: { deletedAt: null },
      },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    if (unit.usage !== 'GUEST') {
      throw new AppError('Bookings are only allowed on guest units', 400);
    }
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be booked`, 400);
    }

    const totals = bookingTotal(unit.monthlyRent, checkIn, checkOut, discount);
    if (totals.nights < 1) {
      throw new AppError('checkOut must be after checkIn', 400);
    }

    const today = startOfDay(new Date());
    const checkInDay = startOfDay(checkIn);
    const unitStatus = checkInDay <= today ? 'OCCUPIED' : 'RESERVED';
    const bookingStatus = checkInDay <= today ? 'CHECKED_IN' : 'CONFIRMED';

    const method = String(paymentMethod).toUpperCase().replace(/-/g, '_');
    const paymentMethodValue = method === 'E_BESA' || method === 'EBESA' ? 'E_BESA' : 'CASH';
    const paid =
      amountPaid !== undefined && amountPaid !== null
        ? Math.min(Number(amountPaid), totals.totalAmount)
        : totals.totalAmount;
    const paymentStatus = derivePaymentStatus(paid, totals.totalAmount);

    const booking = await prisma.$transaction(async (tx) => {
      const overlap = await hasOverlappingBooking(tx, unitId, checkIn, checkOut);
      if (overlap) {
        throw new AppError(
          `Unit already has an active booking (${overlap.code}) for these dates`,
          409,
        );
      }

      const code = await nextBookingCode(tx);

      const created = await tx.booking.create({
        data: {
          code,
          unitId,
          fullName: String(fullName).trim(),
          phone: String(phone).trim(),
          idNumber: String(idNumber).trim(),
          nationality: nationality || null,
          gender: gender ? String(gender).toUpperCase() : null,
          emergencyContact: emergencyContact || null,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          nights: totals.nights,
          monthlyRent: unit.monthlyRent,
          dailyRent: totals.dailyRent,
          discount: totals.discount,
          totalAmount: totals.totalAmount,
          amountPaid: paid,
          paymentStatus,
          paymentMethod: paymentMethodValue,
          status: bookingStatus,
        },
        include: bookingInclude,
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { status: unitStatus },
      });

      return created;
    });

    return success(res, serializeBooking(booking), 201);
  }),
);

router.post(
  '/:id/check-in',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'CONFIRMED') {
      throw new AppError(`Only CONFIRMED bookings can check in (current: ${booking.status})`, 400);
    }

    const { amountPaid, paymentMethod } = req.body || {};
    const total = Number(booking.totalAmount);
    const paid =
      amountPaid !== undefined && amountPaid !== null
        ? Math.min(Number(amountPaid), total)
        : Number(booking.amountPaid);
    const paymentStatus = derivePaymentStatus(paid, total);

    const methodRaw =
      paymentMethod !== undefined
        ? String(paymentMethod).toUpperCase().replace(/-/g, '_')
        : booking.paymentMethod;
    const paymentMethodValue =
      methodRaw === 'E_BESA' || methodRaw === 'EBESA' ? 'E_BESA' : 'CASH';

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          amountPaid: paid,
          paymentStatus,
          paymentMethod: paymentMethodValue,
        },
        include: bookingInclude,
      });
      await tx.unit.update({
        where: { id: booking.unitId },
        data: { status: 'OCCUPIED' },
      });
      return b;
    });

    return success(res, serializeBooking(updated));
  }),
);

router.patch(
  '/:id',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const editableStatuses = ['CONFIRMED', 'CHECKED_IN'];
    if (!editableStatuses.includes(booking.status)) {
      throw new AppError(`Cannot edit booking with status ${booking.status}`, 400);
    }

    const {
      fullName,
      phone,
      idNumber,
      nationality,
      gender,
      emergencyContact,
      checkIn,
      checkOut,
      discount,
    } = req.body || {};

    const isConfirmed = booking.status === 'CONFIRMED';
    const isCheckedIn = booking.status === 'CHECKED_IN';

    let nextCheckIn = booking.checkIn;
    let nextCheckOut = booking.checkOut;
    let nextDiscount = Number(booking.discount);
    let datesChanged = false;

    if (isConfirmed) {
      if (checkIn !== undefined) {
        nextCheckIn = checkIn;
        datesChanged = true;
      }
      if (checkOut !== undefined) {
        nextCheckOut = checkOut;
        datesChanged = true;
      }
      if (discount !== undefined) nextDiscount = Number(discount);
    } else if (isCheckedIn && checkOut !== undefined) {
      const proposed = startOfDay(checkOut);
      const currentOut = startOfDay(booking.checkOut);
      if (proposed < currentOut) {
        throw new AppError(
          'Cannot shorten a checked-in stay. Choose a checkout date on or after the current checkout.',
          400,
        );
      }
      nextCheckOut = checkOut;
      datesChanged = true;
    }

    const totals = datesChanged
      ? bookingTotal(booking.monthlyRent, nextCheckIn, nextCheckOut, nextDiscount)
      : null;
    if (totals && totals.nights < 1) throw new AppError('checkOut must be after checkIn', 400);

    if (datesChanged) {
      const overlap = await hasOverlappingBooking(
        prisma,
        booking.unitId,
        nextCheckIn,
        nextCheckOut,
        booking.id,
      );
      if (overlap) {
        throw new AppError(
          `Unit already has an active booking (${overlap.code}) for these dates`,
          409,
        );
      }
    }

    const total = datesChanged ? totals.totalAmount : Number(booking.totalAmount);
    const paid = datesChanged
      ? Math.min(Number(booking.amountPaid), total)
      : Number(booking.amountPaid);
    const paymentStatus = datesChanged ? derivePaymentStatus(paid, total) : booking.paymentStatus;

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(fullName !== undefined && { fullName: String(fullName).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(idNumber !== undefined && { idNumber: String(idNumber).trim() }),
        ...(nationality !== undefined && { nationality }),
        ...(gender !== undefined && { gender: gender ? String(gender).toUpperCase() : null }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(datesChanged && isConfirmed && checkIn !== undefined && { checkIn: new Date(checkIn) }),
        ...(datesChanged && checkOut !== undefined && { checkOut: new Date(checkOut) }),
        ...(datesChanged && isConfirmed && discount !== undefined && { discount: nextDiscount }),
        ...(datesChanged && {
          nights: totals.nights,
          dailyRent: totals.dailyRent,
          totalAmount: total,
          amountPaid: paid,
          paymentStatus,
        }),
      },
      include: bookingInclude,
    });

    return success(res, serializeBooking(updated));
  }),
);

router.patch(
  '/:id/payment',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const { amountPaid, paymentMethod } = req.body || {};
    if (amountPaid === undefined || amountPaid === null) {
      throw new AppError('amountPaid is required', 400);
    }

    const total = Number(booking.totalAmount);
    const paid = Math.min(Math.max(0, Number(amountPaid)), total);
    const paymentStatus = derivePaymentStatus(paid, total);

    const methodRaw =
      paymentMethod !== undefined
        ? String(paymentMethod).toUpperCase().replace(/-/g, '_')
        : booking.paymentMethod;
    const paymentMethodValue =
      methodRaw === 'E_BESA' || methodRaw === 'EBESA' ? 'E_BESA' : 'CASH';

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        amountPaid: paid,
        paymentStatus,
        paymentMethod: paymentMethodValue,
      },
      include: bookingInclude,
    });

    return success(res, serializeBooking(updated));
  }),
);

router.post(
  '/:id/check-out',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status !== 'CHECKED_IN') {
      throw new AppError(`Only CHECKED_IN bookings can check out (current: ${booking.status})`, 400);
    }

    const { amountPaid, paymentMethod } = req.body || {};
    const total = Number(booking.totalAmount);
    const requestedPaid =
      amountPaid !== undefined && amountPaid !== null
        ? Number(amountPaid)
        : total;

    if (Number.isNaN(requestedPaid) || requestedPaid < total) {
      throw new AppError(
        'Guest must pay the full balance before checkout. Collect payment and try again.',
        400,
      );
    }

    // Checkout confirms full stay payment — always record the booking total.
    const paid = total;
    const paymentStatus = 'PAID';

    const methodRaw =
      paymentMethod !== undefined
        ? String(paymentMethod).toUpperCase().replace(/-/g, '_')
        : booking.paymentMethod;
    const paymentMethodValue =
      methodRaw === 'E_BESA' || methodRaw === 'EBESA' ? 'E_BESA' : 'CASH';

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          amountPaid: paid,
          paymentStatus,
          paymentMethod: paymentMethodValue,
        },
        include: bookingInclude,
      });
      await tx.unit.update({
        where: { id: booking.unitId },
        data: { status: 'AVAILABLE' },
      });
      return b;
    });

    return success(res, serializeBooking(updated));
  }),
);

router.post(
  '/:id/cancel',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
      throw new AppError(`Cannot cancel a ${booking.status} booking`, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
        include: bookingInclude,
      });

      // Only free the unit if no other active booking remains on it
      const otherActive = await tx.booking.findFirst({
        where: {
          unitId: booking.unitId,
          deletedAt: null,
          id: { not: booking.id },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      });
      if (!otherActive) {
        await tx.unit.update({
          where: { id: booking.unitId },
          data: { status: 'AVAILABLE' },
        });
      }

      return b;
    });

    return success(res, serializeBooking(updated));
  }),
);

export default router;

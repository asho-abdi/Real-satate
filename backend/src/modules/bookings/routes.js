import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { bookingTotal, periodBookingTotal, applyBookingDiscount } from '../../utils/rent.js';
import {
  assertUnitBuildingAccess,
  unitBuildingFilter,
} from '../../services/access.service.js';
import {
  normalizePaymentMethod,
  pickPaymentDetails,
} from '../../utils/paymentMethod.js';
import { ensurePaymentReceipt } from '../../services/financeReceipt.service.js';

const router = Router();
router.use(authenticate);

const bookingInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
  payments: {
    orderBy: { paymentDate: 'asc' },
    include: {
      recordedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
};

function serializeBooking(b) {
  if (!b) return b;
  const payments = (b.payments || []).map((p) => ({
    ...p,
    amount: Number(p.amount),
    recordedByName: p.recordedBy
      ? `${p.recordedBy.firstName || ''} ${p.recordedBy.lastName || ''}`.trim() ||
        p.recordedBy.email
      : null,
  }));
  const amountPaid = Number(b.amountPaid ?? 0);
  const totalAmount = Number(b.totalAmount);
  return {
    ...b,
    monthlyRent: Number(b.monthlyRent),
    dailyRent: Number(b.dailyRent),
    periodRate: Number(b.periodRate ?? b.dailyRent ?? 0),
    periodQuantity: Number(b.periodQuantity ?? b.nights ?? 1),
    bookingPeriod: b.bookingPeriod || 'DAILY',
    originalAmount: Number(b.originalAmount ?? totalAmount),
    discountType: b.discountType || 'FIXED',
    discountValue: Number(b.discountValue ?? b.discount ?? 0),
    discount: Number(b.discount),
    discountAmount: Number(b.discount),
    servicesAmount: Number(b.servicesAmount ?? 0),
    taxesAmount: Number(b.taxesAmount ?? 0),
    adultsCount: Number(b.adultsCount ?? 1),
    childrenCount: Number(b.childrenCount ?? 0),
    email: b.email || null,
    address: b.address || null,
    country: b.country || null,
    checkInTime: b.checkInTime || null,
    totalAmount,
    amountPaid,
    balance: Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100),
    notes: b.notes || null,
    payments,
  };
}

function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/** Combine YYYY-MM-DD + optional HH:mm into a Date. */
function combineDateAndTime(dateStr, timeStr) {
  const day = String(dateStr || '').slice(0, 10);
  const time = String(timeStr || '').trim();
  if (/^\d{2}:\d{2}$/.test(time)) {
    return new Date(`${day}T${time}:00`);
  }
  return new Date(day);
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
      ...unitBuildingFilter(req.user.buildingIds),
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
      email,
      address,
      country,
      nationality,
      gender,
      emergencyContact,
      identityDocument,
      identityDocumentName,
      adultsCount,
      childrenCount,
      checkInTime,
      checkIn,
      checkOut,
      discount = 0,
      discountType = 'FIXED',
      discountValue,
      servicesAmount = 0,
      taxesAmount = 0,
      paymentMethod = 'CASH',
      amountPaid,
      bookingPeriod = 'DAILY',
      periodQuantity,
      periodRate,
      notes,
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
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
    if (unit.usage !== 'GUEST') {
      throw new AppError('Bookings are only allowed on guest units', 400);
    }
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be booked`, 400);
    }

    const totals = periodBookingTotal({
      monthlyRent: unit.monthlyRent,
      dailyRate: unit.dailyRate,
      weeklyRate: unit.weeklyRent,
      bookingPeriod,
      periodQuantity:
        periodQuantity !== undefined && periodQuantity !== null
          ? Number(periodQuantity)
          : undefined,
      checkIn,
      checkOut,
      discountType,
      discountValue:
        discountValue !== undefined && discountValue !== null && discountValue !== ''
          ? Number(discountValue)
          : Number(discount) || 0,
    });
    if (periodRate !== undefined && periodRate !== null && periodRate !== '') {
      totals.periodRate = Number(periodRate);
      totals.subtotal = Math.round(totals.periodRate * totals.periodQuantity * 100) / 100;
      Object.assign(
        totals,
        applyBookingDiscount(
          totals.subtotal,
          discountType,
          discountValue !== undefined && discountValue !== null && discountValue !== ''
            ? Number(discountValue)
            : Number(discount) || 0,
        ),
      );
    }
    const services = money(servicesAmount);
    const taxes = money(taxesAmount);
    totals.servicesAmount = services;
    totals.taxesAmount = taxes;
    totals.totalAmount = money((totals.totalAmount || 0) + services + taxes);

    if (totals.nights < 1 && totals.periodQuantity < 1) {
      throw new AppError('checkOut must be after checkIn', 400);
    }

    const checkInAt = combineDateAndTime(checkIn, checkInTime);
    const checkOutAt = new Date(checkOut);

    const today = startOfDay(new Date());
    const checkInDay = startOfDay(checkInAt);
    const unitStatus = checkInDay <= today ? 'OCCUPIED' : 'RESERVED';
    const bookingStatus = checkInDay <= today ? 'CHECKED_IN' : 'CONFIRMED';

    const paymentMethodValue = normalizePaymentMethod(paymentMethod, { fallback: 'CASH' });
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);
    const paid =
      amountPaid !== undefined && amountPaid !== null
        ? Math.min(Number(amountPaid), totals.totalAmount)
        : 0;
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
          email: email ? String(email).trim() : null,
          address: address ? String(address).trim() : null,
          country: country ? String(country).trim() : null,
          nationality: nationality || null,
          gender: gender ? String(gender).toUpperCase() : null,
          emergencyContact: emergencyContact || null,
          identityDocument: identityDocument ? String(identityDocument).trim() : null,
          identityDocumentName: identityDocumentName
            ? String(identityDocumentName).trim()
            : null,
          adultsCount: Math.max(1, Number(adultsCount) || 1),
          childrenCount: Math.max(0, Number(childrenCount) || 0),
          checkInTime: checkInTime ? String(checkInTime).trim() : null,
          checkIn: checkInAt,
          checkOut: checkOutAt,
          bookingPeriod: totals.bookingPeriod,
          periodRate: totals.periodRate,
          periodQuantity: totals.periodQuantity,
          nights: totals.nights || totals.periodQuantity,
          monthlyRent: unit.monthlyRent,
          dailyRent: totals.dailyRent,
          originalAmount: totals.originalAmount ?? totals.subtotal,
          discountType: totals.discountType || 'FIXED',
          discountValue: totals.discountValue ?? 0,
          discount: totals.discount,
          servicesAmount: services,
          taxesAmount: taxes,
          totalAmount: totals.totalAmount,
          amountPaid: paid,
          paymentStatus,
          paymentMethod: paymentMethodValue,
          status: bookingStatus,
          notes: notes ? String(notes).trim() : null,
        },
        include: bookingInclude,
      });

      if (paid > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: created.id,
            amount: paid,
            method: paymentMethodValue,
            paymentDate: new Date(),
            reference: payDetails.reference,
            receivedByName: payDetails.receivedByName,
            agentName: payDetails.agentName,
            officeMpesaNumber: payDetails.officeMpesaNumber,
            comment: 'Initial payment on booking',
            recordedById: req.user.id || null,
          },
        });
      }

      await tx.unit.update({
        where: { id: unitId },
        data: { status: unitStatus },
      });

      return tx.booking.findFirst({
        where: { id: created.id },
        include: bookingInclude,
      });
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
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
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

    const paymentMethodValue =
      paymentMethod !== undefined
        ? normalizePaymentMethod(paymentMethod, { fallback: booking.paymentMethod || 'CASH' })
        : booking.paymentMethod || 'CASH';
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);

    const updated = await prisma.$transaction(async (tx) => {
      const prevPaid = Number(booking.amountPaid || 0);
      const delta = Math.round((paid - prevPaid) * 100) / 100;
      if (delta > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: booking.id,
            amount: delta,
            method: paymentMethodValue,
            paymentDate: new Date(),
            reference: payDetails.reference,
            receivedByName: payDetails.receivedByName,
            agentName: payDetails.agentName,
            officeMpesaNumber: payDetails.officeMpesaNumber,
            comment: 'Check-in payment',
            recordedById: req.user.id || null,
          },
        });
      }
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
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);

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
      identityDocument,
      identityDocumentName,
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
        ...(identityDocument !== undefined && {
          identityDocument: identityDocument ? String(identityDocument).trim() : null,
        }),
        ...(identityDocumentName !== undefined && {
          identityDocumentName: identityDocumentName
            ? String(identityDocumentName).trim()
            : null,
        }),
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

router.get(
  '/:id/payments',
  authorize('bookings:read'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: bookingInclude,
    });
    if (!booking) throw new AppError('Booking not found', 404);
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
    return success(res, serializeBooking(booking).payments);
  }),
);

router.post(
  '/:id/payments',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);

    const { amount, paymentMethod = 'CASH', paymentDate, comment } = req.body || {};
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      throw new AppError('A positive payment amount is required', 400);
    }

    const paymentMethodValue = normalizePaymentMethod(paymentMethod, { fallback: 'CASH' });
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);
    const total = Number(booking.totalAmount);
    const currentPaid = Number(booking.amountPaid || 0);
    const nextPaid = Math.min(total, Math.round((currentPaid + Number(amount)) * 100) / 100);
    const applied = Math.round((nextPaid - currentPaid) * 100) / 100;
    if (applied <= 0) {
      throw new AppError('Booking is already fully paid', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bp = await tx.bookingPayment.create({
        data: {
          bookingId: booking.id,
          amount: applied,
          method: paymentMethodValue,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          reference: payDetails.reference,
          receivedByName: payDetails.receivedByName,
          agentName: payDetails.agentName,
          officeMpesaNumber: payDetails.officeMpesaNumber,
          comment: comment ? String(comment).trim() : null,
          recordedById: req.user.id || null,
        },
      });

      const receipt = await ensurePaymentReceipt(tx, {
        sourceType: 'BOOKING_PAYMENT',
        sourceId: bp.id,
        unitId: booking.unitId,
        customerName: booking.fullName,
        customerPhone: booking.phone || null,
        amount: applied,
        amountPaid: applied,
        remainingBalance: Math.max(0, Math.round((total - nextPaid) * 100) / 100),
        currentCharges: total,
        previousBalance: Math.max(0, Math.round((total - currentPaid) * 100) / 100),
        method: paymentMethodValue,
        reference: payDetails.reference,
        paymentDate: paymentDate || new Date(),
        billingPeriod: `${String(booking.checkIn).slice(0, 10)} → ${String(booking.checkOut).slice(0, 10)}`,
        description: `Guest booking payment · ${booking.code}`,
        createdById: req.user.id || null,
      });

      if (receipt?.number) {
        await tx.bookingPayment.update({
          where: { id: bp.id },
          data: { receiptNumber: receipt.number },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: nextPaid,
          paymentStatus: derivePaymentStatus(nextPaid, total),
          paymentMethod: paymentMethodValue,
        },
        include: bookingInclude,
      });
    });

    return success(res, serializeBooking(updated), 201);
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
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);

    const { amountPaid, paymentMethod, comment, paymentDate } = req.body || {};
    if (amountPaid === undefined || amountPaid === null) {
      throw new AppError('amountPaid is required', 400);
    }

    const total = Number(booking.totalAmount);
    const currentPaid = Number(booking.amountPaid || 0);
    const targetPaid = Math.min(Math.max(0, Number(amountPaid)), total);
    const delta = Math.round((targetPaid - currentPaid) * 100) / 100;

    const paymentMethodValue =
      paymentMethod !== undefined
        ? normalizePaymentMethod(paymentMethod, { fallback: booking.paymentMethod || 'CASH' })
        : booking.paymentMethod || 'CASH';
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);

    const updated = await prisma.$transaction(async (tx) => {
      if (delta > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: booking.id,
            amount: delta,
            method: paymentMethodValue,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            reference: payDetails.reference,
            receivedByName: payDetails.receivedByName,
            agentName: payDetails.agentName,
            officeMpesaNumber: payDetails.officeMpesaNumber,
            comment: comment ? String(comment).trim() : 'Payment recorded',
            recordedById: req.user.id || null,
          },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: targetPaid,
          paymentStatus: derivePaymentStatus(targetPaid, total),
          paymentMethod: paymentMethodValue,
        },
        include: bookingInclude,
      });
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
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
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

    const paymentMethodValue =
      paymentMethod !== undefined
        ? normalizePaymentMethod(paymentMethod, { fallback: booking.paymentMethod || 'CASH' })
        : booking.paymentMethod || 'CASH';
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);
    const prevPaid = Number(booking.amountPaid || 0);
    const delta = Math.max(0, Math.round((paid - prevPaid) * 100) / 100);

    const updated = await prisma.$transaction(async (tx) => {
      if (delta > 0) {
        await tx.bookingPayment.create({
          data: {
            bookingId: booking.id,
            amount: delta,
            method: paymentMethodValue,
            paymentDate: new Date(),
            reference: payDetails.reference,
            receivedByName: payDetails.receivedByName,
            agentName: payDetails.agentName,
            officeMpesaNumber: payDetails.officeMpesaNumber,
            comment: 'Checkout settlement',
            recordedById: req.user.id || null,
          },
        });
      }
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
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
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

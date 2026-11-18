import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  periodBookingTotal,
  bookingAccommodationFinancials,
  summarizeDeposit,
  resolveStoredNightlyRate,
  roundMoney,
} from '../../utils/rent.js';
import {
  assertUnitBuildingAccess,
  unitBuildingFilter,
} from '../../services/access.service.js';
import {
  normalizePaymentMethod,
  pickPaymentDetails,
} from '../../utils/paymentMethod.js';
import { ensurePaymentReceipt } from '../../services/financeReceipt.service.js';
import { createDeposit, settleDeposit } from '../../services/deposit.service.js';

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
  deposits: {
    where: { deletedAt: null },
    orderBy: { dateReceived: 'desc' },
    include: {
      transactions: { orderBy: { createdAt: 'asc' } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
};

function serializeBooking(b) {
  if (!b) return b;
  const payments = (b.payments || []).map((p) => ({
    ...p,
    amount: Number(p.amount),
    category: 'ACCOMMODATION',
    recordedByName: p.recordedBy
      ? `${p.recordedBy.firstName || ''} ${p.recordedBy.lastName || ''}`.trim() ||
        p.recordedBy.email
      : null,
  }));
  const deposits = (b.deposits || []).map((d) => ({
    ...d,
    amount: Number(d.amount),
    remainingAmount: Number(d.remainingAmount),
    returnedAmount: Number(d.returnedAmount),
    deductedAmount: Number(d.deductedAmount),
    transactions: (d.transactions || []).map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
  }));
  const primaryDeposit = deposits.find((d) => ['HELD', 'PARTIALLY_RETURNED'].includes(d.status)) || deposits[0] || null;
  const depositSummary = summarizeDeposit(primaryDeposit);

  // Recompute expected stay total from nightly × nights so old MONTHLY package totals are corrected on read
  const recomputed = recomputeBookingTotals(b);
  const amountPaid = Number(b.amountPaid ?? 0);
  const totalAmount = recomputed.totalAmount;
  const financials = bookingAccommodationFinancials(
    {
      ...b,
      periodRate: recomputed.periodRate,
      dailyRent: recomputed.dailyRent,
      nights: recomputed.nights,
      totalAmount,
      amountPaid,
      discount: recomputed.discount,
      servicesAmount: recomputed.servicesAmount,
      taxesAmount: recomputed.taxesAmount,
    },
    { timeZone: 'Africa/Nairobi' },
  );

  const history = [
    ...payments.map((p) => ({
      id: p.id,
      category: 'ACCOMMODATION_PAYMENT',
      label: 'Accommodation Payment',
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      date: p.paymentDate,
      recordedBy: p.recordedByName,
      description: p.comment || 'Accommodation payment',
      receiptNumber: p.receiptNumber || null,
    })),
    ...deposits.flatMap((d) =>
      (d.transactions || []).map((t) => ({
        id: t.id,
        category:
          t.type === 'RECEIVED'
            ? 'SECURITY_DEPOSIT_RECEIVED'
            : t.type === 'RETURN'
              ? 'DEPOSIT_REFUND'
              : t.type === 'DEDUCTION'
                ? 'MAINTENANCE_DEDUCTION'
                : 'DEPOSIT_ADJUSTMENT',
        label:
          t.type === 'RECEIVED'
            ? 'Security Deposit Received'
            : t.type === 'RETURN'
              ? 'Deposit Refund'
              : t.type === 'DEDUCTION'
                ? 'Maintenance Deduction'
                : 'Deposit Adjustment',
        amount: Number(t.amount),
        method: t.method,
        reference: t.reference,
        date: t.createdAt,
        recordedBy: null,
        description: t.notes || t.type,
        depositId: d.id,
      })),
    ),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    ...b,
    monthlyRent: Number(b.monthlyRent),
    dailyRent: Number(recomputed.dailyRent),
    periodRate: Number(recomputed.periodRate),
    periodQuantity: Number(recomputed.periodQuantity),
    nights: Number(recomputed.nights),
    bookingPeriod: b.bookingPeriod || 'DAILY',
    originalAmount: Number(recomputed.originalAmount),
    discountType: recomputed.discountType || 'FIXED',
    discountValue: Number(recomputed.discountValue ?? 0),
    discount: Number(recomputed.discount),
    discountAmount: Number(recomputed.discount),
    servicesAmount: Number(recomputed.servicesAmount ?? 0),
    taxesAmount: Number(recomputed.taxesAmount ?? 0),
    adultsCount: Number(b.adultsCount ?? 1),
    childrenCount: Number(b.childrenCount ?? 0),
    email: b.email || null,
    address: b.address || null,
    country: b.country || null,
    checkInTime: b.checkInTime || null,
    totalAmount,
    amountPaid,
    /** Outstanding vs full expected stay (not deposit). */
    balance: roundMoney(Math.max(0, totalAmount - amountPaid)),
    notes: b.notes || null,
    payments,
    deposits,
    deposit: primaryDeposit,
    depositSummary,
    financials: {
      ...financials,
      deposit: depositSummary,
    },
    transactionHistory: history,
  };
}

function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/** Recompute accommodation total as nightlyRate × nights (category is not a package). */
function recomputeBookingTotals(booking, overrides = {}) {
  const base = { ...booking, ...overrides };
  const nightly =
    overrides.periodRate != null && overrides.periodRate !== ''
      ? Number(overrides.periodRate)
      : resolveStoredNightlyRate(base);
  return periodBookingTotal({
    monthlyRent: overrides.monthlyRent ?? booking.monthlyRent,
    dailyRate: overrides.dailyRate ?? nightly,
    bookingPeriod: overrides.bookingPeriod ?? booking.bookingPeriod ?? 'DAILY',
    periodRate: nightly,
    checkIn: overrides.checkIn ?? booking.checkIn,
    checkOut: overrides.checkOut ?? booking.checkOut,
    discountType: overrides.discountType ?? booking.discountType,
    discountValue:
      overrides.discountValue ?? booking.discountValue ?? booking.discount,
    servicesAmount: overrides.servicesAmount ?? booking.servicesAmount,
    taxesAmount: overrides.taxesAmount ?? booking.taxesAmount,
  });
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

    const discVal =
      discountValue !== undefined && discountValue !== null && discountValue !== ''
        ? Number(discountValue)
        : Number(discount) || 0;
    const services = money(servicesAmount);
    const taxes = money(taxesAmount);
    // Client periodRate is always the nightly accommodation rate (× nights, never a package total).
    const totals = periodBookingTotal({
      monthlyRent: unit.monthlyRent,
      dailyRate: unit.dailyRate,
      weeklyRate: unit.weeklyRent,
      bookingPeriod,
      periodQuantity:
        periodQuantity !== undefined && periodQuantity !== null
          ? Number(periodQuantity)
          : undefined,
      periodRate:
        periodRate !== undefined && periodRate !== null && periodRate !== ''
          ? Number(periodRate)
          : null,
      checkIn,
      checkOut,
      discountType,
      discountValue: discVal,
      servicesAmount: services,
      taxesAmount: taxes,
    });

    if (totals.nights < 1) {
      throw new AppError('checkOut must be after checkIn', 400);
    }

    const securityDepositAmount = money(
      req.body?.securityDeposit ?? req.body?.depositAmount ?? 0,
    );

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
            comment: 'Initial accommodation payment',
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

    if (securityDepositAmount > 0) {
      await createDeposit(
        {
          bookingId: booking.id,
          unitId,
          amount: securityDepositAmount,
          method: paymentMethodValue,
          reference: payDetails.reference,
          receivedByName: payDetails.receivedByName,
          agentName: payDetails.agentName,
          officeMpesaNumber: payDetails.officeMpesaNumber,
          notes: 'SECURITY DEPOSIT – REFUNDABLE',
        },
        req.user.id,
      );
      const refreshed = await prisma.booking.findFirst({
        where: { id: booking.id },
        include: bookingInclude,
      });
      return success(res, serializeBooking(refreshed), 201);
    }

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
    const finals = recomputeBookingTotals(booking);
    const total = finals.totalAmount;
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
            comment: 'Check-in accommodation payment',
            recordedById: req.user.id || null,
          },
        });
      }
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_IN',
          nights: finals.nights,
          periodQuantity: finals.periodQuantity,
          periodRate: finals.periodRate,
          dailyRent: finals.dailyRent,
          originalAmount: finals.originalAmount,
          totalAmount: total,
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
      ? periodBookingTotal({
          monthlyRent: booking.monthlyRent,
          dailyRate: booking.periodRate || booking.dailyRent,
          bookingPeriod: booking.bookingPeriod || 'DAILY',
          periodRate: booking.periodRate || booking.dailyRent,
          checkIn: nextCheckIn,
          checkOut: nextCheckOut,
          discountType: booking.discountType || 'FIXED',
          discountValue:
            isConfirmed && discount !== undefined ? nextDiscount : booking.discountValue ?? nextDiscount,
          servicesAmount: booking.servicesAmount,
          taxesAmount: booking.taxesAmount,
        })
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
    const paid = Number(booking.amountPaid);
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
        ...(datesChanged && isConfirmed && discount !== undefined && {
          discount: totals.discount,
          discountValue: totals.discountValue,
          discountType: totals.discountType,
        }),
        ...(datesChanged && {
          nights: totals.nights,
          periodQuantity: totals.periodQuantity,
          periodRate: totals.periodRate,
          dailyRent: totals.dailyRent,
          originalAmount: totals.originalAmount,
          totalAmount: total,
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
    const recomputed = recomputeBookingTotals(booking);
    const total = recomputed.totalAmount;
    const currentPaid = Number(booking.amountPaid || 0);
    const nextPaid = Math.min(total, Math.round((currentPaid + Number(amount)) * 100) / 100);
    const applied = Math.round((nextPaid - currentPaid) * 100) / 100;
    if (applied <= 0) {
      throw new AppError('Booking accommodation is already fully paid', 400);
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
          comment: comment ? String(comment).trim() : 'Accommodation payment',
          recordedById: req.user.id || null,
        },
      });

      // Keep stored totalAmount aligned with nights × nightly rate
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          nights: recomputed.nights,
          periodQuantity: recomputed.periodQuantity,
          periodRate: recomputed.periodRate,
          dailyRent: recomputed.dailyRent,
          originalAmount: recomputed.originalAmount,
          totalAmount: total,
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
        description: `Accommodation payment · ${booking.code} · ${recomputed.nights} nights × ${recomputed.periodRate}`,
        createdById: req.user.id || null,
        meta: {
          category: 'ACCOMMODATION',
          nightlyRate: recomputed.periodRate,
          nights: recomputed.nights,
          bookingCode: booking.code,
        },
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

    const finals = recomputeBookingTotals(booking);
    const total = finals.totalAmount;
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
            comment: comment ? String(comment).trim() : 'Accommodation payment',
            recordedById: req.user.id || null,
          },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          nights: finals.nights,
          periodQuantity: finals.periodQuantity,
          periodRate: finals.periodRate,
          dailyRent: finals.dailyRent,
          originalAmount: finals.originalAmount,
          totalAmount: total,
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
      include: { deposits: { where: { deletedAt: null } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
    if (booking.status !== 'CHECKED_IN') {
      throw new AppError(`Only CHECKED_IN bookings can check out (current: ${booking.status})`, 400);
    }

    const {
      amountPaid,
      paymentMethod,
      returnAmount = 0,
      deductAmount = 0,
      reason,
      depositNotes,
      depositId,
      skipDepositRefund = false,
    } = req.body || {};

    const finals = recomputeBookingTotals(booking);
    const total = finals.totalAmount;
    const currentPaid = money(booking.amountPaid);
    const requestedPaid =
      amountPaid !== undefined && amountPaid !== null ? money(amountPaid) : currentPaid;
    const nextPaid = Math.min(Math.max(requestedPaid, currentPaid), total);
    const outstanding = money(Math.max(0, total - nextPaid));

    if (outstanding > 0.009) {
      throw new AppError(
        `Outstanding accommodation balance is ${outstanding}. Collect accommodation payment before checkout (security deposit is separate and cannot cover this automatically).`,
        400,
      );
    }

    const paymentMethodValue =
      paymentMethod !== undefined
        ? normalizePaymentMethod(paymentMethod, { fallback: booking.paymentMethod || 'CASH' })
        : booking.paymentMethod || 'CASH';
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);

    const activeDeposit =
      (depositId && booking.deposits?.find((d) => d.id === depositId)) ||
      booking.deposits?.find((d) => ['HELD', 'PARTIALLY_RETURNED'].includes(d.status)) ||
      null;

    const ret = money(returnAmount);
    const ded = money(deductAmount);
    if ((ret > 0 || ded > 0) && !activeDeposit) {
      throw new AppError('No held security deposit found to settle', 400);
    }
    if (ded > 0 && !String(reason || depositNotes || '').trim()) {
      throw new AppError('Reason is required when deducting from the security deposit', 400);
    }

    await prisma.$transaction(async (tx) => {
      const delta = money(nextPaid - currentPaid);
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
            comment: 'Checkout accommodation settlement',
            recordedById: req.user.id || null,
          },
        });
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CHECKED_OUT',
          nights: finals.nights,
          periodQuantity: finals.periodQuantity,
          periodRate: finals.periodRate,
          dailyRent: finals.dailyRent,
          originalAmount: finals.originalAmount,
          totalAmount: total,
          amountPaid: nextPaid,
          paymentStatus: derivePaymentStatus(nextPaid, total),
          paymentMethod: paymentMethodValue,
        },
      });
      await tx.unit.update({
        where: { id: booking.unitId },
        data: { status: 'AVAILABLE' },
      });
    });

    if (activeDeposit && (ret > 0 || ded > 0)) {
      await settleDeposit(
        activeDeposit.id,
        {
          returnAmount: ret,
          deductAmount: ded,
          returnMethod: paymentMethodValue,
          reason: reason || depositNotes,
          notes: depositNotes || reason || 'Checkout deposit settlement',
          reference: payDetails.reference,
        },
        req.user.id,
      );
    } else if (activeDeposit && !skipDepositRefund) {
      const remaining = money(activeDeposit.remainingAmount);
      if (remaining > 0) {
        await settleDeposit(
          activeDeposit.id,
          {
            returnAmount: remaining,
            deductAmount: 0,
            returnMethod: paymentMethodValue,
            notes: 'Checkout — full security deposit refund (no maintenance)',
            reference: payDetails.reference,
          },
          req.user.id,
        );
      }
    }

    const refreshed = await prisma.booking.findFirst({
      where: { id: booking.id },
      include: bookingInclude,
    });
    return success(res, serializeBooking(refreshed));
  }),
);

/** Collect a refundable security deposit for a guest booking. */
router.post(
  '/:id/deposits',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);
    if (!['CONFIRMED', 'CHECKED_IN'].includes(booking.status)) {
      throw new AppError('Deposits can only be collected for active bookings', 400);
    }

    const deposit = await createDeposit(
      {
        bookingId: booking.id,
        unitId: booking.unitId,
        amount: req.body?.amount,
        method: req.body?.method || booking.paymentMethod,
        reference: req.body?.reference,
        receivedByName: req.body?.receivedByName,
        agentName: req.body?.agentName,
        officeMpesaNumber: req.body?.officeMpesaNumber,
        dateReceived: req.body?.dateReceived,
        notes: req.body?.notes || 'SECURITY DEPOSIT – REFUNDABLE',
      },
      req.user.id,
    );

    const refreshed = await prisma.booking.findFirst({
      where: { id: booking.id },
      include: bookingInclude,
    });
    return success(res, { deposit, booking: serializeBooking(refreshed) }, 201);
  }),
);

/** Settle (refund / deduct) a booking security deposit. */
router.post(
  '/:id/deposits/:depositId/settle',
  authorize('bookings:update'),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    await assertUnitBuildingAccess(req.user, booking.unitId, req.user.buildingIds);

    const deposit = await prisma.securityDeposit.findFirst({
      where: {
        id: req.params.depositId,
        bookingId: booking.id,
        deletedAt: null,
      },
    });
    if (!deposit) throw new AppError('Deposit not found for this booking', 404);

    const settled = await settleDeposit(deposit.id, req.body || {}, req.user.id);
    const refreshed = await prisma.booking.findFirst({
      where: { id: booking.id },
      include: bookingInclude,
    });
    return success(res, { deposit: settled, booking: serializeBooking(refreshed) });
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

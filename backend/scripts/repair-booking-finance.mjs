/**
 * Repair guest booking totals and linked finance invoices/receipts.
 * Accommodation = nightlyRate × nights.
 *
 * Handles legacy MONTHLY package rows and recovers from bad /30 repairs when
 * booking.monthlyRent itself was stored as a nightly figure (< 20,000).
 */
import { PrismaClient } from '@prisma/client';
import {
  bookingAccommodationFinancials,
  nightsBetween,
  periodBookingTotal,
  roundMoney,
} from '../src/utils/rent.js';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();
const money = (n) => roundMoney(n);

function pickNightly(b, unit) {
  const nights = nightsBetween(b.checkIn, b.checkOut);
  const unitDaily = unit?.dailyRate != null ? money(unit.dailyRate) : null;
  const unitMonthly = money(unit?.monthlyRent);
  const bookingMonthly = money(b.monthlyRent);
  const stored = money(b.periodRate || b.dailyRent);
  const total = money(b.totalAmount);

  const monthlyLooksNightly = bookingMonthly > 0 && bookingMonthly < 20000;
  const unitMonthlyLooksNightly = unitMonthly > 0 && unitMonthly < 20000;

  // Recover from bad monthly/30 when monthlyRent was actually a nightly
  // (must run before the "already consistent" check — 94.44×30 can look consistent)
  const paid = money(b.amountPaid);
  if (
    monthlyLooksNightly &&
    stored > 0 &&
    Math.abs(money(stored * 30) - bookingMonthly) <= 1
  ) {
    // If guest paid ~monthly, monthly is the nightly. If they paid far more, treat paid as package.
    if (paid > bookingMonthly * 2 && nights > 0) {
      return money(paid / nights);
    }
    return bookingMonthly;
  }
  if (unitMonthlyLooksNightly && stored > 0 && stored < unitMonthly / 5) {
    if (paid > unitMonthly * 2 && nights > 0) return money(paid / nights);
    return unitMonthly;
  }

  // Already consistent plausible nightly × nights
  if (
    nights > 1 &&
    stored > 0 &&
    stored < 20000 &&
    Math.abs(money(stored * nights) - total) <= 1
  ) {
    return stored;
  }

  // Legacy package: large periodRate ≈ total
  if (nights > 1 && stored >= 20000 && Math.abs(stored - total) <= 1) {
    return money(total / nights);
  }
  if (nights > 1 && bookingMonthly >= 20000 && Math.abs(stored - bookingMonthly) <= 1) {
    return money(bookingMonthly / 30);
  }

  if (unitDaily && unitDaily > 0 && stored >= 20000) return unitDaily;
  if (stored > 0) return stored;
  if (unitDaily) return unitDaily;
  if (bookingMonthly >= 20000) return money(bookingMonthly / 30);
  if (bookingMonthly > 0) return bookingMonthly;
  return 0;
}

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { deletedAt: null },
    include: { unit: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${bookings.length} bookings${dryRun ? ' (dry-run)' : ''}`);
  let bookingsFixed = 0;
  let docsFixed = 0;

  for (const b of bookings) {
    const nights = nightsBetween(b.checkIn, b.checkOut);
    if (nights < 1) {
      console.log(`${b.code}: skip (nights=${nights})`);
      continue;
    }

    const nightly = pickNightly(b, b.unit);
    const monthlyForCalc =
      money(b.monthlyRent) >= 20000 ? b.monthlyRent : money(nightly) * 30;
    const totals = periodBookingTotal({
      monthlyRent: monthlyForCalc,
      bookingPeriod: b.bookingPeriod || 'DAILY',
      periodRate: nightly,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      discountType: b.discountType,
      discountValue: b.discountValue ?? b.discount,
      servicesAmount: b.servicesAmount,
      taxesAmount: b.taxesAmount,
    });

    const oldTotal = money(b.totalAmount);
    const newTotal = money(totals.totalAmount);
    const amountPaid = money(b.amountPaid);
    const paymentStatus =
      amountPaid <= 0 ? 'UNPAID' : amountPaid + 0.001 >= newTotal ? 'PAID' : 'PARTIAL';

    const needsBookingUpdate =
      oldTotal !== newTotal ||
      Number(b.nights) !== totals.nights ||
      money(b.periodRate) !== money(totals.periodRate) ||
      money(b.dailyRent) !== money(totals.dailyRent) ||
      b.paymentStatus !== paymentStatus;

    if (needsBookingUpdate) {
      console.log(
        `${b.code}: total ${oldTotal} → ${newTotal} · nights ${b.nights} → ${totals.nights} · rate ${money(b.periodRate)} → ${money(totals.periodRate)}`,
      );
      if (!dryRun) {
        await prisma.booking.update({
          where: { id: b.id },
          data: {
            nights: totals.nights,
            periodQuantity: totals.periodQuantity,
            periodRate: totals.periodRate,
            dailyRent: totals.dailyRent,
            originalAmount: totals.originalAmount,
            totalAmount: newTotal,
            paymentStatus,
          },
        });
      }
      bookingsFixed += 1;
    }

    const docs = await prisma.financeDocument.findMany({
      where: {
        OR: [{ sourceId: b.id }, { description: { contains: b.code } }],
      },
    });

    // Accrue for invoice docs; receipts record money received
    const live = bookingAccommodationFinancials({
      ...b,
      periodRate: totals.periodRate,
      dailyRent: totals.dailyRent,
      nights: totals.nights,
      amountPaid,
      totalAmount: newTotal,
      discount: totals.discount,
      servicesAmount: b.servicesAmount,
      taxesAmount: b.taxesAmount,
    });
    const accrued = money(live.accruedAccommodation);
    // Proforma invoices quote the full expected stay; receipts use accrued / paid.
    const expected = money(live.expectedAccommodation ?? newTotal);

    const seen = new Set();
    for (const doc of docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const desc = String(doc.description || '');
      if (/SECURITY DEPOSIT/i.test(desc) && !/Accommodation/i.test(desc)) continue;

      const isReceipt = doc.type === 'RECEIPT';
      const nextAmount = isReceipt ? Math.max(accrued, amountPaid) : expected;
      const nextPaid = amountPaid;
      const nextRemaining = money(Math.max(0, nextAmount - amountPaid));
      const nextDesc = isReceipt
        ? `Accommodation payment · ${b.code}`
        : `Room ${b.unit?.roomNumber || ''} · ${b.code}`.trim();

      const changed =
        money(doc.amount) !== nextAmount ||
        money(doc.currentCharges) !== nextAmount ||
        money(doc.amountPaid) !== nextPaid ||
        money(doc.remainingBalance) !== nextRemaining;

      if (!changed) continue;
      console.log(`  doc ${doc.number} (${doc.type}): amount ${money(doc.amount)} → ${nextAmount}`);
      if (!dryRun) {
        await prisma.financeDocument.update({
          where: { id: doc.id },
          data: {
            description: nextDesc,
            billingPeriod: `${String(b.checkIn).slice(0, 10)} → ${String(b.checkOut).slice(0, 10)}`,
            amount: nextAmount,
            currentCharges: nextAmount,
            amountPaid: nextPaid,
            remainingBalance: nextRemaining,
            notes: [
              `Rate per night: ${money(totals.periodRate)}`,
              `Nights stayed (accrued): ${live.nightsStayed}`,
              `Expected full stay: ${totals.nights} nights · ${newTotal}`,
              'Future nights are not charged until occupied.',
              'Security deposit is separate and is not applied to this balance.',
            ].join('\n'),
            meta: {
              ...(doc.meta && typeof doc.meta === 'object' ? doc.meta : {}),
              correctedAt: new Date().toISOString(),
              repair: 'nightly-x-nights-accrual',
              bookingCode: b.code,
            },
          },
        });
      }
      docsFixed += 1;
    }
  }

  console.log(
    `\nDone. Bookings ${dryRun ? 'needing fix' : 'updated'}: ${bookingsFixed}. Finance docs ${dryRun ? 'needing fix' : 'updated'}: ${docsFixed}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

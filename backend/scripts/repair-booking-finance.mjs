/**
 * Repair guest booking totals and linked finance invoices/receipts.
 * Recalculates accommodation as nightlyRate × nights (never monthly package).
 *
 * Also recovers bookings previously “repaired” when a monthly package amount
 * was mistaken for a nightly rate.
 *
 * Usage (from backend/): node scripts/repair-booking-finance.mjs
 * Dry-run:              node scripts/repair-booking-finance.mjs --dry-run
 */
import { PrismaClient } from '@prisma/client';
import { nightsBetween, periodBookingTotal, roundMoney } from '../src/utils/rent.js';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function money(n) {
  return roundMoney(n);
}

/**
 * Resolve the true nightly rate from possibly-legacy stored fields.
 * Legacy MONTHLY bookings often stored periodRate = monthly package (= total).
 */
function resolveCanonicalNightly(b, nights) {
  const monthly = money(b.monthlyRent);
  const storedRate = money(b.periodRate || b.dailyRent);
  const total = money(b.totalAmount);
  const dailyFromMonthly = monthly > 0 ? money(monthly / 30) : null;

  if (!(storedRate > 0) && dailyFromMonthly) return dailyFromMonthly;
  if (!(storedRate > 0)) return 0;

  // periodRate was set to the monthly rent (package mistaken as rate)
  if (monthly > 0 && Math.abs(storedRate - monthly) <= 1) {
    return dailyFromMonthly;
  }

  // Old package: total ≈ periodRate while stay is multi-night
  if (nights > 1 && Math.abs(storedRate - total) <= 1) {
    return money(total / nights);
  }

  // Inflated repair: periodRate looks like a monthly figure, total = rate × nights
  if (
    nights > 1 &&
    dailyFromMonthly &&
    storedRate > dailyFromMonthly * 5 &&
    Math.abs(money(storedRate * nights) - total) <= 1
  ) {
    return dailyFromMonthly;
  }

  return storedRate;
}

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { deletedAt: null },
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

    const nightly = resolveCanonicalNightly(b, nights);
    const totals = periodBookingTotal({
      monthlyRent: b.monthlyRent,
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
            discount: totals.discount,
            discountType: totals.discountType,
            discountValue: totals.discountValue,
            totalAmount: newTotal,
            paymentStatus,
          },
        });
      }
      bookingsFixed += 1;
    }

    const docs = await prisma.financeDocument.findMany({
      where: {
        OR: [
          {
            sourceType: { in: ['BOOKING_ACCOMMODATION', 'BOOKING_PAYMENT'] },
            sourceId: b.id,
          },
          {
            AND: [
              { description: { contains: b.code } },
              {
                OR: [
                  { description: { contains: 'Accommodation' } },
                  { description: { contains: 'Booking' } },
                  { description: { contains: 'invoice' } },
                  { description: { contains: 'Invoice' } },
                  { description: { contains: 'payment' } },
                  { description: { contains: 'Payment' } },
                ],
              },
            ],
          },
        ],
      },
    });

    const seen = new Set();
    for (const doc of docs) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);

      const desc = String(doc.description || '');
      if (/SECURITY DEPOSIT/i.test(desc) && !/Accommodation/i.test(desc)) continue;

      const isReceipt = doc.type === 'RECEIPT';
      const nextAmount = newTotal;
      const nextPaid = amountPaid;
      const nextRemaining = money(Math.max(0, nextAmount - amountPaid));
      const nextCurrent = newTotal;
      const nextDesc = isReceipt
        ? `Accommodation payment · ${b.code}`
        : `Accommodation invoice · ${b.code} · ${totals.nights} nights × ${money(totals.periodRate)}`;
      const nextNotes = [
        `Rate per night: ${money(totals.periodRate)}`,
        `Expected nights: ${totals.nights}`,
        'Security deposit is separate and is not applied to this balance.',
        'Corrected from nightly × nights accrual.',
      ].join('\n');

      const changed =
        money(doc.amount) !== nextAmount ||
        money(doc.currentCharges) !== nextCurrent ||
        money(doc.amountPaid) !== nextPaid ||
        money(doc.remainingBalance) !== nextRemaining ||
        String(doc.description || '') !== nextDesc;

      if (!changed) continue;

      console.log(
        `  doc ${doc.number} (${doc.type}): amount ${money(doc.amount)} → ${nextAmount}`,
      );
      if (!dryRun) {
        // Do not rewrite sourceType/sourceId — avoids unique conflicts with siblings
        await prisma.financeDocument.update({
          where: { id: doc.id },
          data: {
            description: nextDesc,
            billingPeriod: `${String(b.checkIn).slice(0, 10)} → ${String(b.checkOut).slice(0, 10)}`,
            amount: nextAmount,
            currentCharges: nextCurrent,
            amountPaid: nextPaid,
            remainingBalance: nextRemaining,
            notes: nextNotes,
            unitId: b.unitId,
            meta: {
              ...(doc.meta && typeof doc.meta === 'object' ? doc.meta : {}),
              correctedAt: new Date().toISOString(),
              repair: 'nightly-x-nights',
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

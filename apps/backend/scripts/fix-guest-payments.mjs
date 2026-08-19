import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function derivePaymentStatus(amountPaid, totalAmount) {
  const paid = Number(amountPaid) || 0;
  const due = Number(totalAmount) || 0;
  if (paid <= 0) return 'UNPAID';
  if (paid >= due) return 'PAID';
  return 'PARTIAL';
}

try {
  const stale = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { in: ['CHECKED_OUT', 'CHECKED_IN'] },
      OR: [{ amountPaid: 0 }, { paymentStatus: 'UNPAID' }],
    },
  });

  let fixed = 0;
  for (const b of stale) {
    const total = Number(b.totalAmount);
    const paid = Number(b.amountPaid);
    if (paid >= total && total > 0) continue;
    if (b.status === 'CHECKED_OUT' && paid < total) {
      await prisma.booking.update({
        where: { id: b.id },
        data: {
          amountPaid: total,
          paymentStatus: 'PAID',
        },
      });
      fixed += 1;
      console.log(`Fixed ${b.code}: marked PAID ${total}`);
    }
  }
  console.log(`Done. Fixed ${fixed} booking(s).`);
} finally {
  await prisma.$disconnect();
}

import prisma from '../config/database.js';

/**
 * Allocate the next sequential document number inside a transaction.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {'INVOICE'|'RECEIPT'|'TXN'} key
 */
export async function nextDocumentNumber(tx, key) {
  const year = new Date().getFullYear();
  const prefix = key === 'INVOICE' ? 'INV' : key === 'RECEIPT' ? 'RCP' : 'TXN';

  const row = await tx.documentSequence.upsert({
    where: { key_year: { key, year } },
    create: { key, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const n = String(row.lastNumber).padStart(5, '0');
  return `${prefix}-${year}-${n}`;
}

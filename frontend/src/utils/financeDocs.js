import { rentalApi } from '../services/rentalApi.js';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function openPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { opened: false, url };
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return { opened: true, url };
}

/**
 * Create a finance invoice/receipt and return { doc, blob }.
 */
export async function createFinanceDocPdf(payload) {
  const doc = await rentalApi.createFinanceDocument(payload);
  const blob = await rentalApi.downloadFinanceDocumentPdf(doc.id);
  return { doc, blob };
}

export async function printFinanceDoc(payload) {
  const { doc, blob } = await createFinanceDocPdf(payload);
  const { opened } = await openPdfBlob(blob);
  if (!opened) {
    downloadBlob(blob, `${doc.number || 'document'}.pdf`);
  }
  return doc;
}

export async function downloadFinanceDoc(payload) {
  const { doc, blob } = await createFinanceDocPdf(payload);
  downloadBlob(blob, `${doc.number || 'document'}.pdf`);
  return doc;
}

export async function shareFinanceDoc(payload, { title, text } = {}) {
  const { doc, blob } = await createFinanceDocPdf(payload);
  const filename = `${doc.number || 'document'}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: title || (doc.type === 'RECEIPT' ? 'Payment receipt' : 'Invoice'),
      text: text || doc.customerName || '',
      files: [file],
    });
    return { doc, shared: true };
  }
  downloadBlob(blob, filename);
  return { doc, shared: false };
}

/** Build a rent/monthly payment invoice or receipt payload. */
export function rentPaymentDocPayload(payment, ctx = {}, type = 'RECEIPT') {
  const due = Number(payment.amountDue) || 0;
  const paid = Number(payment.amountPaid) || 0;
  const balance = Math.max(0, Math.round((due - paid) * 100) / 100);
  const month = payment.month || ctx.month || '';
  return {
    type,
    customerName: ctx.customerName || payment.name || 'Tenant',
    customerPhone: ctx.customerPhone || payment.phone || null,
    unitId: ctx.unitId || payment.unitId || null,
    description:
      type === 'RECEIPT'
        ? `Payment receipt · Rent ${month}`
        : `Rent invoice · ${month}`,
    billingPeriod: month,
    amount: due,
    previousBalance: 0,
    currentCharges: due,
    amountPaid: paid,
    remainingBalance: balance,
    method: payment.method || null,
    dueDate: payment.paymentDate || null,
    paymentDate: payment.paymentDate || null,
    sourceType: type === 'RECEIPT' ? 'MONTHLY_PAYMENT' : 'MONTHLY_INVOICE',
    sourceId: payment.id,
    buildingName: ctx.buildingName || payment.building || null,
    floorName: ctx.floorName || payment.floor || null,
    unitNumber: ctx.unitNumber || payment.roomNumber || payment.room || null,
    notes: payment.notes || null,
  };
}

/** Build a booking invoice/receipt payload from a mapped booking row. */
export function bookingDocPayload(booking, type = 'INVOICE') {
  const total = Number(booking.total) || 0;
  const paid = Number(booking.amountPaid) || 0;
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  const period = `${String(booking.checkIn || '').slice(0, 10)} → ${String(booking.checkOut || '').slice(0, 10)}`;
  return {
    type,
    customerName: booking.fullName,
    customerPhone: booking.phone || null,
    unitId: booking.roomId || booking.unitId || null,
    description:
      type === 'RECEIPT'
        ? `Payment receipt · Guest booking ${booking.code}`
        : `Guest booking ${booking.code}`,
    billingPeriod: period,
    amount: total,
    previousBalance: 0,
    currentCharges: total,
    amountPaid: paid,
    remainingBalance: balance,
    method: booking.paymentMethod || null,
    dueDate: booking.checkOut || null,
    paymentDate: booking.checkIn || null,
    sourceType: type === 'RECEIPT' ? 'BOOKING_PAYMENT' : 'BOOKING',
    sourceId: booking.id,
    buildingName: booking.building || null,
    floorName: booking.floor || null,
    unitNumber: booking.roomNumber || null,
    notes: booking.notes || null,
  };
}

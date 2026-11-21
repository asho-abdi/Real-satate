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

/** Build a booking accommodation invoice/receipt payload from a mapped booking row. */
export function bookingDocPayload(booking, type = 'INVOICE') {
  const fin = booking.financials || {};
  const expected = Number(fin.expectedAccommodation ?? booking.total) || 0;
  const accrued = Number(
    fin.accruedAccommodation != null ? fin.accruedAccommodation : expected,
  );
  const paid = Number(fin.accommodationPaid ?? booking.amountPaid) || 0;
  // Proforma invoices quote the expected full stay; receipts / mid-stay charges use accrued.
  const chargeBasis =
    type === 'RECEIPT' ? Math.max(accrued, paid) : expected > 0 ? expected : accrued;
  const balance = Math.max(0, Math.round((chargeBasis - paid) * 100) / 100);
  const period = `${String(booking.checkIn || '').slice(0, 10)} → ${String(booking.checkOut || '').slice(0, 10)}`;
  const expectedNights = Number(fin.expectedNights ?? booking.nights) || 0;
  const nightsStayed = Number(fin.nightsStayed ?? 0);
  const rate = Number(fin.nightlyRate ?? booking.periodRate ?? booking.dailyRent) || 0;
  const guests =
    Number(booking.adultsCount ?? 1) + Number(booking.childrenCount ?? 0) || 1;
  const deposit = booking.depositSummary || booking.deposit || null;
  const depositPaid = Number(
    deposit?.received ?? deposit?.amount ?? booking.depositSummary?.received ?? 0,
  );
  const depositHeld = Number(
    deposit?.remaining ?? deposit?.held ?? deposit?.remainingAmount ?? depositPaid,
  );
  const depositStatus = deposit?.status || booking.depositSummary?.status || null;
  return {
    type,
    customerName: booking.fullName,
    customerPhone: booking.phone || null,
    unitId: booking.roomId || booking.unitId || null,
    description:
      type === 'RECEIPT'
        ? `Accommodation payment · ${booking.code}`
        : `Room ${booking.roomNumber || ''} · ${booking.code}`.trim(),
    billingPeriod: period,
    amount: chargeBasis,
    previousBalance: 0,
    currentCharges: chargeBasis,
    amountPaid: paid,
    remainingBalance: balance,
    method: booking.paymentMethod || null,
    dueDate: booking.checkOut || null,
    paymentDate: booking.checkIn || null,
    sourceType: type === 'RECEIPT' ? 'BOOKING_PAYMENT' : 'BOOKING_ACCOMMODATION',
    sourceId: booking.id,
    buildingName: booking.building || null,
    floorName: booking.floor || null,
    unitNumber: booking.roomNumber || null,
    receivedByName: booking.payments?.[0]?.receivedByName || null,
    // Proforma layout fields (stored in FinanceDocument.meta)
    bookingCode: booking.code || null,
    checkInTime: booking.checkInTime || null,
    nightsQuantity: expectedNights || nightsStayed,
    nightsStayed,
    guestsCount: guests,
    ratePerNight: rate,
    taxesAmount: Number(booking.taxesAmount) || 0,
    securityDepositPaid: depositPaid,
    securityDepositHeld: depositHeld,
    securityDepositStatus: depositStatus,
    notes: [
      depositPaid > 0
        ? `Security deposit paid: ${depositPaid} (${depositStatus || 'HELD'}) — refundable, not accommodation revenue.`
        : 'No security deposit recorded for this booking.',
      `Rate per night: ${rate}`,
      `Nights stayed (accrued): ${nightsStayed} / expected ${expectedNights}`,
      'Security deposit does not automatically reduce the accommodation balance.',
      booking.notes || '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/** Security deposit receipt payload (refundable — not accommodation revenue). */
export function bookingDepositDocPayload(booking, deposit) {
  const amount = Number(deposit?.amount ?? booking.depositSummary?.received ?? 0);
  const remaining = Number(deposit?.remainingAmount ?? booking.depositSummary?.remaining ?? amount);
  return {
    type: 'RECEIPT',
    customerName: booking.fullName,
    customerPhone: booking.phone || null,
    unitId: booking.roomId || booking.unitId || null,
    description: `SECURITY DEPOSIT – REFUNDABLE · ${booking.code}`,
    billingPeriod: `${String(booking.checkIn || '').slice(0, 10)} → ${String(booking.checkOut || '').slice(0, 10)}`,
    amount,
    previousBalance: 0,
    currentCharges: amount,
    amountPaid: amount,
    remainingBalance: 0,
    method: deposit?.method || booking.paymentMethod || null,
    paymentDate: deposit?.dateReceived || null,
    sourceType: 'SECURITY_DEPOSIT_TXN',
    sourceId: deposit?.transactions?.[0]?.id || deposit?.id || booking.id,
    buildingName: booking.building || null,
    floorName: booking.floor || null,
    unitNumber: booking.roomNumber || null,
    notes: [
      'SECURITY DEPOSIT – REFUNDABLE',
      `Status: ${deposit?.status || booking.depositSummary?.status || 'HELD'}`,
      `Refundable held: ${remaining}`,
      'This is not accommodation revenue.',
    ].join('\n'),
  };
}

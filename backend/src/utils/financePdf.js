import PDFDocument from 'pdfkit';

const BRAND = {
  navy: '#1a4a6e',
  ink: '#243447',
  muted: '#5c6f84',
  border: '#dce4ee',
  soft: '#eef3f8',
};

function money(n, currency = 'KES') {
  const v = Number(n || 0);
  return `${currency} ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateStr(v) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

/**
 * Stream a compact invoice/receipt PDF sized for small slip / thermal paper (~80mm).
 */
export function streamFinanceDocumentPdf(res, docMeta, company = {}) {
  const isReceipt = docMeta.type === 'RECEIPT';
  const title = isReceipt ? 'PAYMENT RECEIPT' : 'INVOICE';
  const companyName = company.companyName || company['app.name'] || 'RJK REALTY';
  const currency = company.currency || 'KES';

  const filename = `${docMeta.number || title}.pdf`.replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // ~80mm wide slip (thermal / small paper). Tall enough for typical booking invoice.
  const pageW = 226.77; // 80mm
  const pageH = 480;
  const m = 14;
  const contentW = pageW - m * 2;

  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: m,
  });
  doc.pipe(res);

  let y = m;

  doc.fillColor(BRAND.navy).fontSize(11).font('Helvetica-Bold').text(companyName, m, y, {
    width: contentW,
    align: 'center',
  });
  y += 14;
  doc.fillColor(BRAND.ink).fontSize(9).font('Helvetica-Bold').text(title, m, y, {
    width: contentW,
    align: 'center',
  });
  y += 12;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .lineWidth(0.8)
    .stroke();
  y += 10;

  const line = (label, value, opts = {}) => {
    const labelW = 78;
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(label, m, y, { width: labelW });
    doc
      .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts.bold ? 8 : 7)
      .fillColor(BRAND.ink)
      .text(String(value ?? '—'), m + labelW, y, { width: contentW - labelW, align: 'right' });
    y += opts.tall ? 14 : 11;
  };

  line(isReceipt ? 'Receipt No.' : 'Invoice No.', docMeta.number || '—', { bold: true });
  line('Date', dateStr(docMeta.paymentDate || docMeta.createdAt));
  line('Customer', docMeta.customerName || '—', { bold: true });
  if (docMeta.customerPhone) line('Phone', docMeta.customerPhone);

  const loc = [
    docMeta.buildingName,
    docMeta.floorName,
    docMeta.unitNumber ? `Unit ${docMeta.unitNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (loc) line('Property', loc, { tall: true });

  y += 2;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .stroke();
  y += 8;

  if (docMeta.description) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.ink).text('Description', m, y);
    y += 10;
    const descH = doc.heightOfString(docMeta.description, { width: contentW, fontSize: 7 });
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(docMeta.description, m, y, {
      width: contentW,
    });
    y += Math.max(12, descH + 4);
  }

  line('Period', docMeta.billingPeriod || '—');
  if (Number(docMeta.previousBalance) > 0) {
    line('Previous balance', money(docMeta.previousBalance, currency));
  }
  line('Charges', money(docMeta.currentCharges ?? docMeta.amount, currency));
  line('Amount paid', money(docMeta.amountPaid, currency), { bold: true });
  line('Balance due', money(docMeta.remainingBalance, currency), { bold: true });
  if (docMeta.method) line('Method', String(docMeta.methodLabel || docMeta.method));
  if (docMeta.reference) line('Reference', docMeta.reference);
  if (docMeta.receivedBy) line('Received by', docMeta.receivedBy);
  if (docMeta.dueDate) line('Due date', dateStr(docMeta.dueDate));

  if (docMeta.notes) {
    y += 4;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.ink).text('Notes', m, y);
    y += 10;
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(String(docMeta.notes), m, y, {
      width: contentW,
    });
    y += 16;
  }

  y += 6;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .stroke();
  y += 8;
  doc
    .fillColor(BRAND.muted)
    .fontSize(6)
    .font('Helvetica')
    .text('Thank you · RJK Realty', m, y, { width: contentW, align: 'center' });

  doc.end();
}

/**
 * Stream a tenant/customer statement PDF.
 */
export function streamStatementPdf(res, statement, company = {}) {
  const companyName = company.companyName || company['app.name'] || 'RJK REALTY';
  const currency = company.currency || 'KES';
  const filename = `Statement-${(statement.customer?.name || 'customer').replace(/[^\w.-]+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 56).fill(BRAND.navy);
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(companyName, 40, 18);
  doc.fontSize(10).font('Helvetica').text('CUSTOMER STATEMENT', 40, 38);

  let y = 72;
  doc.fillColor(BRAND.ink).fontSize(11).font('Helvetica-Bold').text(statement.customer?.name || '—', 40, y);
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted);
  const loc = [
    statement.unit?.building?.name,
    statement.unit?.floor?.name,
    statement.unit?.roomNumber ? `Unit ${statement.unit.roomNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  doc.text([statement.customer?.phone, loc].filter(Boolean).join('  |  '), 40, y);
  y += 18;

  const cols = [
    { x: 40, w: 70, h: 'Date' },
    { x: 110, w: 260, h: 'Description' },
    { x: 370, w: 80, h: 'Debit' },
    { x: 450, w: 80, h: 'Credit' },
    { x: 530, w: 90, h: 'Balance' },
    { x: 620, w: 110, h: 'Method / Ref' },
  ];
  doc.rect(40, y, doc.page.width - 80, 18).fill(BRAND.soft);
  doc.fillColor(BRAND.ink).font('Helvetica-Bold').fontSize(8);
  for (const c of cols) doc.text(c.h, c.x, y + 5, { width: c.w });
  y += 22;

  doc.font('Helvetica').fontSize(8);
  for (const line of statement.lines || []) {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    doc.fillColor(BRAND.ink).text(dateStr(line.date), cols[0].x, y, { width: cols[0].w });
    doc.text(line.description || '', cols[1].x, y, { width: cols[1].w });
    doc.text(line.debit ? money(line.debit, currency) : '—', cols[2].x, y, { width: cols[2].w });
    doc.text(line.credit ? money(line.credit, currency) : '—', cols[3].x, y, { width: cols[3].w });
    doc.text(money(line.balance, currency), cols[4].x, y, { width: cols[4].w });
    doc.fillColor(BRAND.muted).text(
      [line.method, line.reference].filter(Boolean).join(' / ') || '—',
      cols[5].x,
      y,
      { width: cols[5].w },
    );
    y += 14;
  }

  y += 10;
  doc.fillColor(BRAND.ink).font('Helvetica-Bold').fontSize(10);
  doc.text(`Outstanding balance: ${money(statement.summary?.outstandingBalance, currency)}`, 40, y);
  y += 14;
  doc.font('Helvetica').fillColor(BRAND.muted);
  doc.text(`Deposits held (liability): ${money(statement.summary?.depositsHeld, currency)}`, 40, y);

  doc.end();
}

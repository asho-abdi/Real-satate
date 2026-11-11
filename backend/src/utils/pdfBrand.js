/**
 * Shared RJK Realty look for every generated PDF (reports, statements, …):
 * logo letterhead, one navy rule, quiet tables, status pills and a footer
 * with page numbers. Plain on purpose — white page, no gradients.
 */
import { fileURLToPath } from 'node:url';

export const BRAND = {
  navy: '#002b50',
  ink: '#0f1e33',
  muted: '#64748b',
  line: '#e3e8ef',
  zebra: '#f7f9fc',
  soft: '#f3f5f9',
  gold: '#f5a900',
  green: '#0e7a55',
  red: '#b4232f',
};

export const LOGO_PATH = fileURLToPath(new URL('../assets/brand/rjk-logo.png', import.meta.url));

const PILL = {
  green: { bg: '#e9f7f1', fg: '#0e7a55' },
  navy: { bg: '#eaf0f7', fg: '#002b50' },
  gold: { bg: '#fff6e0', fg: '#8a5a00' },
  red: { bg: '#fdeeee', fg: '#b4232f' },
  orange: { bg: '#fff1e6', fg: '#a3460c' },
  slate: { bg: '#eef1f5', fg: '#475569' },
  violet: { bg: '#f3eefc', fg: '#6b46c1' },
};

const STATUS_TONE = {
  AVAILABLE: 'green',
  VACANT: 'green',
  PAID: 'green',
  ACTIVE: 'green',
  COMPLETED: 'green',
  CONFIRMED: 'green',
  RETURNED: 'green',
  FULLY_RETURNED: 'green',
  OCCUPIED: 'navy',
  RENTED: 'navy',
  CHECKED_IN: 'navy',
  HELD: 'navy',
  PARTIAL: 'gold',
  RESERVED: 'gold',
  PENDING: 'gold',
  IN_PROGRESS: 'gold',
  PARTIALLY_RETURNED: 'gold',
  UNPAID: 'red',
  OVERDUE: 'red',
  CANCELLED: 'red',
  MAINTENANCE: 'orange',
  CLEANING: 'orange',
  DEDUCTED: 'orange',
  SOLD: 'violet',
  CHECKED_OUT: 'slate',
};

export function prettyCompany(name) {
  if (!name) return 'RJK Realty';
  return name === name.toUpperCase() ? name.replace(/\bREALTY\b/, 'Realty') : name;
}

export function money(n, currency = 'KES') {
  const v = Number(n || 0);
  return `${currency} ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function longDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function titleCase(value) {
  const raw = value == null ? '' : String(value);
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Small uppercase label used for section and column headings. */
export function label(doc, text, x, y, opts = {}) {
  doc
    .font('Helvetica-Bold')
    .fontSize(opts.size || 7)
    .fillColor(opts.color || BRAND.muted)
    .text(String(text).toUpperCase(), x, y, { characterSpacing: 0.9, lineBreak: false, ...opts });
}

/**
 * Logo letterhead. Full version on the first page, compact on continuation pages.
 * Returns the y position just below the navy rule.
 */
export function letterhead(doc, { margin, title, subtitle, metaLines = [], compact = false }) {
  const W = doc.page.width;
  const CW = W - margin * 2;
  const top = compact ? 26 : 40;
  const logoW = compact ? 78 : 132;

  try {
    doc.image(LOGO_PATH, margin, top, { width: logoW });
  } catch {
    doc.font('Helvetica-Bold').fontSize(compact ? 11 : 16).fillColor(BRAND.navy).text('RJK Realty', margin, top + 8);
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(compact ? 11 : 20)
    .fillColor(BRAND.navy)
    .text(pdfText(title).toUpperCase(), margin, top + (compact ? 4 : 6), { width: CW, align: 'right', characterSpacing: 0.8 });

  let ry = doc.y + (compact ? 2 : 4);
  if (subtitle) {
    doc.font('Helvetica').fontSize(compact ? 7.5 : 9).fillColor(BRAND.muted).text(pdfText(subtitle), margin, ry, { width: CW, align: 'right' });
    ry = doc.y + 1;
  }
  if (!compact) {
    for (const line of metaLines.filter(Boolean)) {
      doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted).text(line, margin, ry, { width: CW, align: 'right' });
      ry = doc.y + 1;
    }
  }

  const logoBottom = top + logoW * (410 / 720);
  const ruleY = Math.max(logoBottom, ry) + (compact ? 8 : 14);
  doc.rect(margin, ruleY, CW, compact ? 0.8 : 1.2).fill(BRAND.navy);
  return ruleY + (compact ? 14 : 22);
}

/** Rounded status pill. Returns its width. */
export function statusPill(doc, value, x, y, maxW = 90) {
  const key = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  const tone = PILL[STATUS_TONE[key] || 'slate'];
  const text = titleCase(value);
  doc.font('Helvetica-Bold').fontSize(7);
  const w = Math.min(doc.widthOfString(text) + 12, maxW);
  doc.save();
  doc.roundedRect(x, y, w, 13, 3).fill(tone.bg);
  doc.fillColor(tone.fg).text(text, x + 6, y + 3.3, { width: w - 10, lineBreak: false, ellipsis: true });
  doc.restore();
  return w;
}

/**
 * Summary band: a row of figure boxes (label + value). `items` = [{ label, value, accent? }].
 * Returns the y position below the band.
 */
export function kpiBand(doc, { margin, y, items }) {
  const CW = doc.page.width - margin * 2;
  const gap = 8;
  const n = items.length;
  const w = (CW - gap * (n - 1)) / n;
  const h = 46;
  items.forEach((it, i) => {
    const x = margin + i * (w + gap);
    doc.save();
    doc.roundedRect(x, y, w, h, 5).lineWidth(0.7).strokeColor(BRAND.line).stroke();
    if (it.accent) doc.rect(x + 0.5, y + h - 2.5, w - 1, 2.2).fill(BRAND.gold);
    doc.restore();
    label(doc, it.label, x + 10, y + 9, { width: w - 20, ellipsis: true });
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(it.color || BRAND.ink)
      .text(String(it.value ?? '—'), x + 10, y + 22, { width: w - 20, lineBreak: false, ellipsis: true });
  });
  return y + h + 18;
}

/** Footer on every buffered page: gold mark + company line, generated stamp, page x of y. */
export function footers(doc, { margin, companyName, note }) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const W = doc.page.width;
    const H = doc.page.height;
    const CW = W - margin * 2;
    const y = H - 34;
    // Writing below the bottom margin would otherwise trigger an automatic new page.
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(margin, y - 10, CW, 0.6).fill(BRAND.line);
    doc.rect(margin, y + 2.5, 15, 3).fill(BRAND.gold);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(BRAND.muted)
      .text(`${companyName} · Property Management, Simplified.`, margin + 21, y, { width: CW * 0.5, lineBreak: false });
    if (note) doc.text(note, margin, y, { width: CW, align: 'center', lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, margin, y, { width: CW, align: 'right', lineBreak: false });
    doc.page.margins.bottom = prevBottom;
  }
}

export function generatedStamp() {
  return `Generated ${new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * The built-in PDF fonts only cover WinAnsi characters. Swap the few symbols
 * our data uses that would otherwise print as garbage (e.g. "→" in date ranges).
 */
export function pdfText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\s*[→⇒➝]\s*/g, ' – ')
    .replace(/[−]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

let appCurrency = 'KES';
let appName = 'RJK REALTY';
/** KES per 1 USD — used for live display conversion. */
let usdKesRate = 129.5;

export const DEFAULT_USD_KES_RATE = 129.5;

export function setAppCurrency(currency) {
  appCurrency = currency || 'KES';
}

export function getAppCurrency() {
  return appCurrency;
}

export function setAppName(name) {
  appName = name || 'RJK REALTY';
}

export function getAppName() {
  return appName;
}

export function setUsdKesRate(rate) {
  const n = Number(rate);
  usdKesRate = Number.isFinite(n) && n > 0 ? n : DEFAULT_USD_KES_RATE;
}

export function getUsdKesRate() {
  return usdKesRate;
}

export function kesToUsd(kes, rate = usdKesRate) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return (Number(kes) || 0) / r;
}

export function usdToKes(usd, rate = usdKesRate) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return (Number(usd) || 0) * r;
}

function formatSingle(value, currency) {
  return new Intl.NumberFormat(currency === 'KES' ? 'en-KE' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

/**
 * Format a KES-stored amount.
 * Default dual: "Ksh 40,000.00 · $308.88"
 *
 * @param {number|string} value
 * @param {string|{ currency?: string, dual?: boolean }} [currencyOrOpts]
 */
export function formatCurrency(value, currencyOrOpts = appCurrency) {
  let currency = appCurrency;
  let dual = true;
  if (typeof currencyOrOpts === 'string') {
    currency = currencyOrOpts || appCurrency;
    // Explicit non-KES single currency → no dual pair
    if (currency !== 'KES' && currency !== appCurrency) dual = false;
    if (currency !== 'KES') dual = false;
  } else if (currencyOrOpts && typeof currencyOrOpts === 'object') {
    currency = currencyOrOpts.currency || appCurrency;
    dual = currencyOrOpts.dual !== false;
  }

  const primary = formatSingle(value, currency || 'KES');
  if (!dual || (currency || 'KES') !== 'KES') return primary;

  const usd = kesToUsd(value);
  const secondary = formatSingle(usd, 'USD');
  return `${primary} · ${secondary}`;
}

/** Short USD-only label for form hints, e.g. "≈ $308.88". */
export function formatUsdApprox(kes) {
  if (kes === '' || kes == null || Number.isNaN(Number(kes))) return '';
  return `≈ ${formatSingle(kesToUsd(kes), 'USD')}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

/** Building + floor subtext for room/shop table cells. */
export function formatRoomLocation({ building, floor } = {}) {
  const parts = [building, floor].filter(Boolean);
  return parts.length ? parts.join(' • ') : '—';
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function downloadBlob(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','),
    ),
  ];
  return lines.join('\n');
}

let appCurrency = 'KES';
let appName = 'RJK REALTY';

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

export function formatCurrency(value, currency = appCurrency) {
  return new Intl.NumberFormat(currency === 'KES' ? 'en-KE' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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

/** Dual-currency helpers. KES is the stored source of truth; USD is display-only. */

export const DEFAULT_USD_KES_RATE = 129.5;

export function parseUsdKesRate(value, fallback = DEFAULT_USD_KES_RATE) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function kesToUsd(kes, rate = DEFAULT_USD_KES_RATE) {
  const r = parseUsdKesRate(rate);
  return (Number(kes) || 0) / r;
}

export function usdToKes(usd, rate = DEFAULT_USD_KES_RATE) {
  const r = parseUsdKesRate(rate);
  return (Number(usd) || 0) * r;
}

/**
 * Format an amount stored in KES for display.
 * Default: "KES 40,000.00 · USD 308.88"
 */
export function formatMoney(n, opts = {}) {
  const {
    currency = 'KES',
    dual = true,
    usdKesRate = DEFAULT_USD_KES_RATE,
    locale = 'en-KE',
  } = opts;
  const v = Number(n || 0);
  const primary = `${currency} ${v.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (!dual || currency !== 'KES') return primary;
  const usd = kesToUsd(v, usdKesRate);
  const secondary = `USD ${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return `${primary} · ${secondary}`;
}

export function rateFromSettingsMap(map = {}) {
  return parseUsdKesRate(map['currency.usdKesRate'] ?? map.usdKesRate);
}

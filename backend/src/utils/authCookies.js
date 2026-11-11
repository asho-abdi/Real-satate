/**
 * Dual-mode auth cookies: set alongside body tokens so clients can migrate
 * off localStorage without a hard cutover.
 */

const ACCESS_COOKIE = 'rjk_access';
const REFRESH_COOKIE = 'rjk_refresh';

function cookieSecure() {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return String(process.env.FRONTEND_URL || '').startsWith('https://');
}

function baseOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: cookieSecure() ? 'none' : 'lax',
    path: '/',
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const base = baseOptions();
  // Access: short-lived (align with typical JWT access TTL ~15m–1h)
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: 60 * 60 * 1000,
  });
  // Refresh: longer
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  const base = baseOptions();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}

export function readAccessCookie(req) {
  return req.cookies?.[ACCESS_COOKIE] || null;
}

export function readRefreshCookie(req) {
  return req.cookies?.[REFRESH_COOKIE] || null;
}

export const AUTH_COOKIE_NAMES = { ACCESS_COOKIE, REFRESH_COOKIE };

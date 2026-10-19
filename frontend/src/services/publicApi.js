/**
 * HOLD stub — public catalog API is archived under
 * frontend/src/HOLD_ARCHIVED/public-houdo-souk/
 *
 * mediaUrl remains so unused realty listing components can resolve imports
 * without pulling the public website back into the live app.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const origin = String(API_BASE).replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getCatalog() {
  throw new Error('Public catalog is on hold. See frontend/src/HOLD_ARCHIVED/public-houdo-souk/');
}

export function getPublicProperty() {
  throw new Error('Public catalog is on hold. See frontend/src/HOLD_ARCHIVED/public-houdo-souk/');
}

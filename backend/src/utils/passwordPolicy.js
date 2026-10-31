/**
 * Production-appropriate password policy for staff accounts.
 * @param {string} password
 * @returns {{ ok: boolean, message?: string }}
 */
export function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < 10) {
    return { ok: false, message: 'Password must be at least 10 characters' };
  }
  if (value.length > 128) {
    return { ok: false, message: 'Password is too long' };
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) {
    return { ok: false, message: 'Password must include upper and lower case letters' };
  }
  if (!/[0-9]/.test(value)) {
    return { ok: false, message: 'Password must include a number' };
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return { ok: false, message: 'Password must include a special character' };
  }
  const lower = value.toLowerCase();
  const banned = ['password', 'admin@123', '12345678', 'qwerty', 'rjkrealty'];
  if (banned.some((b) => lower.includes(b))) {
    return { ok: false, message: 'Password is too common' };
  }
  return { ok: true };
}

export default { validatePasswordStrength };

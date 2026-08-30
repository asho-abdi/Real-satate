/** @typedef {typeof ROLES[keyof typeof ROLES]} RoleName */

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  ACCOUNTANT: 'ACCOUNTANT',
  CUSTOMER: 'CUSTOMER',
  VIEWER: 'VIEWER',
});

/**
 * @param {string | null | undefined} name
 * @returns {boolean}
 */
export function isSuperAdminRole(name) {
  if (!name) return false;
  const normalized = String(name).trim().toUpperCase().replace(/\s+/g, '_');
  return (
    normalized === ROLES.SUPER_ADMIN ||
    normalized === 'SUPERADMIN' ||
    String(name).trim().toLowerCase() === 'super admin'
  );
}

/**
 * @param {string | null | undefined} name
 * @returns {boolean}
 */
export function isAdminRole(name) {
  if (!name) return false;
  const normalized = String(name).trim().toUpperCase().replace(/\s+/g, '_');
  return (
    isSuperAdminRole(name) ||
    normalized === ROLES.ADMIN ||
    String(name).trim().toLowerCase() === 'admin'
  );
}

export default ROLES;

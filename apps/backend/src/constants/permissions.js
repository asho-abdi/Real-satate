/**
 * Build a permission string in `resource:action` form.
 * @param {string} resource
 * @param {string} action
 * @returns {string}
 */
export function permission(resource, action) {
  if (!resource || !action) {
    throw new Error('permission(resource, action) requires both arguments');
  }
  return `${String(resource).trim().toLowerCase()}:${String(action).trim().toLowerCase()}`;
}

/**
 * Parse a permission string into resource and action.
 * @param {string} value
 * @returns {{ resource: string, action: string }}
 */
export function parsePermission(value) {
  const [resource, action, ...rest] = String(value).split(':');
  if (!resource || !action || rest.length > 0) {
    throw new Error(`Invalid permission string: ${value}`);
  }
  return { resource, action };
}

/**
 * Flat list of common REMS permissions.
 */
export const PERMISSIONS = Object.freeze({
  USERS_READ: permission('users', 'read'),
  USERS_CREATE: permission('users', 'create'),
  USERS_UPDATE: permission('users', 'update'),
  USERS_DELETE: permission('users', 'delete'),

  ROLES_READ: permission('roles', 'read'),
  ROLES_CREATE: permission('roles', 'create'),
  ROLES_UPDATE: permission('roles', 'update'),
  ROLES_DELETE: permission('roles', 'delete'),

  BUILDINGS_READ: permission('buildings', 'read'),
  BUILDINGS_CREATE: permission('buildings', 'create'),
  BUILDINGS_UPDATE: permission('buildings', 'update'),
  BUILDINGS_DELETE: permission('buildings', 'delete'),

  FLOORS_READ: permission('floors', 'read'),
  FLOORS_CREATE: permission('floors', 'create'),
  FLOORS_UPDATE: permission('floors', 'update'),
  FLOORS_DELETE: permission('floors', 'delete'),

  UNITS_READ: permission('units', 'read'),
  UNITS_CREATE: permission('units', 'create'),
  UNITS_UPDATE: permission('units', 'update'),
  UNITS_DELETE: permission('units', 'delete'),

  UNIT_CATEGORIES_READ: permission('unit-categories', 'read'),
  UNIT_CATEGORIES_CREATE: permission('unit-categories', 'create'),
  UNIT_CATEGORIES_UPDATE: permission('unit-categories', 'update'),
  UNIT_CATEGORIES_DELETE: permission('unit-categories', 'delete'),

  UNIT_TYPES_READ: permission('unit-types', 'read'),
  UNIT_TYPES_CREATE: permission('unit-types', 'create'),
  UNIT_TYPES_UPDATE: permission('unit-types', 'update'),
  UNIT_TYPES_DELETE: permission('unit-types', 'delete'),

  AMENITIES_READ: permission('amenities', 'read'),
  AMENITIES_CREATE: permission('amenities', 'create'),
  AMENITIES_UPDATE: permission('amenities', 'update'),
  AMENITIES_DELETE: permission('amenities', 'delete'),

  RESIDENTIAL_TENANTS_READ: permission('residential-tenants', 'read'),
  RESIDENTIAL_TENANTS_CREATE: permission('residential-tenants', 'create'),
  RESIDENTIAL_TENANTS_UPDATE: permission('residential-tenants', 'update'),
  RESIDENTIAL_TENANTS_DELETE: permission('residential-tenants', 'delete'),

  COMMERCIAL_TENANTS_READ: permission('commercial-tenants', 'read'),
  COMMERCIAL_TENANTS_CREATE: permission('commercial-tenants', 'create'),
  COMMERCIAL_TENANTS_UPDATE: permission('commercial-tenants', 'update'),
  COMMERCIAL_TENANTS_DELETE: permission('commercial-tenants', 'delete'),

  GUESTS_READ: permission('guests', 'read'),
  GUESTS_CREATE: permission('guests', 'create'),
  GUESTS_UPDATE: permission('guests', 'update'),
  GUESTS_DELETE: permission('guests', 'delete'),

  RESERVATIONS_READ: permission('reservations', 'read'),
  RESERVATIONS_CREATE: permission('reservations', 'create'),
  RESERVATIONS_UPDATE: permission('reservations', 'update'),
  RESERVATIONS_DELETE: permission('reservations', 'delete'),

  LEASES_READ: permission('leases', 'read'),
  LEASES_CREATE: permission('leases', 'create'),
  LEASES_UPDATE: permission('leases', 'update'),
  LEASES_DELETE: permission('leases', 'delete'),

  PAYMENTS_READ: permission('payments', 'read'),
  PAYMENTS_CREATE: permission('payments', 'create'),
  PAYMENTS_UPDATE: permission('payments', 'update'),
  PAYMENTS_DELETE: permission('payments', 'delete'),

  INVOICES_READ: permission('invoices', 'read'),
  INVOICES_CREATE: permission('invoices', 'create'),
  INVOICES_UPDATE: permission('invoices', 'update'),
  INVOICES_DELETE: permission('invoices', 'delete'),

  UTILITY_CHARGES_READ: permission('utility-charges', 'read'),
  UTILITY_CHARGES_CREATE: permission('utility-charges', 'create'),
  UTILITY_CHARGES_UPDATE: permission('utility-charges', 'update'),
  UTILITY_CHARGES_DELETE: permission('utility-charges', 'delete'),

  SERVICE_CHARGES_READ: permission('service-charges', 'read'),
  SERVICE_CHARGES_CREATE: permission('service-charges', 'create'),
  SERVICE_CHARGES_UPDATE: permission('service-charges', 'update'),
  SERVICE_CHARGES_DELETE: permission('service-charges', 'delete'),

  MAINTENANCE_READ: permission('maintenance', 'read'),
  MAINTENANCE_CREATE: permission('maintenance', 'create'),
  MAINTENANCE_UPDATE: permission('maintenance', 'update'),
  MAINTENANCE_DELETE: permission('maintenance', 'delete'),

  TECHNICIANS_READ: permission('technicians', 'read'),
  TECHNICIANS_CREATE: permission('technicians', 'create'),
  TECHNICIANS_UPDATE: permission('technicians', 'update'),
  TECHNICIANS_DELETE: permission('technicians', 'delete'),

  NOTIFICATIONS_READ: permission('notifications', 'read'),
  NOTIFICATIONS_UPDATE: permission('notifications', 'update'),

  REPORTS_READ: permission('reports', 'read'),
  REPORTS_EXPORT: permission('reports', 'export'),

  SETTINGS_READ: permission('settings', 'read'),
  SETTINGS_UPDATE: permission('settings', 'update'),

  ACTIVITY_LOGS_READ: permission('activity-logs', 'read'),
});

export default { permission, parsePermission, PERMISSIONS };

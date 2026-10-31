/**
 * Page-based access for staff users.
 * Admins ignore this and keep full (`*`) access.
 *
 * Each page key maps to the API permission codes needed to use that page.
 */

export const STAFF_PAGES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Home overview and KPIs' },
  { key: 'today', label: 'Today', description: 'Daily office board' },
  { key: 'buildings', label: 'Buildings', description: 'Property buildings setup' },
  { key: 'units', label: 'Units', description: 'Rooms, shops, availability' },
  { key: 'apartments', label: 'Apartments', description: 'Apartment tenants' },
  { key: 'shops', label: 'Shops', description: 'Shop businesses' },
  { key: 'bookings', label: 'Guest Bookings', description: 'Guest stays and bookings' },
  { key: 'expenses', label: 'Money Movements', description: 'Expenses and cash movements' },
  { key: 'payments', label: 'Payments', description: 'Collect and record payments' },
  { key: 'outstanding', label: 'Outstanding', description: 'Unpaid balances due' },
  { key: 'reports', label: 'Reports', description: 'Reports and exports' },
  { key: 'maintenance', label: 'Maintenance', description: 'Repairs and maintenance' },
  { key: 'work-progress', label: 'Working Progress', description: 'Construction / work tracking' },
  { key: 'settings', label: 'Settings', description: 'Company settings' },
];

/** Default pages for a new building staff user */
export const DEFAULT_STAFF_PAGES = STAFF_PAGES.map((p) => p.key).filter(
  (k) => k !== 'settings',
);

export const PAGE_PERMISSIONS = Object.freeze({
  dashboard: ['reports:read'],
  today: ['bookings:read', 'units:read', 'payments:read', 'buildings:read'],
  buildings: [
    'buildings:read',
    'buildings:create',
    'buildings:update',
    'buildings:delete',
    'floors:read',
    'floors:create',
    'floors:update',
    'floors:delete',
  ],
  units: ['units:read', 'units:create', 'units:update', 'units:delete', 'buildings:read', 'floors:read'],
  apartments: [
    'tenants:read',
    'tenants:create',
    'tenants:update',
    'tenants:delete',
    'units:read',
    'buildings:read',
  ],
  shops: [
    'businesses:read',
    'businesses:create',
    'businesses:update',
    'businesses:delete',
    'units:read',
    'buildings:read',
  ],
  bookings: [
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:delete',
    'units:read',
    'buildings:read',
  ],
  expenses: ['expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete', 'buildings:read'],
  payments: [
    'payments:read',
    'payments:create',
    'payments:update',
    'payments:delete',
    'tenants:read',
    'businesses:read',
    'buildings:read',
  ],
  outstanding: ['payments:read', 'payments:update', 'tenants:read', 'businesses:read', 'buildings:read'],
  reports: ['reports:read', 'reports:export', 'buildings:read'],
  maintenance: [
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'maintenance:delete',
    'buildings:read',
    'units:read',
  ],
  'work-progress': [
    'work:read',
    'work:create',
    'work:update',
    'work:delete',
    'buildings:read',
    'units:read',
  ],
  settings: ['settings:read', 'settings:update'],
  users: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'roles:read',
    'roles:update',
  ],
});

/** Route path → page key (for nav filtering) */
export const ROUTE_PAGE_KEY = Object.freeze({
  '/dashboard': 'dashboard',
  '/today': 'today',
  '/buildings': 'buildings',
  '/availability': 'units',
  '/apartments': 'apartments',
  '/shops': 'shops',
  '/bookings': 'bookings',
  '/expenses': 'expenses',
  '/payments': 'payments',
  '/outstanding': 'outstanding',
  '/reports': 'reports',
  '/maintenance': 'maintenance',
  '/work-progress': 'work-progress',
  '/settings': 'settings',
  '/users': 'users',
});

export function normalizeAllowedPages(value) {
  if (!Array.isArray(value)) return [];
  const known = new Set(Object.keys(PAGE_PERMISSIONS));
  return [...new Set(value.map(String).filter((k) => known.has(k)))];
}

export function permissionsFromPages(pages) {
  const codes = new Set();
  for (const key of normalizeAllowedPages(pages)) {
    for (const code of PAGE_PERMISSIONS[key] || []) codes.add(code);
  }
  return [...codes];
}

export default {
  STAFF_PAGES,
  DEFAULT_STAFF_PAGES,
  PAGE_PERMISSIONS,
  ROUTE_PAGE_KEY,
  normalizeAllowedPages,
  permissionsFromPages,
};

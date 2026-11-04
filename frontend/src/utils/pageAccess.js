/** Mirrors backend page access catalog for the Users & Access UI and nav filtering. */

export const STAFF_PAGES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Home overview and KPIs' },
  { key: 'today', label: 'Today', description: 'Daily office board' },
  { key: 'buildings', label: 'Buildings', description: 'Property buildings setup' },
  { key: 'units', label: 'Availability', description: 'Rooms, shops, availability' },
  { key: 'apartments', label: 'Apartments', description: 'Apartment tenants' },
  { key: 'shops', label: 'Shops', description: 'Shop businesses and sales' },
  { key: 'offices', label: 'Offices', description: 'Office businesses and sales' },
  { key: 'bookings', label: 'Guest Bookings', description: 'Guest stays and bookings' },
  { key: 'expenses', label: 'Money Movements', description: 'Expenses and cash movements' },
  { key: 'payments', label: 'Payments', description: 'Collect and record payments' },
  { key: 'outstanding', label: 'Outstanding', description: 'Unpaid balances due' },
  { key: 'reports', label: 'Reports', description: 'Reports and exports' },
  { key: 'maintenance', label: 'Maintenance', description: 'Repairs and maintenance' },
  { key: 'work-progress', label: 'Working Progress', description: 'Construction / work tracking' },
  { key: 'settings', label: 'Settings', description: 'Company settings' },
];

export const DEFAULT_STAFF_PAGES = STAFF_PAGES.map((p) => p.key).filter((k) => k !== 'settings');

export const ROUTE_PAGE_KEY = {
  '/dashboard': 'dashboard',
  '/today': 'today',
  '/buildings': 'buildings',
  '/availability': 'units',
  '/apartments': 'apartments',
  '/shops': 'shops',
  '/offices': 'offices',
  '/bookings': 'bookings',
  '/expenses': 'expenses',
  '/payments': 'payments',
  '/outstanding': 'outstanding',
  '/reports': 'reports',
  '/maintenance': 'maintenance',
  '/work-progress': 'work-progress',
  '/settings': 'settings',
  '/users': 'users',
};

export function userCanAccessRoute(user, to) {
  if (!user) return false;
  if (user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (to === '/users') return false;
  if (to === '/profile' || to === '/change-password') return true;

  const pageKey = ROUTE_PAGE_KEY[to];
  if (!pageKey) return true;

  const pages = Array.isArray(user.allowedPages) ? user.allowedPages : null;
  // No page list yet (legacy session): fall back to permission codes if present
  if (!pages || pages.length === 0) {
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes('*')) return true;
    // If permissions are loaded, derive access from them; otherwise hide until /me refreshes
    if (!perms.length) return false;
    // Map rough permission presence for common pages
    const need = {
      dashboard: ['reports:read'],
      today: ['bookings:read'],
      buildings: ['buildings:read'],
      units: ['units:read'],
      apartments: ['tenants:read'],
      shops: ['businesses:read'],
      offices: ['businesses:read'],
      bookings: ['bookings:read'],
      expenses: ['expenses:read'],
      payments: ['payments:read'],
      outstanding: ['payments:read'],
      reports: ['reports:read'],
      maintenance: ['maintenance:read'],
      'work-progress': ['work:read'],
      settings: ['settings:read'],
    }[pageKey];
    if (!need) return true;
    return need.some((p) => perms.includes(p));
  }
  // Legacy: users granted "shops" before offices split also get offices access
  if (pageKey === 'offices' && pages.includes('shops') && !pages.includes('offices')) {
    return true;
  }
  return pages.includes(pageKey);
}

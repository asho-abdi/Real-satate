import { NAV_SECTIONS } from '../../utils/constants.js';

/** Short labels for topbar dropdown parents. */
export const TOPBAR_SECTION_LABELS = {
  Home: 'Home',
  Properties: 'Properties',
  'Rentals & Sales': 'Rentals',
  Finance: 'Finance',
  Operations: 'Operations',
  Account: 'Account',
};

export function filterNavSections(user) {
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN');
  return NAV_SECTIONS.map((section) => ({
    ...section,
    topLabel: TOPBAR_SECTION_LABELS[section.title] || section.title,
    items: section.items.filter((item) => {
      if (item.to === '/users') return isAdmin;
      return true;
    }),
  })).filter((section) => section.items.length > 0);
}

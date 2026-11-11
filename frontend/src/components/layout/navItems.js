import {
  MdAnalytics,
  MdApartment,
  MdBuild,
  MdBusiness,
  MdBusinessCenter,
  MdConstruction,
  MdDashboard,
  MdDoorFront,
  MdHotel,
  MdManageAccounts,
  MdPayments,
  MdSettings,
  MdStorefront,
  MdSwapHoriz,
  MdToday,
  MdWarningAmber,
  MdCircle,
} from 'react-icons/md';
import { NAV_SECTIONS } from '../../utils/constants.js';
import { userCanAccessRoute } from '../../utils/pageAccess.js';

/** Short labels for topbar dropdown parents. */
export const TOPBAR_SECTION_LABELS = {
  Overview: 'Overview',
  Portfolio: 'Portfolio',
  'Business Units': 'Business Units',
  Finance: 'Finance',
  Operations: 'Operations',
  System: 'System',
};

export function filterNavSections(user) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    topLabel: TOPBAR_SECTION_LABELS[section.title] || section.title,
    items: section.items.filter((item) => userCanAccessRoute(user, item.to)),
  })).filter((section) => section.items.length > 0);
}

const NAV_ICONS = {
  MdAnalytics,
  MdApartment,
  MdBuild,
  MdBusiness,
  MdBusinessCenter,
  MdConstruction,
  MdDashboard,
  MdDoorFront,
  MdHotel,
  MdManageAccounts,
  MdPayments,
  MdSettings,
  MdStorefront,
  MdSwapHoriz,
  MdToday,
  MdWarningAmber,
  MdCircle,
};

/** Resolve a nav icon name from NAV_SECTIONS without pulling the whole icon set into the bundle. */
export function resolveNavIcon(name) {
  return NAV_ICONS[name] || MdCircle;
}

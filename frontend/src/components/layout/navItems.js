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
  MdAccountBalanceWallet,
  MdDescription,
  MdCircle,
} from 'react-icons/md';
import { NAV_SECTIONS } from '../../utils/constants.js';
import { userCanAccessRoute } from '../../utils/pageAccess.js';

/** Short labels for topbar dropdown parents. */
export const TOPBAR_SECTION_LABELS = {
  Overview: 'Overview',
  Portfolio: 'Portfolio',
  'Commercial Spaces': 'Commercial Spaces',
  Finance: 'Finance',
  Operations: 'Operations',
  System: 'System',
};

/**
 * @param {object} user
 * @param {{ hasFeature?: (type: string) => boolean, shortLabel?: string } | null} [workspace]
 */
export function filterNavSections(user, workspace = null) {
  const hasFeature = workspace?.hasFeature;
  const short = workspace?.shortLabel || '';

  return NAV_SECTIONS.map((section) => ({
    ...section,
    topLabel: TOPBAR_SECTION_LABELS[section.title] || section.title,
    items: section.items
      .filter((item) => userCanAccessRoute(user, item.to))
      .filter((item) => {
        if (!item.feature) return true;
        if (!hasFeature) return true; // no workspace yet — show until loaded
        return hasFeature(item.feature);
      })
      .map((item) => {
        if (!item.feature || !short) return item;
        if (item.to === '/apartments') {
          return { ...item, label: `Apartments · ${short}` };
        }
        if (item.to === '/bookings') {
          return { ...item, label: `Guest Bookings · ${short}` };
        }
        if (item.to === '/commercial-spaces') {
          return { ...item, label: `Commercial · ${short}` };
        }
        if (item.to === '/availability') {
          return { ...item, label: `Availability · ${short}` };
        }
        return item;
      }),
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
  MdAccountBalanceWallet,
  MdDescription,
  MdCircle,
};

/** Resolve a nav icon name from NAV_SECTIONS without pulling the whole icon set into the bundle. */
export function resolveNavIcon(name) {
  return NAV_ICONS[name] || MdCircle;
}

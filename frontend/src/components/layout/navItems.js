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

export function filterNavSections(user) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    topLabel: TOPBAR_SECTION_LABELS[section.title] || section.title,
    items: section.items.filter((item) => userCanAccessRoute(user, item.to)),
  })).filter((section) => section.items.length > 0);
}

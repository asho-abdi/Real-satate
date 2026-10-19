/** Map API enums ↔ friendly UI labels for the simple rental app. */

export const UNIT_TYPE_LABELS = {
  COMMERCIAL_SHOP: 'Commercial Shop',
  APARTMENT: 'Apartment',
  STUDIO_APARTMENT: 'Studio Apartment',
  ONE_BEDROOM: '1 Bedroom',
  TWO_BEDROOM: '2 Bedroom',
  THREE_BEDROOM: '3 Bedroom',
};

export const UNIT_TYPE_VALUES = {
  'Commercial Shop': 'COMMERCIAL_SHOP',
  Apartment: 'APARTMENT',
  'Studio Apartment': 'STUDIO_APARTMENT',
  '1 Bedroom': 'ONE_BEDROOM',
  '2 Bedroom': 'TWO_BEDROOM',
  '3 Bedroom': 'THREE_BEDROOM',
};

export const USAGE_LABELS = {
  SHOP: 'shop',
  APARTMENT: 'apartment',
  GUEST: 'guest',
};

export const STATUS_LABELS = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Rented',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
  MAINTENANCE: 'Maintenance',
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  ACTIVE: 'Active',
  ENDED: 'Ended',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'CheckedIn',
  CHECKED_OUT: 'CheckedOut',
  CANCELLED: 'Cancelled',
  FOR_SALE: 'For Sale',
  FOR_RENT: 'For Rent',
  BOTH: 'Sale & Rent',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  PLANNED: 'Planned',
};

export const STATUS_VALUES = {
  Available: 'AVAILABLE',
  Occupied: 'OCCUPIED',
  Rented: 'OCCUPIED',
  Reserved: 'RESERVED',
  Sold: 'SOLD',
  Maintenance: 'MAINTENANCE',
  Paid: 'PAID',
  Unpaid: 'UNPAID',
  Partial: 'PARTIAL',
  Active: 'ACTIVE',
  Ended: 'ENDED',
  Confirmed: 'CONFIRMED',
  CheckedIn: 'CHECKED_IN',
  CheckedOut: 'CHECKED_OUT',
  Cancelled: 'CANCELLED',
  'For Sale': 'FOR_SALE',
  'For Rent': 'FOR_RENT',
  Both: 'BOTH',
  'Sale & Rent': 'BOTH',
  Daily: 'DAILY',
  Weekly: 'WEEKLY',
  Monthly: 'MONTHLY',
};

export const METHOD_LABELS = {
  CASH: 'Cash',
  E_BESA: 'E-besa',
};

export const METHOD_VALUES = {
  Cash: 'CASH',
  'E-besa': 'E_BESA',
};

export const GENDER_VALUES = {
  Male: 'MALE',
  Female: 'FEMALE',
  Other: 'OTHER',
};

export const GENDER_LABELS = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export function labelUnitType(v) {
  return UNIT_TYPE_LABELS[v] || v || '—';
}

export function labelStatus(v) {
  return STATUS_LABELS[v] || v || '—';
}

export function labelMethod(v) {
  return METHOD_LABELS[v] || v || '—';
}

export function labelGender(v) {
  return GENDER_LABELS[v] || v || '—';
}

export function labelUsage(v) {
  return USAGE_LABELS[v] || String(v || '').toLowerCase();
}

export function isoDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/** Default usage when unit type changes — admin can override in the form. */
export function defaultUsageForUnitType(unitTypeLabel) {
  if (unitTypeLabel === 'Commercial Shop') return 'shop';
  return 'apartment';
}

/** Keep Guest / Airbnb (and apartment) when changing bedroom type; only shop forces shop. */
export function usageAfterUnitTypeChange(unitTypeLabel, currentUsage) {
  const usage = String(currentUsage || '').toLowerCase();
  if (unitTypeLabel === 'Commercial Shop') return 'shop';
  if (usage === 'shop') return 'apartment';
  if (usage === 'guest' || usage === 'apartment') return usage;
  return defaultUsageForUnitType(unitTypeLabel);
}

export function usageToApi(usageLabel) {
  const map = { shop: 'SHOP', apartment: 'APARTMENT', guest: 'GUEST' };
  return map[String(usageLabel || '').toLowerCase()] || 'APARTMENT';
}

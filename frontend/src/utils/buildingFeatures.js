/** Mirrors backend/src/constants/buildingFeatures.js */
export const BUILDING_PROPERTY_TYPES = Object.freeze({
  APARTMENTS: 'APARTMENTS',
  GUEST_BOOKINGS: 'GUEST_BOOKINGS',
  COMMERCIAL: 'COMMERCIAL',
});

export const ALL_BUILDING_PROPERTY_TYPES = Object.freeze([
  BUILDING_PROPERTY_TYPES.APARTMENTS,
  BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS,
  BUILDING_PROPERTY_TYPES.COMMERCIAL,
]);

export const BUILDING_PROPERTY_TYPE_OPTIONS = [
  { value: BUILDING_PROPERTY_TYPES.APARTMENTS, label: 'Apartments' },
  { value: BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS, label: 'Guest Bookings' },
  { value: BUILDING_PROPERTY_TYPES.COMMERCIAL, label: 'Commercial Spaces' },
];

const ALLOWED = new Set(ALL_BUILDING_PROPERTY_TYPES);

export function normalizePropertyTypes(input, fallback = ALL_BUILDING_PROPERTY_TYPES) {
  const raw = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[,|]/)
      : [];
  const cleaned = [
    ...new Set(
      raw
        .map((v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '_'))
        .filter((v) => ALLOWED.has(v)),
    ),
  ];
  if (!cleaned.length) return [...fallback];
  return ALL_BUILDING_PROPERTY_TYPES.filter((t) => cleaned.includes(t));
}

export function buildingHasFeature(building, type) {
  if (!building) return false;
  return normalizePropertyTypes(building.propertyTypes, []).includes(
    String(type).toUpperCase(),
  );
}

export function shortBuildingLabel(building) {
  if (!building) return '';
  const name = String(building.name || building.code || '').trim();
  if (!name) return '';
  // Prefer a short token (first word / code)
  if (building.code && String(building.code).length <= 12) return String(building.code);
  const first = name.split(/\s+/)[0];
  return first.length <= 16 ? first : `${first.slice(0, 14)}…`;
}

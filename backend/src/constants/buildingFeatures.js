/** Supported portfolio features per building (stored on Building.propertyTypes). */
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

const ALLOWED = new Set(ALL_BUILDING_PROPERTY_TYPES);

/** Default for new buildings — full mixed-use until configured. */
export const DEFAULT_BUILDING_PROPERTY_TYPES = [...ALL_BUILDING_PROPERTY_TYPES];

/**
 * Normalize client/DB values to a unique ordered list of known types.
 * @param {unknown} input
 * @param {string[]} [fallback]
 */
export function normalizePropertyTypes(input, fallback = DEFAULT_BUILDING_PROPERTY_TYPES) {
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

export function buildingHasPropertyType(building, type) {
  const types = normalizePropertyTypes(building?.propertyTypes, []);
  return types.includes(String(type).toUpperCase());
}

/** Heuristic used only for one-time migration backfill. */
export function inferPropertyTypesFromName(name = '', code = '') {
  const hay = `${name} ${code}`.toLowerCase();
  if (hay.includes('siham') || hay.includes('sihaam')) {
    return [BUILDING_PROPERTY_TYPES.APARTMENTS, BUILDING_PROPERTY_TYPES.COMMERCIAL];
  }
  // Guest house / Hodo / default mixed-use
  return [...DEFAULT_BUILDING_PROPERTY_TYPES];
}

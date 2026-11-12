import { AppError } from './AppError.js';

/** Normalize commercial type / usage for Commercial Spaces. */
export function normalizeCommercialType(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError('commercialType is required (SHOP or OFFICE)', 400);
    return null;
  }
  const key = String(value).trim().toUpperCase();
  if (key === 'SHOP' || key === 'COMMERCIAL_SHOP' || key === 'SHOP') return 'SHOP';
  if (key === 'OFFICE' || key === 'COMMERCIAL_OFFICE') return 'OFFICE';
  throw new AppError('commercialType must be SHOP or OFFICE', 400);
}

/** Derive commercialType from unit usage (or explicit commercialType). */
export function commercialTypeFromUsage(usage, commercialType) {
  if (commercialType) return normalizeCommercialType(commercialType);
  const u = String(usage || '').toUpperCase();
  if (u === 'SHOP' || u === 'OFFICE') return u;
  return null;
}

/** Keep usage + commercialType consistent for commercial units. */
export function resolveCommercialFields({ usage, commercialType, unitType }) {
  let nextUsage = usage != null ? String(usage).toUpperCase() : undefined;
  let nextCommercial = commercialType != null ? normalizeCommercialType(commercialType) : undefined;

  if (nextCommercial && !nextUsage) {
    nextUsage = nextCommercial;
  }
  if (nextUsage === 'SHOP' || nextUsage === 'OFFICE') {
    nextCommercial = nextUsage;
  } else if (nextUsage) {
    nextCommercial = null;
  }

  let nextUnitType = unitType != null ? String(unitType).toUpperCase() : undefined;
  if (nextCommercial === 'SHOP' && (!nextUnitType || nextUnitType === 'COMMERCIAL_OFFICE')) {
    nextUnitType = nextUnitType || 'COMMERCIAL_SHOP';
  }
  if (nextCommercial === 'OFFICE' && (!nextUnitType || nextUnitType === 'COMMERCIAL_SHOP')) {
    nextUnitType = nextUnitType || 'COMMERCIAL_OFFICE';
  }

  return {
    usage: nextUsage,
    commercialType: nextCommercial === undefined ? undefined : nextCommercial,
    unitType: nextUnitType,
  };
}

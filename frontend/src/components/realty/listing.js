import { formatCurrency } from '../../utils/format.js';

export const CATEGORY_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'apartment', label: 'Apartments' },
  { value: 'guest', label: 'Guest / Airbnb' },
  { value: 'commercial-sale', label: 'Purchased commercial' },
  { value: 'commercial-rent', label: 'Rental shops' },
  { value: 'building', label: 'Buildings' },
];

export const STATUS_FILTERS = [
  { value: '', label: 'Any availability' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

export function comparablePrice(item) {
  if (!item) return 0;
  if (item.usage === 'GUEST') return Number(item.dailyRate || item.weeklyRent || item.monthlyRent || 0);
  if (item.offer === 'purchase') return Number(item.salePrice || 0);
  return Number(item.monthlyRent || item.salePrice || 0);
}

export function priceLabel(item) {
  if (!item) return '';
  if (item.usage === 'GUEST') {
    const bits = [];
    if (item.dailyRate) bits.push(`${formatCurrency(item.dailyRate)} / day`);
    if (item.weeklyRent) bits.push(`${formatCurrency(item.weeklyRent)} / week`);
    if (item.monthlyRent) bits.push(`${formatCurrency(item.monthlyRent)} / month`);
    return bits.join(' · ') || 'Rate on request';
  }
  if (item.offer === 'purchase') {
    return item.salePrice ? formatCurrency(item.salePrice) : 'Price on request';
  }
  if (item.offer === 'both') {
    const sale = item.salePrice ? formatCurrency(item.salePrice) : null;
    const rent = item.monthlyRent ? `${formatCurrency(item.monthlyRent)} / month` : null;
    return [sale, rent].filter(Boolean).join(' · ') || 'Price on request';
  }
  return item.monthlyRent ? `${formatCurrency(item.monthlyRent)} / month` : 'Price on request';
}

export function matchesType(item, type) {
  if (!type || type === 'building') return true;
  if (type === 'commercial-sale') return item.category === 'commercial-sale' || item.category === 'commercial-both';
  if (type === 'commercial-rent') return item.category === 'commercial-rent' || item.category === 'commercial-both';
  return item.category === type;
}

export function filterListings(listings, filters = {}) {
  const q = String(filters.q || '').trim().toLowerCase();
  const min = filters.minPrice === '' || filters.minPrice == null ? null : Number(filters.minPrice);
  const max = filters.maxPrice === '' || filters.maxPrice == null ? null : Number(filters.maxPrice);
  return (listings || []).filter((item) => {
    if (!matchesType(item, filters.type)) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.location) {
      const loc = String(filters.location).toLowerCase();
      const hay = `${item.buildingName || ''} ${item.address || ''}`.toLowerCase();
      if (!hay.includes(loc)) return false;
    }
    if (q) {
      const hay = `${item.name} ${item.roomNumber} ${item.buildingName} ${item.address} ${item.typeLabel} ${item.description || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const price = comparablePrice(item);
    if (min != null && !Number.isNaN(min) && price < min) return false;
    if (max != null && !Number.isNaN(max) && price > max) return false;
    return true;
  });
}

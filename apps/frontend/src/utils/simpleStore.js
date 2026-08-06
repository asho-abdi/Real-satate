import { simpleBookings, simpleMonthlyPayments } from '../services/simpleData.js';

const BOOKINGS_KEY = 'simple-bookings';
const PAYMENTS_KEY = 'simple-monthly-payments';

export function loadBookings() {
  try {
    const raw = sessionStorage.getItem(BOOKINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const seed = [...simpleBookings];
  sessionStorage.setItem(BOOKINGS_KEY, JSON.stringify(seed));
  return seed;
}

export function saveBookings(list) {
  sessionStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
}

export function loadPayments() {
  try {
    const raw = sessionStorage.getItem(PAYMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const seed = [...simpleMonthlyPayments];
  sessionStorage.setItem(PAYMENTS_KEY, JSON.stringify(seed));
  return seed;
}

export function savePayments(list) {
  sessionStorage.setItem(PAYMENTS_KEY, JSON.stringify(list));
}

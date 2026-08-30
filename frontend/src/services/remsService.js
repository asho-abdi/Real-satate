/**
 * REMS in-memory service helpers.
 * Returns { data } after simulateDelay(300). Keep authService untouched.
 */
import {
  remDashboardStats,
  remRevenueSeries,
  remOccupancySeries,
  remRecentActivities,
  remUpcomingReservations,
  remOpenMaintenance,
  remBuildings,
  remFloors,
  remUnits,
  remUnitCategories,
  remAmenities,
  remResidentialTenants,
  remCommercialTenants,
  remGuests,
  remReservations,
  remCleaningBoard,
  remLeases,
  remPayments,
  remInvoices,
  remOutstanding,
  remMaintenance,
  remUsers,
  remRoles,
  remActivityLogs,
  remNotifications,
} from './remsData.js';

function clone(data) {
  return structuredClone(data);
}

export function simulateDelay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listFrom(source) {
  return async () => {
    await simulateDelay(300);
    return { data: clone(source) };
  };
}

function getByIdFrom(source, label = 'item') {
  return async (id) => {
    await simulateDelay(300);
    const item = source.find((row) => row.id === id);
    if (!item) {
      const err = new Error(`${label} not found`);
      err.status = 404;
      throw err;
    }
    return clone(item);
  };
}

/* ── Dashboard ───────────────────────────────────────────────────── */

export async function getRemDashboardStats() {
  await simulateDelay(300);
  return { data: clone(remDashboardStats) };
}

export async function getRemRevenueSeries() {
  await simulateDelay(300);
  return { data: clone(remRevenueSeries) };
}

export async function getRemOccupancySeries() {
  await simulateDelay(300);
  return { data: clone(remOccupancySeries) };
}

export async function getRemRecentActivities() {
  await simulateDelay(300);
  return { data: clone(remRecentActivities) };
}

export async function getRemUpcomingReservations() {
  await simulateDelay(300);
  return { data: clone(remUpcomingReservations) };
}

export async function getRemOpenMaintenance() {
  await simulateDelay(300);
  return { data: clone(remOpenMaintenance) };
}

/* ── Buildings / Floors / Units ──────────────────────────────────── */

export const listRemBuildings = listFrom(remBuildings);
export const getRemBuilding = getByIdFrom(remBuildings, 'building');

export const listRemFloors = listFrom(remFloors);
export const getRemFloor = getByIdFrom(remFloors, 'floor');

export const listRemUnits = listFrom(remUnits);
export const getRemUnit = getByIdFrom(remUnits, 'unit');

export const listRemUnitCategories = listFrom(remUnitCategories);
export const getRemUnitCategory = getByIdFrom(remUnitCategories, 'unit category');

export const listRemAmenities = listFrom(remAmenities);
export const getRemAmenity = getByIdFrom(remAmenities, 'amenity');

/* ── Tenants / Guests ────────────────────────────────────────────── */

export const listRemResidentialTenants = listFrom(remResidentialTenants);
export const getRemResidentialTenant = getByIdFrom(remResidentialTenants, 'residential tenant');

export const listRemCommercialTenants = listFrom(remCommercialTenants);
export const getRemCommercialTenant = getByIdFrom(remCommercialTenants, 'commercial tenant');

export const listRemGuests = listFrom(remGuests);
export const getRemGuest = getByIdFrom(remGuests, 'guest');

/* ── Reservations / Cleaning ─────────────────────────────────────── */

export const listRemReservations = listFrom(remReservations);
export const getRemReservation = getByIdFrom(remReservations, 'reservation');

export const listRemCleaningBoard = listFrom(remCleaningBoard);
export const getRemCleaningBoardItem = getByIdFrom(remCleaningBoard, 'cleaning board item');

/* ── Leases / Payments / Invoices ────────────────────────────────── */

export const listRemLeases = listFrom(remLeases);
export const getRemLease = getByIdFrom(remLeases, 'lease');

export const listRemPayments = listFrom(remPayments);
export const getRemPayment = getByIdFrom(remPayments, 'payment');

export const listRemInvoices = listFrom(remInvoices);
export const getRemInvoice = getByIdFrom(remInvoices, 'invoice');

export const listRemOutstanding = listFrom(remOutstanding);
export const getRemOutstanding = getByIdFrom(remOutstanding, 'outstanding item');

/* ── Maintenance ─────────────────────────────────────────────────── */

export const listRemMaintenance = listFrom(remMaintenance);
export const getRemMaintenance = getByIdFrom(remMaintenance, 'maintenance ticket');

/* ── Users / Roles / Logs / Notifications ────────────────────────── */

export const listRemUsers = listFrom(remUsers);
export const getRemUser = getByIdFrom(remUsers, 'user');

export const listRemRoles = listFrom(remRoles);
export const getRemRole = getByIdFrom(remRoles, 'role');

export const listRemActivityLogs = listFrom(remActivityLogs);
export const getRemActivityLog = getByIdFrom(remActivityLogs, 'activity log');

export const listRemNotifications = listFrom(remNotifications);
export const getRemNotification = getByIdFrom(remNotifications, 'notification');

export default {
  simulateDelay,
  getRemDashboardStats,
  getRemRevenueSeries,
  getRemOccupancySeries,
  getRemRecentActivities,
  getRemUpcomingReservations,
  getRemOpenMaintenance,
  listRemBuildings,
  getRemBuilding,
  listRemFloors,
  getRemFloor,
  listRemUnits,
  getRemUnit,
  listRemUnitCategories,
  getRemUnitCategory,
  listRemAmenities,
  getRemAmenity,
  listRemResidentialTenants,
  getRemResidentialTenant,
  listRemCommercialTenants,
  getRemCommercialTenant,
  listRemGuests,
  getRemGuest,
  listRemReservations,
  getRemReservation,
  listRemCleaningBoard,
  getRemCleaningBoardItem,
  listRemLeases,
  getRemLease,
  listRemPayments,
  getRemPayment,
  listRemInvoices,
  getRemInvoice,
  listRemOutstanding,
  getRemOutstanding,
  listRemMaintenance,
  getRemMaintenance,
  listRemUsers,
  getRemUser,
  listRemRoles,
  getRemRole,
  listRemActivityLogs,
  getRemActivityLog,
  listRemNotifications,
  getRemNotification,
};

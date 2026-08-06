import api from './api.js';
import {
  GENDER_VALUES,
  METHOD_VALUES,
  STATUS_VALUES,
  UNIT_TYPE_VALUES,
  isoDate,
  labelGender,
  labelMethod,
  labelStatus,
  labelUnitType,
  labelUsage,
} from '../utils/labels.js';

function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

async function get(path, params) {
  return unwrap(await api.get(path, { params }));
}

async function post(path, data) {
  return unwrap(await api.post(path, data));
}

async function patch(path, data) {
  return unwrap(await api.patch(path, data));
}

async function del(path) {
  return unwrap(await api.delete(path));
}

function mapUnit(u) {
  if (!u) return u;
  return {
    id: u.id,
    buildingId: u.buildingId,
    building: u.building?.name || u.building || '',
    buildingCode: u.building?.code,
    floorId: u.floorId,
    floor: u.floor?.name || u.floor || '',
    roomNumber: u.roomNumber,
    unitType: labelUnitType(u.unitType),
    unitTypeRaw: u.unitType,
    usage: labelUsage(u.usage),
    usageRaw: u.usage,
    monthlyRent: Number(u.monthlyRent),
    discount: Number(u.discount) || 0,
    dailyRent: Number(u.dailyRent ?? Number(u.monthlyRent) / 30),
    status: labelStatus(u.status),
    statusRaw: u.status,
  };
}

function mapBooking(b) {
  if (!b) return b;
  return {
    id: b.id,
    code: b.code,
    roomId: b.unitId,
    roomNumber: b.unit?.roomNumber || b.roomNumber,
    building: b.unit?.building?.name || b.building,
    floor: b.unit?.floor?.name || b.floor,
    unitType: labelUnitType(b.unit?.unitType || b.unitType),
    monthlyRent: Number(b.monthlyRent),
    dailyRent: Number(b.dailyRent),
    fullName: b.fullName,
    phone: b.phone,
    idNumber: b.idNumber,
    nationality: b.nationality || '',
    gender: labelGender(b.gender),
    emergencyContact: b.emergencyContact || '',
    checkIn: isoDate(b.checkIn),
    checkOut: isoDate(b.checkOut),
    nights: b.nights,
    discount: Number(b.discount) || 0,
    total: Number(b.totalAmount ?? b.total),
    paymentMethod: labelMethod(b.paymentMethod),
    status: labelStatus(b.status),
  };
}

function mapTenant(t) {
  if (!t) return t;
  return {
    id: t.id,
    fullName: t.fullName,
    phone: t.phone,
    idNumber: t.idNumber,
    nationality: t.nationality || '',
    gender: labelGender(t.gender),
    emergencyContact: t.emergencyContact || '',
    roomId: t.unitId,
    roomNumber: t.unit?.roomNumber,
    building: t.unit?.building?.name,
    monthlyRent: Number(t.monthlyRent),
    discount: Number(t.discount) || 0,
    leaseStart: isoDate(t.leaseStart),
    leaseEnd: isoDate(t.leaseEnd),
    status: labelStatus(t.status),
  };
}

function mapBusiness(b) {
  if (!b) return b;
  return {
    id: b.id,
    businessName: b.businessName,
    contactName: b.contactName,
    phone: b.phone,
    idNumber: b.licenseNumber || '',
    roomId: b.unitId,
    roomNumber: b.unit?.roomNumber,
    building: b.unit?.building?.name,
    monthlyRent: Number(b.monthlyRent),
    discount: Number(b.discount) || 0,
    leaseStart: isoDate(b.leaseStart),
    leaseEnd: isoDate(b.leaseEnd),
    status: labelStatus(b.status),
  };
}

function mapPayment(p) {
  if (!p) return p;
  const isShop = Boolean(p.businessId || p.business);
  const name = isShop
    ? p.business?.businessName || p.name
    : p.tenant?.fullName || p.name;
  const roomNumber =
    p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || p.roomNumber;
  const building =
    p.tenant?.unit?.building?.name ||
    p.business?.unit?.building?.name ||
    p.building;
  return {
    id: p.id,
    tenantType: isShop ? 'shop' : 'apartment',
    tenantId: p.tenantId || null,
    businessId: p.businessId || null,
    name,
    roomNumber,
    building,
    month: p.month,
    amountDue: Number(p.amountDue),
    amountPaid: Number(p.amountPaid),
    status: labelStatus(p.status),
    paymentDate: isoDate(p.paymentDate) || null,
    method: p.method ? labelMethod(p.method) : null,
    notes: p.notes || null,
  };
}

export const rentalApi = {
  getDashboard: () => get('/reports/dashboard'),
  getOccupancy: () => get('/reports/occupancy'),
  getRevenue: (month) => get('/reports/revenue', month ? { month } : undefined),
  getOutstandingReport: () => get('/reports/outstanding'),
  getGuestHistory: () => get('/reports/guests'),
  getTenantHistory: () => get('/reports/tenants'),
  getReportSummary: (params) => get('/reports/summary', params),
  downloadReport: async (params) => {
    const response = await api.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  listBuildings: () => get('/buildings'),
  getBuilding: (id) => get(`/buildings/${id}`),
  createBuilding: (data) => post('/buildings', data),
  updateBuilding: (id, data) => patch(`/buildings/${id}`, data),
  deleteBuilding: (id) => del(`/buildings/${id}`),

  listFloors: (buildingId) => get('/floors', buildingId ? { buildingId } : undefined),
  createFloor: (data) => post('/floors', data),
  updateFloor: (id, data) => patch(`/floors/${id}`, data),
  deleteFloor: (id) => del(`/floors/${id}`),

  listUnits: (params) => get('/units', params).then((rows) => (rows || []).map(mapUnit)),
  createUnit: (data) =>
    post('/units', {
      ...data,
      unitType: UNIT_TYPE_VALUES[data.unitType] || data.unitType,
      usage: String(data.usage || '').toUpperCase(),
      status: STATUS_VALUES[data.status] || data.status || 'AVAILABLE',
    }).then(mapUnit),
  updateUnit: (id, data) =>
    patch(`/units/${id}`, {
      ...data,
      ...(data.unitType !== undefined && {
        unitType: UNIT_TYPE_VALUES[data.unitType] || data.unitType,
      }),
      ...(data.usage !== undefined && { usage: String(data.usage).toUpperCase() }),
      ...(data.status !== undefined && {
        status: STATUS_VALUES[data.status] || data.status,
      }),
    }).then(mapUnit),

  listBookings: (search) =>
    get('/bookings', search ? { search } : undefined).then((rows) =>
      (rows || []).map(mapBooking),
    ),
  createBooking: (payload) =>
    post('/bookings', {
      unitId: payload.unitId || payload.roomId,
      fullName: payload.fullName,
      phone: payload.phone,
      idNumber: payload.idNumber,
      nationality: payload.nationality || null,
      gender: GENDER_VALUES[payload.gender] || payload.gender,
      emergencyContact: payload.emergencyContact || null,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      discount: Number(payload.discount) || 0,
      paymentMethod: METHOD_VALUES[payload.paymentMethod] || payload.paymentMethod,
    }).then(mapBooking),
  checkInBooking: (id) => post(`/bookings/${id}/check-in`).then(mapBooking),
  checkOutBooking: (id) => post(`/bookings/${id}/check-out`).then(mapBooking),
  cancelBooking: (id) => post(`/bookings/${id}/cancel`).then(mapBooking),

  listTenants: () => get('/tenants').then((rows) => (rows || []).map(mapTenant)),
  createTenant: (payload) =>
    post('/tenants', {
      fullName: payload.fullName,
      phone: payload.phone,
      idNumber: payload.idNumber,
      nationality: payload.nationality || null,
      gender: GENDER_VALUES[payload.gender] || payload.gender,
      emergencyContact: payload.emergencyContact || null,
      unitId: payload.unitId || payload.roomId,
      monthlyRent: Number(payload.monthlyRent),
      discount: Number(payload.discount) || 0,
      leaseStart: payload.leaseStart,
    }).then(mapTenant),

  listBusinesses: () => get('/businesses').then((rows) => (rows || []).map(mapBusiness)),
  createBusiness: (payload) =>
    post('/businesses', {
      businessName: payload.businessName,
      contactName: payload.contactName,
      phone: payload.phone,
      licenseNumber: payload.idNumber || payload.licenseNumber || null,
      unitId: payload.unitId || payload.roomId,
      monthlyRent: Number(payload.monthlyRent),
      discount: Number(payload.discount) || 0,
      leaseStart: payload.leaseStart,
    }).then(mapBusiness),

  listPayments: (params) =>
    get('/payments', params).then((rows) => (rows || []).map(mapPayment)),
  createPayment: (payload) =>
    post('/payments', {
      tenantId: payload.tenantId || null,
      businessId: payload.businessId || null,
      month: payload.month,
      amountDue: Number(payload.amountDue),
      amountPaid: Number(payload.amountPaid) || 0,
      status: STATUS_VALUES[payload.status] || payload.status,
      paymentDate: payload.paymentDate || null,
      method: METHOD_VALUES[payload.method] || payload.method,
      notes: payload.notes || null,
    }).then(mapPayment),
  updatePayment: (id, payload) =>
    patch(`/payments/${id}`, {
      ...(payload.amountDue !== undefined && { amountDue: Number(payload.amountDue) }),
      ...(payload.amountPaid !== undefined && { amountPaid: Number(payload.amountPaid) }),
      ...(payload.status !== undefined && {
        status: STATUS_VALUES[payload.status] || payload.status,
      }),
      ...(payload.paymentDate !== undefined && { paymentDate: payload.paymentDate }),
      ...(payload.method !== undefined && {
        method: METHOD_VALUES[payload.method] || payload.method,
      }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
    }).then(mapPayment),
};

export default rentalApi;

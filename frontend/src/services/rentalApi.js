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

/** Upload an identity document; returns { filename, originalName, url }. */
export async function uploadIdentityDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(await api.post('/files/documents', formData));
}

/** Fetch and open a stored identity document in a new tab. */
export async function openIdentityDocument(filename, downloadName) {
  if (!filename) throw new Error('No document');
  const res = await api.get(`/files/documents/${encodeURIComponent(filename)}`, {
    responseType: 'blob',
  });
  const blob = res.data;
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (downloadName) a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Resolve identity fields from an optional pending File (uploads first). */
export async function resolveIdentityAttachment(file, existing = {}) {
  if (file) {
    const uploaded = await uploadIdentityDocument(file);
    return {
      identityDocument: uploaded.filename,
      identityDocumentName: uploaded.originalName || file.name,
    };
  }
  if (existing.clear) {
    return { identityDocument: null, identityDocumentName: null };
  }
  if (existing.identityDocument !== undefined) {
    return {
      identityDocument: existing.identityDocument,
      identityDocumentName: existing.identityDocumentName ?? null,
    };
  }
  return {};
}

function mapUnit(u) {
  if (!u) return u;
  return {
    id: u.id,
    buildingId: u.buildingId,
    building: u.building?.name || u.building || '',
    buildingCode: u.building?.code,
    buildingAddress: u.building?.address || '',
    floorId: u.floorId,
    floor: u.floor?.name || u.floor || '',
    roomNumber: u.roomNumber,
    unitType: labelUnitType(u.unitType),
    unitTypeRaw: u.unitType,
    usage: labelUsage(u.usage),
    usageRaw: u.usage,
    commercialType:
      u.commercialType ||
      (String(u.usage || '').toUpperCase() === 'SHOP' ||
      String(u.usage || '').toUpperCase() === 'OFFICE'
        ? String(u.usage).toUpperCase()
        : null),
    transactionType: u.transactionType || 'FOR_RENT',
    transactionLabel: labelStatus(u.transactionType || 'FOR_RENT'),
    monthlyRent: Number(u.monthlyRent),
    weeklyRent:
      String(u.usage || '').toUpperCase() === 'GUEST' && u.weeklyRent != null
        ? Number(u.weeklyRent)
        : null,
    dailyRate:
      String(u.usage || '').toUpperCase() === 'GUEST' && u.dailyRate != null
        ? Number(u.dailyRate)
        : null,
    salePrice: u.salePrice != null ? Number(u.salePrice) : null,
    discount: Number(u.discount) || 0,
    dailyRent:
      String(u.usage || '').toUpperCase() === 'GUEST' && u.dailyRent != null
        ? Number(u.dailyRent)
        : null,
    areaSqm: u.areaSqm != null ? Number(u.areaSqm) : null,
    roomsCount: u.roomsCount ?? null,
    bathroomsCount: u.bathroomsCount ?? null,
    description: u.description || '',
    notes: u.notes || '',
    images: u.images || [],
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
    email: b.email || '',
    address: b.address || '',
    country: b.country || '',
    nationality: b.nationality || '',
    gender: labelGender(b.gender),
    emergencyContact: b.emergencyContact || '',
    identityDocument: b.identityDocument || null,
    identityDocumentName: b.identityDocumentName || null,
    adultsCount: Number(b.adultsCount ?? 1),
    childrenCount: Number(b.childrenCount ?? 0),
    checkInTime: b.checkInTime || '',
    checkIn: isoDate(b.checkIn),
    checkOut: isoDate(b.checkOut),
    nights: b.nights,
    discount: Number(b.discount) || 0,
    servicesAmount: Number(b.servicesAmount ?? 0),
    taxesAmount: Number(b.taxesAmount ?? 0),
    total: Number(b.totalAmount ?? b.total),
    amountPaid: Number(b.amountPaid ?? 0),
    paymentStatus: labelStatus(b.paymentStatus),
    paymentMethod: labelMethod(b.paymentMethod),
    status: labelStatus(b.status),
    bookingPeriod: b.bookingPeriod || 'DAILY',
    bookingPeriodLabel: labelStatus(b.bookingPeriod || 'DAILY'),
    periodRate: Number(b.periodRate ?? b.dailyRent ?? 0),
    periodQuantity: Number(b.periodQuantity ?? b.nights ?? 1),
    balance: Number(b.balance ?? Math.max(0, Number(b.totalAmount ?? b.total) - Number(b.amountPaid ?? 0))),
    notes: b.notes || '',
    payments: (b.payments || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: labelMethod(p.method),
      paymentDate: isoDate(p.paymentDate),
      reference: p.reference || '',
      comment: p.comment || '',
      recordedByName: p.recordedByName || '',
    })),
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
    identityDocument: t.identityDocument || null,
    identityDocumentName: t.identityDocumentName || null,
    roomId: t.unitId,
    unitId: t.unitId,
    roomNumber: t.unit?.roomNumber,
    buildingId: t.unit?.building?.id,
    floorId: t.unit?.floor?.id,
    building: t.unit?.building?.name,
    floor: t.unit?.floor?.name,
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
    identityDocument: b.identityDocument || null,
    identityDocumentName: b.identityDocumentName || null,
    roomId: b.unitId,
    unitId: b.unitId,
    roomNumber: b.unit?.roomNumber,
    usage: labelUsage(b.unit?.usage),
    usageRaw: b.unit?.usage || null,
    commercialType:
      b.commercialType ||
      b.unit?.commercialType ||
      (b.unit?.usage === 'SHOP' || b.unit?.usage === 'OFFICE' ? b.unit.usage : null),
    buildingId: b.unit?.building?.id,
    floorId: b.unit?.floor?.id,
    building: b.unit?.building?.name,
    floor: b.unit?.floor?.name,
    monthlyRent: Number(b.monthlyRent),
    discount: Number(b.discount) || 0,
    leaseStart: isoDate(b.leaseStart),
    leaseEnd: isoDate(b.leaseEnd),
    status: labelStatus(b.status),
  };
}

function mapPayment(p) {
  if (!p) return p;
  const isBusiness = Boolean(p.businessId || p.business);
  const unitUsage = String(p.business?.unit?.usage || '').toUpperCase();
  const tenantType = isBusiness
    ? unitUsage === 'OFFICE'
      ? 'office'
      : 'shop'
    : 'apartment';
  const name = isBusiness
    ? p.business?.businessName || p.name
    : p.tenant?.fullName || p.name;
  const roomNumber =
    p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || p.roomNumber;
  const building =
    p.tenant?.unit?.building?.name ||
    p.business?.unit?.building?.name ||
    p.building;
  const floor =
    p.tenant?.unit?.floor?.name ||
    p.business?.unit?.floor?.name ||
    p.floor ||
    null;
  return {
    id: p.id,
    tenantType,
    tenantId: p.tenantId || null,
    businessId: p.businessId || null,
    name,
    roomNumber,
    building,
    floor,
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
  getTodayBoard: (date) => get('/today', date ? { date } : undefined),
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

  search: async (q) => {
    const data = await get('/search', { q });
    return data?.results || [];
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
  deleteUnit: (id) => del(`/units/${id}`),

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
      email: payload.email || null,
      address: payload.address || null,
      country: payload.country || null,
      nationality: payload.nationality || null,
      gender: GENDER_VALUES[payload.gender] || payload.gender,
      emergencyContact: payload.emergencyContact || null,
      adultsCount: payload.adultsCount !== undefined ? Number(payload.adultsCount) : 1,
      childrenCount: payload.childrenCount !== undefined ? Number(payload.childrenCount) : 0,
      checkInTime: payload.checkInTime || null,
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      discountType: payload.discountType || 'FIXED',
      discountValue:
        payload.discountValue !== undefined
          ? Number(payload.discountValue)
          : Number(payload.discount) || 0,
      discount: Number(payload.discount) || 0,
      servicesAmount: Number(payload.servicesAmount) || 0,
      taxesAmount: Number(payload.taxesAmount) || 0,
      bookingPeriod: payload.bookingPeriod || 'DAILY',
      periodQuantity:
        payload.periodQuantity !== undefined ? Number(payload.periodQuantity) : undefined,
      periodRate: payload.periodRate !== undefined ? Number(payload.periodRate) : undefined,
      notes: payload.notes || null,
      paymentMethod: METHOD_VALUES[payload.paymentMethod] || payload.paymentMethod,
      reference: payload.reference || null,
      receivedByName: payload.receivedByName || null,
      agentName: payload.agentName || null,
      officeMpesaNumber: payload.officeMpesaNumber || null,
      amountPaid:
        payload.amountPaid !== undefined && payload.amountPaid !== null
          ? Number(payload.amountPaid)
          : undefined,
    }).then(mapBooking),
  addBookingPayment: (id, data) =>
    post(`/bookings/${id}/payments`, {
      amount: Number(data.amount),
      paymentMethod: METHOD_VALUES[data.paymentMethod] || data.paymentMethod || 'CASH',
      paymentDate: data.paymentDate || undefined,
      reference: data.reference || null,
      receivedByName: data.receivedByName || null,
      agentName: data.agentName || null,
      officeMpesaNumber: data.officeMpesaNumber || null,
      comment: data.comment || null,
    }).then(mapBooking),
  listBookingPayments: (id) => get(`/bookings/${id}/payments`),
  getUnitFinancials: (id) => get(`/units/${id}/financials`),
  uploadUnitImages: async (unitId, files) => {
    const formData = new FormData();
    [...files].forEach((f) => formData.append('images', f));
    return unwrap(await api.post(`/units/${unitId}/images`, formData));
  },
  deleteUnitImage: (unitId, imageId) => del(`/units/${unitId}/images/${imageId}`),
  setPrimaryUnitImage: (unitId, imageId) =>
    patch(`/units/${unitId}/images/${imageId}/primary`),

  listShopSales: (params) => get('/shop-sales', params || undefined),
  getShopSale: (id) => get(`/shop-sales/${id}`),
  createShopSale: (payload) =>
    post('/shop-sales', {
      ...payload,
      salePrice: Number(payload.salePrice),
      amountPaid: Number(payload.amountPaid) || 0,
      monthlyMaintenance: Number(payload.monthlyMaintenance) || 0,
      paymentMethod: METHOD_VALUES[payload.paymentMethod] || payload.paymentMethod || 'CASH',
    }),
  addShopSalePayment: (id, data) =>
    post(`/shop-sales/${id}/payments`, {
      amount: Number(data.amount),
      paymentMethod: METHOD_VALUES[data.paymentMethod] || data.paymentMethod || 'CASH',
      paymentDate: data.paymentDate || undefined,
      reference: data.reference || null,
      receivedByName: data.receivedByName || null,
      agentName: data.agentName || null,
      officeMpesaNumber: data.officeMpesaNumber || null,
      comment: data.comment || data.notes || null,
    }),
  recordShopMaintenance: (id, data) =>
    post(`/shop-sales/${id}/maintenance`, {
      ...data,
      amountPaid: Number(data.amountPaid),
      paymentMethod: METHOD_VALUES[data.paymentMethod] || data.paymentMethod || 'CASH',
      reference: data.reference || null,
      receivedByName: data.receivedByName || null,
      agentName: data.agentName || null,
      officeMpesaNumber: data.officeMpesaNumber || null,
    }),
  updateShopSale: (id, data) => patch(`/shop-sales/${id}`, data),

  listExpenses: (params) => get('/expenses', params),
  getExpenseSummary: () => get('/expenses/summary'),
  createExpense: (payload) =>
    post('/expenses', {
      ...payload,
      paymentMethod: METHOD_VALUES[payload.paymentMethod] || payload.paymentMethod || 'CASH',
      amount: Number(payload.amount),
      txnType: payload.txnType || 'OTHER',
    }),
  updateExpense: (id, payload) =>
    patch(`/expenses/${id}`, {
      ...payload,
      ...(payload.paymentMethod !== undefined && {
        paymentMethod: METHOD_VALUES[payload.paymentMethod] || payload.paymentMethod,
      }),
      ...(payload.amount !== undefined && { amount: Number(payload.amount) }),
    }),
  deleteExpense: (id) => del(`/expenses/${id}`),

  listMaintenance: (params) => get('/maintenance', params),
  getMaintenanceSummary: () => get('/maintenance/summary'),
  getMaintenanceReport: (params) => get('/maintenance/report', params),
  getMaintenance: (id) => get(`/maintenance/${id}`),
  createMaintenance: (payload) =>
    post('/maintenance', {
      ...payload,
      amount: Number(payload.amount),
      unitId: payload.unitId || null,
    }),
  updateMaintenance: (id, payload) =>
    patch(`/maintenance/${id}`, {
      ...payload,
      ...(payload.amount !== undefined && { amount: Number(payload.amount) }),
      ...(payload.unitId !== undefined && { unitId: payload.unitId || null }),
    }),
  deleteMaintenance: (id) => del(`/maintenance/${id}`),
  listMaintenanceFields: () => get('/maintenance/fields'),
  createMaintenanceField: (payload) => post('/maintenance/fields', payload),
  updateMaintenanceField: (id, payload) => patch(`/maintenance/fields/${id}`, payload),
  deleteMaintenanceField: (id) => del(`/maintenance/fields/${id}`),

  listWorkProjects: (params) => get('/work-projects', params),
  getWorkProjectSummary: () => get('/work-projects/summary'),
  getWorkProject: (id) => get(`/work-projects/${id}`),
  getWorkSectionTemplates: () => get('/work-projects/templates'),
  createWorkProject: (payload) => post('/work-projects', payload),
  updateWorkProject: (id, payload) => patch(`/work-projects/${id}`, payload),
  deleteWorkProject: (id) => del(`/work-projects/${id}`),
  addWorkSection: (projectId, payload) => post(`/work-projects/${projectId}/sections`, payload),
  addWorkRecord: (sectionId, data) =>
    post(`/work-projects/sections/${sectionId}/records`, { data }),
  updateWorkRecord: (recordId, data) =>
    patch(`/work-projects/records/${recordId}`, { data }),
  deleteWorkRecord: (recordId) => del(`/work-projects/records/${recordId}`),

  listWorkProgress: (params) => get('/work-progress', params),
  getWorkSummary: () => get('/work-projects/summary'),
  createWorkProgress: async (payload) => {
    if (payload.image instanceof File) {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'image') formData.append('image', v);
        else if (v !== undefined && v !== null) formData.append(k, String(v));
      });
      return unwrap(await api.post('/work-progress', formData));
    }
    return post('/work-progress', payload);
  },
  updateWorkProgress: async (id, payload) => {
    if (payload.image instanceof File) {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'image') formData.append('image', v);
        else if (v !== undefined && v !== null) formData.append(k, String(v));
      });
      return unwrap(await api.patch(`/work-progress/${id}`, formData));
    }
    return patch(`/work-progress/${id}`, payload);
  },
  deleteWorkProgress: (id) => del(`/work-progress/${id}`),

  checkInBooking: (id, data) =>
    post(`/bookings/${id}/check-in`, {
      ...data,
      paymentMethod: METHOD_VALUES[data?.paymentMethod] || data?.paymentMethod,
    }).then(mapBooking),
  checkOutBooking: (id, data) =>
    post(`/bookings/${id}/check-out`, {
      ...data,
      paymentMethod: METHOD_VALUES[data?.paymentMethod] || data?.paymentMethod,
    }).then(mapBooking),
  recordBookingPayment: (id, data) =>
    patch(`/bookings/${id}/payment`, {
      ...data,
      paymentMethod: METHOD_VALUES[data?.paymentMethod] || data?.paymentMethod,
    }).then(mapBooking),
  updateBooking: (id, payload) =>
    patch(`/bookings/${id}`, {
      fullName: payload.fullName,
      phone: payload.phone,
      idNumber: payload.idNumber,
      nationality: payload.nationality || null,
      gender: GENDER_VALUES[payload.gender] || payload.gender,
      emergencyContact: payload.emergencyContact || null,
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      discount: payload.discount !== undefined ? Number(payload.discount) : undefined,
    }).then(mapBooking),
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
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      unitId: payload.unitId || payload.roomId,
      monthlyRent: Number(payload.monthlyRent),
      discount: Number(payload.discount) || 0,
      leaseStart: payload.leaseStart,
      ...(payload.leaseEnd ? { leaseEnd: payload.leaseEnd } : {}),
    }).then(mapTenant),
  terminateTenant: (id, { leaseEnd, notes } = {}) =>
    patch(`/tenants/${id}`, {
      status: 'ENDED',
      ...(leaseEnd ? { leaseEnd } : {}),
      ...(notes ? { notes } : {}),
    }).then(mapTenant),
  updateTenant: (id, payload) =>
    patch(`/tenants/${id}`, {
      ...(payload.fullName !== undefined && { fullName: payload.fullName }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(payload.idNumber !== undefined && { idNumber: payload.idNumber }),
      ...(payload.nationality !== undefined && { nationality: payload.nationality }),
      ...(payload.gender !== undefined && {
        gender: GENDER_VALUES[payload.gender] || payload.gender,
      }),
      ...(payload.emergencyContact !== undefined && { emergencyContact: payload.emergencyContact }),
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      ...(payload.monthlyRent !== undefined && { monthlyRent: Number(payload.monthlyRent) }),
      ...(payload.discount !== undefined && { discount: Number(payload.discount) || 0 }),
      ...(payload.leaseStart !== undefined && { leaseStart: payload.leaseStart }),
      ...(payload.leaseEnd !== undefined && { leaseEnd: payload.leaseEnd || null }),
    }).then(mapTenant),

  listBusinesses: (params) =>
    get('/businesses', params).then((rows) => (rows || []).map(mapBusiness)),
  getBusiness: (id) => get(`/businesses/${id}`).then(mapBusiness),
  createBusiness: (payload) =>
    post('/businesses', {
      businessName: payload.businessName,
      contactName: payload.contactName,
      phone: payload.phone,
      licenseNumber: payload.idNumber || payload.licenseNumber || null,
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      unitId: payload.unitId || payload.roomId,
      ...(payload.expectedUsage
        ? { expectedUsage: String(payload.expectedUsage).toUpperCase() }
        : {}),
      monthlyRent: Number(payload.monthlyRent),
      discount: Number(payload.discount) || 0,
      securityDeposit: Number(payload.securityDeposit) || 0,
      paymentFrequency: payload.paymentFrequency || 'MONTHLY',
      gracePeriodDays: Number(payload.gracePeriodDays) || 0,
      notes: payload.notes || null,
      leaseStart: payload.leaseStart,
      leaseEnd: payload.leaseEnd || null,
    }).then(mapBusiness),
  terminateBusiness: (id, { leaseEnd, notes, reason } = {}) =>
    post(`/businesses/${id}/terminate`, {
      ...(leaseEnd ? { leaseEnd } : {}),
      ...(reason || notes ? { reason: reason || notes } : {}),
      ...(notes ? { notes } : {}),
    }).then(mapBusiness),
  renewBusiness: (id, payload) =>
    post(`/businesses/${id}/renew`, {
      leaseStart: payload.leaseStart,
      leaseEnd: payload.leaseEnd,
      monthlyRent: payload.monthlyRent !== undefined ? Number(payload.monthlyRent) : undefined,
      discount: payload.discount !== undefined ? Number(payload.discount) : undefined,
      securityDeposit:
        payload.securityDeposit !== undefined ? Number(payload.securityDeposit) : undefined,
      paymentFrequency: payload.paymentFrequency,
      gracePeriodDays: payload.gracePeriodDays,
      notes: payload.notes,
    }).then(mapBusiness),
  updateBusiness: (id, payload) =>
    patch(`/businesses/${id}`, {
      ...(payload.businessName !== undefined && { businessName: payload.businessName }),
      ...(payload.contactName !== undefined && { contactName: payload.contactName }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(payload.idNumber !== undefined && { licenseNumber: payload.idNumber }),
      ...(payload.identityDocument !== undefined && {
        identityDocument: payload.identityDocument,
        identityDocumentName: payload.identityDocumentName || null,
      }),
      ...(payload.monthlyRent !== undefined && { monthlyRent: Number(payload.monthlyRent) }),
      ...(payload.discount !== undefined && { discount: Number(payload.discount) || 0 }),
      ...(payload.securityDeposit !== undefined && {
        securityDeposit: Number(payload.securityDeposit) || 0,
      }),
      ...(payload.paymentFrequency !== undefined && { paymentFrequency: payload.paymentFrequency }),
      ...(payload.gracePeriodDays !== undefined && {
        gracePeriodDays: Number(payload.gracePeriodDays) || 0,
      }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
      ...(payload.leaseStart !== undefined && { leaseStart: payload.leaseStart }),
      ...(payload.leaseEnd !== undefined && { leaseEnd: payload.leaseEnd || null }),
    }).then(mapBusiness),

  getUnitProfile: (id) => get(`/unit-profiles/${id}`),
  listDocuments: (params) => get('/documents', params),
  uploadEntityDocument: async ({ entityType, entityId, unitId, category, notes, file }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    if (unitId) formData.append('unitId', unitId);
    if (category) formData.append('category', category);
    if (notes) formData.append('notes', notes);
    return unwrap(await api.post('/documents', formData));
  },
  deleteEntityDocument: (id) => del(`/documents/${id}`),

  listPayments: (params) =>
    get('/payments', params).then((rows) => (rows || []).map(mapPayment)),
  listDeposits: (params) => get('/deposits', params),
  getDepositSummary: () => get('/deposits/summary'),
  getDeposit: (id) => get(`/deposits/${id}`),
  createDeposit: (payload) => post('/deposits', payload),
  settleDeposit: (id, payload) => post(`/deposits/${id}/settle`, payload),

  getStatement: (params) => get('/finance/statements', params),
  downloadStatementPdf: async (params) => {
    const res = await api.get('/finance/statements/pdf', { params, responseType: 'blob' });
    return res.data;
  },
  createFinanceDocument: (payload) => post('/finance/documents', payload),
  listFinanceDocuments: (params) => get('/finance/documents', params),
  getFinanceDocument: (id) => get(`/finance/documents/${id}`),
  downloadFinanceDocumentPdf: async (id) => {
    const res = await api.get(`/finance/documents/${id}/pdf`, { responseType: 'blob' });
    return res.data;
  },

  createPayment: (payload) =>
    post('/payments', {
      tenantId: payload.tenantId || null,
      businessId: payload.businessId || null,
      reference: payload.reference || null,
      receivedByName: payload.receivedByName || null,
      agentName: payload.agentName || null,
      officeMpesaNumber: payload.officeMpesaNumber || null,
      month: payload.month,
      amountDue: Number(payload.amountDue),
      amountPaid: Number(payload.amountPaid) || 0,
      rentDue: payload.rentDue !== undefined ? Number(payload.rentDue) : undefined,
      otherCharges: Number(payload.otherCharges) || 0,
      status: STATUS_VALUES[payload.status] || payload.status,
      paymentDate: payload.paymentDate || null,
      method: METHOD_VALUES[payload.method] || payload.method,
      notes: payload.notes || null,
    }).then(mapPayment),
  updatePayment: (id, payload) =>
    patch(`/payments/${id}`, {
      ...(payload.amountDue !== undefined && { amountDue: Number(payload.amountDue) }),
      ...(payload.amountPaid !== undefined && { amountPaid: Number(payload.amountPaid) }),
      ...(payload.rentDue !== undefined && { rentDue: Number(payload.rentDue) }),
      ...(payload.otherCharges !== undefined && { otherCharges: Number(payload.otherCharges) || 0 }),
      ...(payload.status !== undefined && {
        status: STATUS_VALUES[payload.status] || payload.status,
      }),
      ...(payload.paymentDate !== undefined && { paymentDate: payload.paymentDate }),
      ...(payload.method !== undefined && {
        method: METHOD_VALUES[payload.method] || payload.method,
      }),
      ...(payload.reference !== undefined && { reference: payload.reference }),
      ...(payload.receivedByName !== undefined && { receivedByName: payload.receivedByName }),
      ...(payload.agentName !== undefined && { agentName: payload.agentName }),
      ...(payload.officeMpesaNumber !== undefined && {
        officeMpesaNumber: payload.officeMpesaNumber,
      }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
    }).then(mapPayment),
  voidPayment: (id, payload) =>
    patch(`/payments/${id}/void`, { reason: payload?.reason || '' }).then(mapPayment),

  listLeaseCharges: (params) => get('/lease-charges', params),
  createLeaseCharge: (payload) =>
    post('/lease-charges', {
      ...payload,
      amountDue: Number(payload.amountDue),
      amountPaid: Number(payload.amountPaid) || 0,
    }),
  updateLeaseCharge: (id, payload) =>
    patch(`/lease-charges/${id}`, {
      ...payload,
      ...(payload.amountDue !== undefined && { amountDue: Number(payload.amountDue) }),
      ...(payload.amountPaid !== undefined && { amountPaid: Number(payload.amountPaid) }),
      ...(payload.addPayment !== undefined && { addPayment: Number(payload.addPayment) }),
    }),
  deleteLeaseCharge: (id) => del(`/lease-charges/${id}`),

  uploadIdentityDocument,
  openIdentityDocument,
  resolveIdentityAttachment,
};

export default rentalApi;

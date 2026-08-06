import {
  mockNotifications,
  mockProperties,
  mockCategories,
  mockPropertyTypes,
  mockOwners,
  mockCustomers,
  mockAgents,
  mockLeads,
  mockAppointments,
  mockContracts,
  mockPayments,
  mockExpenses,
  mockUsers,
  mockRoles,
  mockDashboardStats,
  mockSalesSeries,
  mockRentalSeries,
  mockRevenueSeries,
  mockAmenities,
} from './mockData.js';

function clone(data) {
  return structuredClone(data);
}

/** In-memory stores (mutable copies of mock arrays) */
const stores = {
  notifications: clone(mockNotifications),
  properties: clone(mockProperties),
  categories: clone(mockCategories),
  propertyTypes: clone(mockPropertyTypes),
  owners: clone(mockOwners),
  customers: clone(mockCustomers),
  agents: clone(mockAgents),
  leads: clone(mockLeads),
  appointments: clone(mockAppointments),
  contracts: clone(mockContracts),
  payments: clone(mockPayments),
  expenses: clone(mockExpenses),
  users: clone(mockUsers),
  roles: clone(mockRoles),
};

export function simulateDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesSearch(item, search, fields) {
  if (!search?.trim()) return true;
  const q = search.trim().toLowerCase();
  return fields.some((field) => {
    const val = item[field];
    if (val == null) return false;
    if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(q));
    return String(val).toLowerCase().includes(q);
  });
}

function applyFilters(items, filters = {}) {
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') return true;
      return String(item[key]).toLowerCase() === String(value).toLowerCase();
    }),
  );
}

function paginate(items, { page = 1, pageSize = 10 } = {}) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function createCrud(storeKey, searchFields = ['name', 'title', 'code', 'email']) {
  return {
    async list(options = {}) {
      await simulateDelay(options.delay);
      let items = [...stores[storeKey]];

      if (options.filters) {
        items = applyFilters(items, options.filters);
      }

      if (options.search) {
        items = items.filter((item) => matchesSearch(item, options.search, searchFields));
      }

      if (options.sortBy) {
        const dir = options.sortDir === 'desc' ? -1 : 1;
        items.sort((a, b) => {
          const av = a[options.sortBy];
          const bv = b[options.sortBy];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
      }

      if (options.page || options.pageSize) {
        return paginate(items, options);
      }

      return { data: items, total: items.length };
    },

    async getById(id) {
      await simulateDelay();
      const item = stores[storeKey].find((row) => row.id === id);
      if (!item) {
        const err = new Error(`${storeKey} item not found`);
        err.status = 404;
        throw err;
      }
      return clone(item);
    },

    async create(payload) {
      await simulateDelay();
      const item = {
        ...payload,
        id: payload.id || `${storeKey.slice(0, 3)}-${Date.now()}`,
        createdAt: payload.createdAt || new Date().toISOString(),
      };
      stores[storeKey].unshift(item);
      return clone(item);
    },

    async update(id, payload) {
      await simulateDelay();
      const index = stores[storeKey].findIndex((row) => row.id === id);
      if (index === -1) {
        const err = new Error(`${storeKey} item not found`);
        err.status = 404;
        throw err;
      }
      stores[storeKey][index] = { ...stores[storeKey][index], ...payload, id };
      return clone(stores[storeKey][index]);
    },

    async remove(id) {
      await simulateDelay();
      const index = stores[storeKey].findIndex((row) => row.id === id);
      if (index === -1) {
        const err = new Error(`${storeKey} item not found`);
        err.status = 404;
        throw err;
      }
      const [removed] = stores[storeKey].splice(index, 1);
      return clone(removed);
    },
  };
}

/* ── Entity CRUD exports ─────────────────────────────────────────── */

export const propertiesService = createCrud('properties', [
  'title', 'code', 'city', 'address', 'category', 'type', 'status', 'owner', 'agent',
]);
export const categoriesService = createCrud('categories', ['name', 'description']);
export const propertyTypesService = createCrud('propertyTypes', ['name', 'description']);
export const ownersService = createCrud('owners', ['name', 'email', 'phone', 'company', 'city']);
export const customersService = createCrud('customers', ['name', 'email', 'phone', 'type', 'city']);
export const agentsService = createCrud('agents', ['name', 'email', 'phone', 'specialization', 'city']);
export const leadsService = createCrud('leads', ['name', 'email', 'phone', 'source', 'status', 'interest', 'city']);
export const appointmentsService = createCrud('appointments', ['title', 'property', 'clientName', 'agent', 'type', 'status']);
export const contractsService = createCrud('contracts', ['code', 'property', 'customer', 'type', 'status']);
export const paymentsService = createCrud('payments', ['code', 'property', 'customer', 'status', 'method', 'description']);
export const expensesService = createCrud('expenses', ['code', 'property', 'category', 'vendor', 'status', 'description']);
export const usersService = createCrud('users', ['name', 'email', 'role', 'status']);
export const rolesService = createCrud('roles', ['name', 'description']);
export const notificationsService = createCrud('notifications', ['title', 'message', 'type']);

/* ── Convenience aliases ─────────────────────────────────────────── */

export const listProperties = (opts) => propertiesService.list(opts);
export const getProperty = (id) => propertiesService.getById(id);
export const createProperty = (data) => propertiesService.create(data);
export const updateProperty = (id, data) => propertiesService.update(id, data);
export const deleteProperty = (id) => propertiesService.remove(id);

export const listCategories = (opts) => categoriesService.list(opts);
export const getCategory = (id) => categoriesService.getById(id);
export const createCategory = (data) => categoriesService.create(data);
export const updateCategory = (id, data) => categoriesService.update(id, data);
export const deleteCategory = (id) => categoriesService.remove(id);

export const listPropertyTypes = (opts) => propertyTypesService.list(opts);
export const getPropertyType = (id) => propertyTypesService.getById(id);
export const createPropertyType = (data) => propertyTypesService.create(data);
export const updatePropertyType = (id, data) => propertyTypesService.update(id, data);
export const deletePropertyType = (id) => propertyTypesService.remove(id);

export const listOwners = (opts) => ownersService.list(opts);
export const getOwner = (id) => ownersService.getById(id);
export const createOwner = (data) => ownersService.create(data);
export const updateOwner = (id, data) => ownersService.update(id, data);
export const deleteOwner = (id) => ownersService.remove(id);

export const listCustomers = (opts) => customersService.list(opts);
export const getCustomer = (id) => customersService.getById(id);
export const createCustomer = (data) => customersService.create(data);
export const updateCustomer = (id, data) => customersService.update(id, data);
export const deleteCustomer = (id) => customersService.remove(id);

export const listAgents = (opts) => agentsService.list(opts);
export const getAgent = (id) => agentsService.getById(id);
export const createAgent = (data) => agentsService.create(data);
export const updateAgent = (id, data) => agentsService.update(id, data);
export const deleteAgent = (id) => agentsService.remove(id);

export const listLeads = (opts) => leadsService.list(opts);
export const getLead = (id) => leadsService.getById(id);
export const createLead = (data) => leadsService.create(data);
export const updateLead = (id, data) => leadsService.update(id, data);
export const deleteLead = (id) => leadsService.remove(id);

export const listAppointments = (opts) => appointmentsService.list(opts);
export const getAppointment = (id) => appointmentsService.getById(id);
export const createAppointment = (data) => appointmentsService.create(data);
export const updateAppointment = (id, data) => appointmentsService.update(id, data);
export const deleteAppointment = (id) => appointmentsService.remove(id);

export const listContracts = (opts) => contractsService.list(opts);
export const getContract = (id) => contractsService.getById(id);
export const createContract = (data) => contractsService.create(data);
export const updateContract = (id, data) => contractsService.update(id, data);
export const deleteContract = (id) => contractsService.remove(id);

export const listPayments = (opts) => paymentsService.list(opts);
export const getPayment = (id) => paymentsService.getById(id);
export const createPayment = (data) => paymentsService.create(data);
export const updatePayment = (id, data) => paymentsService.update(id, data);
export const deletePayment = (id) => paymentsService.remove(id);

export const listExpenses = (opts) => expensesService.list(opts);
export const getExpense = (id) => expensesService.getById(id);
export const createExpense = (data) => expensesService.create(data);
export const updateExpense = (id, data) => expensesService.update(id, data);
export const deleteExpense = (id) => expensesService.remove(id);

export const listUsers = (opts) => usersService.list(opts);
export const getUser = (id) => usersService.getById(id);
export const createUser = (data) => usersService.create(data);
export const updateUser = (id, data) => usersService.update(id, data);
export const deleteUser = (id) => usersService.remove(id);

export const listRoles = (opts) => rolesService.list(opts);
export const getRole = (id) => rolesService.getById(id);
export const createRole = (data) => rolesService.create(data);
export const updateRole = (id, data) => rolesService.update(id, data);
export const deleteRole = (id) => rolesService.remove(id);

export const listNotifications = (opts) => notificationsService.list(opts);
export const getNotification = (id) => notificationsService.getById(id);
export const createNotification = (data) => notificationsService.create(data);
export const updateNotification = (id, data) => notificationsService.update(id, data);
export const deleteNotification = (id) => notificationsService.remove(id);

export async function markNotificationRead(id) {
  return notificationsService.update(id, { read: true });
}

export async function markAllNotificationsRead() {
  await simulateDelay();
  stores.notifications.forEach((n) => {
    n.read = true;
  });
  return { success: true, count: stores.notifications.length };
}

/* ── Dashboard / charts / amenities ──────────────────────────────── */

export async function getDashboardStats() {
  await simulateDelay();
  return clone(mockDashboardStats);
}

export async function getSalesSeries() {
  await simulateDelay();
  return clone(mockSalesSeries);
}

export async function getRentalSeries() {
  await simulateDelay();
  return clone(mockRentalSeries);
}

export async function getRevenueSeries() {
  await simulateDelay();
  return clone(mockRevenueSeries);
}

export async function getAmenities() {
  await simulateDelay(200);
  return [...mockAmenities];
}

export default {
  simulateDelay,
  propertiesService,
  categoriesService,
  propertyTypesService,
  ownersService,
  customersService,
  agentsService,
  leadsService,
  appointmentsService,
  contractsService,
  paymentsService,
  expensesService,
  usersService,
  rolesService,
  notificationsService,
  getDashboardStats,
  getSalesSeries,
  getRentalSeries,
  getRevenueSeries,
  getAmenities,
};

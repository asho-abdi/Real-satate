/**
 * Human-friendly permission groups for the Roles UI.
 * Still maps to the same `resource:action` codes the API uses.
 */

export const ACCESS_LEVELS = [
  {
    id: 'none',
    label: 'No access',
    description: 'Hidden from this role',
  },
  {
    id: 'view',
    label: 'View only',
    description: 'Can see, cannot change',
  },
  {
    id: 'manage',
    label: 'Can manage',
    description: 'View, add, and edit',
  },
  {
    id: 'full',
    label: 'Full control',
    description: 'Manage and delete',
  },
];

export const PERMISSION_GROUPS = [
  {
    id: 'portfolio',
    title: 'Buildings & floors',
    description: 'Property setup and floor plans',
    resources: ['buildings', 'floors'],
  },
  {
    id: 'units',
    title: 'Units',
    description: 'Rooms, shops, and availability',
    resources: ['units'],
  },
  {
    id: 'bookings',
    title: 'Guest bookings',
    description: 'Check-ins, check-outs, and guest stays',
    resources: ['bookings'],
  },
  {
    id: 'apartments',
    title: 'Apartments',
    description: 'Long-term apartment tenants',
    resources: ['tenants'],
  },
  {
    id: 'shops',
    title: 'Business Units',
    description: 'Commercial shop and office businesses (shared API permissions)',
    resources: ['businesses'],
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'Rent collection and payment records',
    resources: ['payments'],
  },
  {
    id: 'expenses',
    title: 'Money movements',
    description: 'Expenses and cash movements',
    resources: ['expenses'],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    description: 'Repairs and property maintenance',
    resources: ['maintenance'],
  },
  {
    id: 'work',
    title: 'Work progress',
    description: 'Construction and project tracking',
    resources: ['work'],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Dashboards and exports',
    resources: ['reports'],
    // reports use read + export (no create/delete)
    mode: 'reports',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Company and system settings',
    resources: ['settings'],
    mode: 'settings',
  },
  {
    id: 'users',
    title: 'Users & roles',
    description: 'Staff accounts and access control',
    resources: ['users', 'roles'],
  },
];

const VIEW_ACTIONS = new Set(['read', 'export']);
const MANAGE_ACTIONS = new Set(['read', 'create', 'update', 'export']);

function permsForResources(permissions, resources) {
  return permissions.filter((p) => resources.includes(p.resource));
}

function actionsForLevel(mode, level) {
  if (level === 'none') return new Set();
  if (mode === 'reports') {
    if (level === 'view') return new Set(['read']);
    return new Set(['read', 'export']); // manage + full
  }
  if (mode === 'settings') {
    if (level === 'view') return new Set(['read']);
    return new Set(['read', 'update']); // manage + full
  }
  if (level === 'view') return VIEW_ACTIONS;
  if (level === 'manage') return MANAGE_ACTIONS;
  return null; // full = all actions present on those permissions
}

export function getGroupLevel(group, permissions, selectedIds) {
  const selected = new Set(selectedIds);
  const groupPerms = permsForResources(permissions, group.resources);
  if (!groupPerms.length) return 'none';

  const selectedGroup = groupPerms.filter((p) => selected.has(p.id));
  if (!selectedGroup.length) return 'none';

  const actions = new Set(selectedGroup.map((p) => p.action));

  if (group.mode === 'reports') {
    if (actions.has('export')) return 'manage';
    if (actions.has('read')) return 'view';
    return 'none';
  }
  if (group.mode === 'settings') {
    if (actions.has('update')) return 'manage';
    if (actions.has('read')) return 'view';
    return 'none';
  }

  const hasDelete = actions.has('delete');
  const hasWrite = actions.has('create') || actions.has('update');
  const hasRead = actions.has('read');

  if (groupPerms.every((p) => selected.has(p.id))) return 'full';
  if (hasDelete) return 'full';
  if (hasWrite) return 'manage';
  if (hasRead) return 'view';
  return 'none';
}

export function applyGroupLevel(group, permissions, selectedIds, level) {
  const selected = new Set(selectedIds);
  const groupPerms = permsForResources(permissions, group.resources);

  for (const p of groupPerms) selected.delete(p.id);

  if (level === 'none') return [...selected];

  const allowed = actionsForLevel(group.mode, level);
  for (const p of groupPerms) {
    if (allowed === null || allowed.has(p.action)) selected.add(p.id);
  }
  return [...selected];
}

export function levelsForGroup(group) {
  if (group.mode === 'reports') {
    return [
      ACCESS_LEVELS[0],
      ACCESS_LEVELS[1],
      { id: 'manage', label: 'View & export', description: 'Can download reports' },
    ];
  }
  if (group.mode === 'settings') {
    return [
      ACCESS_LEVELS[0],
      ACCESS_LEVELS[1],
      { id: 'manage', label: 'Can change', description: 'View and update settings' },
    ];
  }
  return ACCESS_LEVELS;
}

export function countSelectedInGroup(group, permissions, selectedIds) {
  const selected = new Set(selectedIds);
  return permsForResources(permissions, group.resources).filter((p) => selected.has(p.id)).length;
}

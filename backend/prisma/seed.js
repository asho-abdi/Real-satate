import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSION_DEFS = [
  ['users', 'read', 'View users'],
  ['users', 'create', 'Create users'],
  ['users', 'update', 'Update users'],
  ['users', 'delete', 'Delete users'],
  ['roles', 'read', 'View roles'],
  ['roles', 'update', 'Update role permissions'],
  ['buildings', 'read', 'View buildings'],
  ['buildings', 'create', 'Create buildings'],
  ['buildings', 'update', 'Update buildings'],
  ['buildings', 'delete', 'Delete buildings'],
  ['floors', 'read', 'View floors'],
  ['floors', 'create', 'Create floors'],
  ['floors', 'update', 'Update floors'],
  ['floors', 'delete', 'Delete floors'],
  ['units', 'read', 'View units'],
  ['units', 'create', 'Create units'],
  ['units', 'update', 'Update units'],
  ['units', 'delete', 'Delete units'],
  ['tenants', 'read', 'View apartment tenants'],
  ['tenants', 'create', 'Register apartment tenants'],
  ['tenants', 'update', 'Update apartment tenants'],
  ['tenants', 'delete', 'Delete apartment tenants'],
  ['businesses', 'read', 'View shop businesses'],
  ['businesses', 'create', 'Register shop businesses'],
  ['businesses', 'update', 'Update shop businesses'],
  ['businesses', 'delete', 'Delete shop businesses'],
  ['bookings', 'read', 'View guest bookings'],
  ['bookings', 'create', 'Create guest bookings'],
  ['bookings', 'update', 'Update guest bookings'],
  ['bookings', 'delete', 'Cancel guest bookings'],
  ['payments', 'read', 'View payments'],
  ['payments', 'create', 'Record payments'],
  ['payments', 'update', 'Update payments'],
  ['payments', 'delete', 'Delete payments'],
  ['expenses', 'read', 'View expenses'],
  ['expenses', 'create', 'Create expenses'],
  ['expenses', 'update', 'Update expenses'],
  ['expenses', 'delete', 'Delete expenses'],
  ['maintenance', 'read', 'View property maintenance'],
  ['maintenance', 'create', 'Create maintenance records'],
  ['maintenance', 'update', 'Update maintenance records'],
  ['maintenance', 'delete', 'Delete maintenance records'],
  ['work', 'read', 'View work progress'],
  ['work', 'create', 'Create work progress'],
  ['work', 'update', 'Update work progress'],
  ['work', 'delete', 'Delete work progress'],
  ['reports', 'read', 'View reports'],
  ['reports', 'export', 'Export reports'],
  ['settings', 'read', 'View settings'],
  ['settings', 'update', 'Update settings'],
];

const MANAGER_PERMISSIONS = PERMISSION_DEFS
  .map(([resource, action]) => `${resource}:${action}`)
  .filter((code) => {
    if (code.startsWith('users:') || code.startsWith('roles:')) return false;
    if (code === 'buildings:create' || code === 'buildings:delete') return false;
    if (code.startsWith('settings:')) return false;
    return true;
  });

async function seedRolesAndPermissions() {
  for (const [resource, action, description] of PERMISSION_DEFS) {
    const code = `${resource}:${action}`;
    await prisma.permission.upsert({
      where: { code },
      update: { name: description, description, resource, action },
      create: { code, name: description, description, resource, action },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const byCode = Object.fromEntries(allPermissions.map((p) => [p.code, p]));

  const admin = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {
      name: 'Admin',
      description: 'Full access to all buildings, users, roles and data.',
      isSystem: true,
    },
    create: {
      code: 'ADMIN',
      name: 'Admin',
      description: 'Full access to all buildings, users, roles and data.',
      isSystem: true,
    },
  });

  const manager = await prisma.role.upsert({
    where: { code: 'BUILDING_MANAGER' },
    update: {
      name: 'Building Manager',
      description: 'Access only to explicitly assigned buildings.',
      isSystem: true,
    },
    create: {
      code: 'BUILDING_MANAGER',
      name: 'Building Manager',
      description: 'Access only to explicitly assigned buildings.',
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: { in: [admin.id, manager.id] } } });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: admin.id, permissionId: p.id })),
  });

  await prisma.rolePermission.createMany({
    data: MANAGER_PERMISSIONS.filter((code) => byCode[code]).map((code) => ({
      roleId: manager.id,
      permissionId: byCode[code].id,
    })),
  });

  return { admin, manager };
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = String(process.env.SEED_ADMIN_EMAIL || 'admin@estateops.com')
    .toLowerCase()
    .trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (isProduction ? '' : 'Admin@12345');
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME || 'Owner';

  if (isProduction) {
    if (!adminPassword || adminPassword.length < 10) {
      throw new Error(
        'Production seed requires SEED_ADMIN_PASSWORD (min 10 characters). Set it in backend/.env',
      );
    }
    if (/admin@12345/i.test(adminPassword) || adminPassword === 'password') {
      throw new Error('Production seed refuses a weak SEED_ADMIN_PASSWORD');
    }
  }

  console.log('Bootstrapping building RBAC (keeps existing buildings/data)…');
  const { admin, manager } = await seedRolesAndPermissions();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'ADMIN',
        roleId: admin.id,
        isActive: true,
        // Only rotate password when explicitly seeding a new password in production
        ...(isProduction && process.env.SEED_ADMIN_PASSWORD
          ? { passwordHash }
          : {}),
      },
    });
    console.log(`  Linked existing ${adminEmail} → ADMIN role`);
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: String(adminFirstName).trim(),
        lastName: String(adminLastName).trim(),
        role: 'ADMIN',
        roleId: admin.id,
        isActive: true,
      },
    });
    if (isProduction) {
      console.log(`  Created production admin ${adminEmail} (password from SEED_ADMIN_PASSWORD)`);
    } else {
      console.log(`  Created ${adminEmail} (dev password from SEED_ADMIN_PASSWORD or default)`);
    }
  }

  // Link any legacy ADMIN users without roleId
  await prisma.user.updateMany({
    where: { role: 'ADMIN', roleId: null },
    data: { roleId: admin.id },
  });

  await prisma.setting.upsert({
    where: { key: 'app.name' },
    update: { value: 'RJK REALTY' },
    create: { key: 'app.name', value: 'RJK REALTY' },
  });
  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: { value: 'KES' },
    create: { key: 'currency', value: 'KES' },
  });

  console.log('RBAC bootstrap complete.');
  console.log(`  Roles: ${admin.code}, ${manager.code}`);
  console.log('  Open Users & Access to create Building Managers and assign buildings.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

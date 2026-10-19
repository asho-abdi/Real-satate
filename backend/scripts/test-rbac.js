/**
 * Quick RBAC building-scope smoke test against a running API.
 * Usage: node scripts/test-rbac.js
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://localhost:5000/api/v1';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(email, password) {
  const { status, json } = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (status >= 400) throw new Error(`Login failed for ${email}: ${json.message || status}`);
  return json.data?.accessToken || json.accessToken;
}

async function ensureFixture() {
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  const managerRole = await prisma.role.findUnique({ where: { code: 'BUILDING_MANAGER' } });
  if (!adminRole || !managerRole) throw new Error('Run prisma seed first');

  let b1 = await prisma.building.findFirst({ where: { code: 'RBAC-B1', deletedAt: null } });
  let b2 = await prisma.building.findFirst({ where: { code: 'RBAC-B2', deletedAt: null } });
  if (!b1) {
    b1 = await prisma.building.create({ data: { code: 'RBAC-B1', name: 'RBAC Building 1' } });
  }
  if (!b2) {
    b2 = await prisma.building.create({ data: { code: 'RBAC-B2', name: 'RBAC Building 2' } });
  }

  const passwordHash = await bcrypt.hash('Manager@12345', 12);

  async function upsertManager(email, buildingIds) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: 'Test',
          lastName: email.split('@')[0],
          role: 'BUILDING_MANAGER',
          roleId: managerRole.id,
          isActive: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'BUILDING_MANAGER', roleId: managerRole.id, passwordHash, isActive: true },
      });
    }
    await prisma.userBuilding.deleteMany({ where: { userId: user.id } });
    await prisma.userBuilding.createMany({
      data: buildingIds.map((buildingId) => ({ userId: user.id, buildingId })),
    });
    return user;
  }

  const user1 = await upsertManager('manager1@estateops.com', [b1.id]);
  const user2 = await upsertManager('manager2@estateops.com', [b2.id]);
  const multi = await upsertManager('manager-multi@estateops.com', [b1.id, b2.id]);

  return { b1, b2, user1, user2, multi };
}

async function main() {
  console.log('RBAC building access tests…');
  const { b1, b2 } = await ensureFixture();

  const adminToken = await login('admin@estateops.com', 'Admin@12345');
  const u1Token = await login('manager1@estateops.com', 'Manager@12345');
  const u2Token = await login('manager2@estateops.com', 'Manager@12345');
  const multiToken = await login('manager-multi@estateops.com', 'Manager@12345');

  const adminList = await api('/buildings', { token: adminToken });
  const adminIds = (adminList.json.data || []).map((b) => b.id);
  console.log(adminIds.includes(b1.id) && adminIds.includes(b2.id) ? 'PASS admin sees all buildings' : 'FAIL admin list');

  const u1List = await api('/buildings', { token: u1Token });
  const u1Ids = (u1List.json.data || []).map((b) => b.id);
  console.log(
    u1Ids.includes(b1.id) && !u1Ids.includes(b2.id)
      ? 'PASS user1 sees only Building 1'
      : `FAIL user1 list: ${u1Ids.join(',')}`,
  );

  const u1GetB1 = await api(`/buildings/${b1.id}`, { token: u1Token });
  console.log(u1GetB1.status === 200 ? 'PASS user1 can access Building 1' : 'FAIL user1 Building 1');

  const u1GetB2 = await api(`/buildings/${b2.id}`, { token: u1Token });
  console.log(u1GetB2.status === 403 ? 'PASS user1 blocked from Building 2 (403)' : `FAIL expected 403 got ${u1GetB2.status}`);

  const u2GetB1 = await api(`/buildings/${b1.id}`, { token: u2Token });
  console.log(u2GetB1.status === 403 ? 'PASS user2 blocked from Building 1 (403)' : `FAIL expected 403 got ${u2GetB1.status}`);

  const multiList = await api('/buildings', { token: multiToken });
  const multiIds = (multiList.json.data || []).map((b) => b.id);
  console.log(
    multiIds.includes(b1.id) && multiIds.includes(b2.id)
      ? 'PASS multi-building user sees assigned buildings'
      : 'FAIL multi list',
  );

  // Remove Building 1 from user1 and verify immediate denial
  const user1 = await prisma.user.findUnique({ where: { email: 'manager1@estateops.com' } });
  await prisma.userBuilding.deleteMany({ where: { userId: user1.id, buildingId: b1.id } });
  const afterRemove = await api(`/buildings/${b1.id}`, { token: u1Token });
  console.log(
    afterRemove.status === 403
      ? 'PASS removing building access immediately blocks (403)'
      : `FAIL expected 403 after removal got ${afterRemove.status}`,
  );

  // Restore for future runs
  await prisma.userBuilding.create({ data: { userId: user1.id, buildingId: b1.id } });
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

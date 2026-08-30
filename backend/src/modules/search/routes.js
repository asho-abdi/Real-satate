import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';

const router = Router();
router.use(authenticate);

const LIMIT = 6;

function contains(q) {
  return { contains: q, mode: 'insensitive' };
}

router.get(
  '/',
  authorize('buildings:read'),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || req.query.search || '').trim();
    if (q.length < 1) {
      return success(res, { query: q, results: [] });
    }

    const [
      buildings,
      floors,
      units,
      bookings,
      tenants,
      businesses,
    ] = await Promise.all([
      prisma.building.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: contains(q) }, { code: contains(q) }, { address: contains(q) }],
        },
        select: { id: true, name: true, code: true, address: true },
        orderBy: { name: 'asc' },
        take: LIMIT,
      }),
      prisma.floor.findMany({
        where: {
          deletedAt: null,
          building: { deletedAt: null },
          OR: [
            { name: contains(q) },
            { building: { name: contains(q) } },
            { building: { code: contains(q) } },
          ],
        },
        select: {
          id: true,
          name: true,
          level: true,
          buildingId: true,
          building: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ building: { name: 'asc' } }, { level: 'asc' }],
        take: LIMIT,
      }),
      prisma.unit.findMany({
        where: {
          deletedAt: null,
          building: { deletedAt: null },
          OR: [
            { roomNumber: contains(q) },
            { building: { name: contains(q) } },
            { building: { code: contains(q) } },
            { floor: { name: contains(q) } },
          ],
        },
        select: {
          id: true,
          roomNumber: true,
          usage: true,
          status: true,
          buildingId: true,
          floorId: true,
          building: { select: { id: true, name: true, code: true } },
          floor: { select: { id: true, name: true } },
        },
        orderBy: { roomNumber: 'asc' },
        take: LIMIT,
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          OR: [
            { fullName: contains(q) },
            { phone: contains(q) },
            { idNumber: contains(q) },
            { code: contains(q) },
          ],
        },
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          status: true,
          unit: {
            select: {
              roomNumber: true,
              building: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
      }),
      prisma.tenant.findMany({
        where: {
          deletedAt: null,
          OR: [
            { fullName: contains(q) },
            { phone: contains(q) },
            { idNumber: contains(q) },
          ],
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          unit: {
            select: {
              roomNumber: true,
              building: { select: { name: true } },
            },
          },
        },
        orderBy: { fullName: 'asc' },
        take: LIMIT,
      }),
      prisma.business.findMany({
        where: {
          deletedAt: null,
          OR: [
            { businessName: contains(q) },
            { contactName: contains(q) },
            { phone: contains(q) },
            { licenseNumber: contains(q) },
          ],
        },
        select: {
          id: true,
          businessName: true,
          contactName: true,
          phone: true,
          status: true,
          unit: {
            select: {
              roomNumber: true,
              building: { select: { name: true } },
            },
          },
        },
        orderBy: { businessName: 'asc' },
        take: LIMIT,
      }),
    ]);

    const results = [
      ...buildings.map((b) => ({
        id: b.id,
        type: 'building',
        title: b.name,
        subtitle: [b.code, b.address].filter(Boolean).join(' · '),
        path: `/buildings/${b.id}`,
        searchText: b.name,
      })),
      ...floors.map((f) => ({
        id: f.id,
        type: 'floor',
        title: f.name,
        subtitle: `${f.building?.name || 'Building'} · Level ${f.level}`,
        path: `/buildings/${f.buildingId}?floor=${f.id}`,
        searchText: f.name,
      })),
      ...units.map((u) => ({
        id: u.id,
        type: 'room',
        title: `Room ${u.roomNumber}`,
        subtitle: [u.building?.name, u.floor?.name, u.usage, u.status]
          .filter(Boolean)
          .join(' · '),
        path: `/buildings/${u.buildingId}?floor=${u.floorId}`,
        searchText: u.roomNumber,
      })),
      ...bookings.map((b) => ({
        id: b.id,
        type: 'guest',
        title: b.fullName,
        subtitle: [b.phone, b.code, b.unit?.building?.name, b.unit?.roomNumber && `Room ${b.unit.roomNumber}`, b.status]
          .filter(Boolean)
          .join(' · '),
        path: '/bookings',
        searchText: b.fullName,
      })),
      ...tenants.map((t) => ({
        id: t.id,
        type: 'tenant',
        title: t.fullName,
        subtitle: [t.phone, t.unit?.building?.name, t.unit?.roomNumber && `Room ${t.unit.roomNumber}`, t.status]
          .filter(Boolean)
          .join(' · '),
        path: '/apartments',
        searchText: t.fullName,
      })),
      ...businesses.map((b) => ({
        id: b.id,
        type: 'business',
        title: b.businessName,
        subtitle: [b.contactName, b.phone, b.unit?.building?.name, b.unit?.roomNumber && `Room ${b.unit.roomNumber}`, b.status]
          .filter(Boolean)
          .join(' · '),
        path: '/shops',
        searchText: b.businessName,
      })),
    ];

    return success(res, { query: q, results });
  }),
);

export default router;

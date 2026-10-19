import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import prisma from '../../config/database.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { unitsDir, uploadRoot } from '../../middlewares/upload.js';

const router = Router();

/** Public website is the Houdo Souk building. */
function isHoudo(name) {
  return /houdo/i.test(String(name || ''));
}

const houdoBuilding = {
  deletedAt: null,
  name: { contains: 'Houdo', mode: 'insensitive' },
};

const UNIT_TYPE_LABELS = {
  COMMERCIAL_SHOP: 'Commercial Shop',
  APARTMENT: 'Apartment',
  STUDIO_APARTMENT: 'Studio Apartment',
  ONE_BEDROOM: '1 Bedroom',
  TWO_BEDROOM: '2 Bedroom',
  THREE_BEDROOM: '3 Bedroom',
};

function num(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function categoryOf(unit) {
  if (unit.usage === 'APARTMENT') return 'apartment';
  if (unit.usage === 'GUEST') return 'guest';
  if (unit.status === 'SOLD' || unit.transactionType === 'FOR_SALE') return 'commercial-sale';
  if (unit.transactionType === 'BOTH') return 'commercial-both';
  return 'commercial-rent';
}

function offerOf(unit, category) {
  if (unit.usage === 'GUEST') return 'guest';
  if (category === 'commercial-sale' || unit.transactionType === 'FOR_SALE' || unit.status === 'SOLD') {
    return 'purchase';
  }
  if (category === 'commercial-both' || unit.transactionType === 'BOTH') return 'both';
  return 'rent';
}

function typeLabel(unit, category) {
  const unitType = UNIT_TYPE_LABELS[unit.unitType] || 'Property';
  if (unit.usage === 'GUEST') return 'Guest / Airbnb';
  if (unit.usage === 'APARTMENT') {
    return unitType === 'Apartment' ? 'Apartment' : `Apartment · ${unitType}`;
  }
  if (category === 'commercial-sale') return 'Purchased commercial';
  if (category === 'commercial-both') return 'Commercial · sale & rent';
  return 'Rental shop';
}

function statusLabel(unit) {
  if (unit.status === 'AVAILABLE') return 'Available';
  if (unit.status === 'RESERVED') return 'Reserved';
  if (unit.status === 'SOLD') return 'Sold';
  if (unit.status === 'MAINTENANCE') return 'Maintenance';
  if (unit.usage === 'GUEST') return 'Booked';
  if (unit.usage === 'SHOP' && (unit.status === 'SOLD' || unit.transactionType === 'FOR_SALE')) {
    return 'Owner occupied';
  }
  return 'Rented';
}

function serializeUnit(unit) {
  const category = categoryOf(unit);
  const images = (unit.images || []).map((img) => ({
    id: img.id,
    url: `/api/v1/public/media/${encodeURIComponent(img.filename)}`,
    isPrimary: img.isPrimary,
    originalName: img.originalName || '',
  }));
  const facts = [];
  if (unit.floor?.name) facts.push(unit.floor.name);
  if (unit.roomsCount) facts.push(`${unit.roomsCount} rooms`);
  if (unit.bathroomsCount) facts.push(`${unit.bathroomsCount} baths`);
  if (unit.areaSqm != null) facts.push(`${num(unit.areaSqm)} m²`);
  if (unit.usage === 'GUEST') {
    if (unit.dailyRate != null) facts.push('Daily stays');
    if (unit.weeklyRent != null) facts.push('Weekly stays');
    if (unit.monthlyRent != null) facts.push('Monthly stays');
  }
  if (category === 'commercial-sale') facts.push('One-time purchase');
  if (category === 'commercial-rent') facts.push('Monthly rent');
  if (category === 'commercial-both') facts.push('Sale or monthly rent');

  return {
    id: unit.id,
    name: `${unit.building?.name || 'Property'} · ${unit.roomNumber}`,
    roomNumber: unit.roomNumber,
    buildingId: unit.buildingId,
    buildingName: unit.building?.name || '',
    buildingCode: unit.building?.code || '',
    address: unit.building?.address || '',
    floorName: unit.floor?.name || '',
    usage: unit.usage,
    unitType: unit.unitType,
    unitTypeLabel: UNIT_TYPE_LABELS[unit.unitType] || unit.unitType,
    transactionType: unit.transactionType,
    category,
    offer: offerOf(unit, category),
    typeLabel: typeLabel(unit, category),
    status: unit.status,
    statusLabel: statusLabel(unit),
    monthlyRent: num(unit.monthlyRent),
    weeklyRent: num(unit.weeklyRent),
    dailyRate: num(unit.dailyRate),
    salePrice: num(unit.salePrice),
    areaSqm: num(unit.areaSqm),
    roomsCount: unit.roomsCount ?? null,
    bathroomsCount: unit.bathroomsCount ?? null,
    description: unit.description || '',
    facts,
    images,
  };
}

router.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    const [units, buildings, tenants, businesses, guestPhones, projects] = await Promise.all([
      prisma.unit.findMany({
        where: { deletedAt: null, building: houdoBuilding },
        include: {
          building: { select: { id: true, name: true, code: true, address: true } },
          floor: { select: { name: true, level: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.building.findMany({
        where: houdoBuilding,
        select: { id: true, name: true, code: true, address: true },
        orderBy: { name: 'asc' },
      }),
      prisma.tenant.count({
        where: { deletedAt: null, unit: { building: houdoBuilding } },
      }),
      prisma.business.count({
        where: { deletedAt: null, unit: { building: houdoBuilding } },
      }),
      prisma.booking.groupBy({
        by: ['phone'],
        where: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          unit: { building: houdoBuilding },
        },
      }),
      prisma.workProject.count({
        where: { deletedAt: null, building: houdoBuilding },
      }),
    ]);

    const listings = units
      .map(serializeUnit)
      .sort((a, b) => {
        const kind = (item) => (item.category === 'guest' ? 0 : item.category === 'apartment' ? 1 : 2);
        const status = (value) => (value === 'AVAILABLE' ? 0 : value === 'RESERVED' ? 1 : 2);
        return kind(a) - kind(b) || status(a.status) - status(b.status);
      });

    const imageForBuilding = new Map();
    for (const listing of listings) {
      if (!imageForBuilding.has(listing.buildingId) && listing.images[0]) {
        imageForBuilding.set(listing.buildingId, listing.images[0].url);
      }
    }

    const buildingCards = buildings.map((building) => ({
      id: building.id,
      name: building.name,
      code: building.code,
      address: building.address || '',
      unitCount: listings.filter((item) => item.buildingId === building.id).length,
      image: imageForBuilding.get(building.id) || null,
    }));

    const count = (category) => listings.filter((item) => item.category === category).length;

    return success(res, {
      stats: {
        properties: buildings.length,
        units: listings.length,
        availableUnits: listings.filter((item) => item.status === 'AVAILABLE').length,
        customers: tenants + businesses + guestPhones.length,
        projects,
        apartments: count('apartment'),
        guest: count('guest'),
        rentalShops: listings.filter((item) =>
          item.category === 'commercial-rent' || item.category === 'commercial-both',
        ).length,
        purchasedShops: listings.filter((item) =>
          item.category === 'commercial-sale' || item.category === 'commercial-both',
        ).length,
      },
      buildings: buildingCards,
      listings,
    });
  }),
);

router.get(
  '/catalog/:id',
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: String(req.params.id), deletedAt: null, building: { deletedAt: null } },
      include: {
        building: { select: { id: true, name: true, code: true, address: true } },
        floor: { select: { name: true, level: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!unit || !isHoudo(unit.building?.name)) throw new AppError('Property not found', 404);
    return success(res, serializeUnit(unit));
  }),
);

router.get(
  '/media/:filename',
  asyncHandler(async (req, res) => {
    const filename = path.basename(decodeURIComponent(String(req.params.filename)));
    const image = await prisma.unitImage.findFirst({
      where: { filename, unit: { deletedAt: null, building: houdoBuilding } },
      select: { filename: true },
    });
    if (!image) throw new AppError('File not found', 404);

    const filePath = path.resolve(unitsDir, filename);
    if (!filePath.startsWith(path.resolve(uploadRoot)) || !fs.existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }),
);

export default router;

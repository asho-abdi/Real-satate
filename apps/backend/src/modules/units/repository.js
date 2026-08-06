import { createRepository } from '../../lib/crudFactory.js';
import prisma from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

export const unitInclude = {
  building: { select: { id: true, code: true, name: true, city: true } },
  floor: { select: { id: true, floorNumber: true, name: true } },
  category: { select: { id: true, name: true, occupancyMode: true, baseRate: true } },
  type: { select: { id: true, name: true, occupancyMode: true } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
};

export const unitsRepository = createRepository('unit', {
  softDelete: true,
  searchFields: ['code', 'name', 'description'],
  defaultInclude: unitInclude,
});

export async function addUnitImages(unitId, files = []) {
  await unitsRepository.findById(unitId);
  if (!files.length) {
    throw new AppError('At least one image is required', 400, { code: 'FILE_REQUIRED' });
  }

  const existingCount = await prisma.unitImage.count({ where: { unitId } });
  const created = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const image = await prisma.unitImage.create({
      data: {
        unitId,
        url: `/uploads/units/${file.filename}`,
        path: file.path,
        isPrimary: existingCount === 0 && i === 0,
        sortOrder: existingCount + i,
      },
    });
    created.push(image);
  }

  return created;
}

export async function deleteUnitImage(unitId, imageId) {
  const image = await prisma.unitImage.findFirst({
    where: { id: imageId, unitId },
  });
  if (!image) throw new AppError('Image not found', 404, { code: 'NOT_FOUND' });

  await prisma.unitImage.delete({ where: { id: imageId } });

  if (image.isPrimary) {
    const next = await prisma.unitImage.findFirst({
      where: { unitId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (next) {
      await prisma.unitImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  return image;
}

export async function setPrimaryUnitImage(unitId, imageId) {
  const image = await prisma.unitImage.findFirst({
    where: { id: imageId, unitId },
  });
  if (!image) throw new AppError('Image not found', 404, { code: 'NOT_FOUND' });

  await prisma.$transaction([
    prisma.unitImage.updateMany({
      where: { unitId },
      data: { isPrimary: false },
    }),
    prisma.unitImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    }),
  ]);

  return prisma.unitImage.findUnique({ where: { id: imageId } });
}

export default unitsRepository;

import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../utils/pagination.js';
import { writeActivityLog } from '../utils/audit.js';

/**
 * Generic repository helpers for Prisma models.
 */
export function createRepository(modelName, options = {}) {
  const {
    softDelete = true,
    defaultInclude,
    searchFields = ['name', 'title', 'code', 'email'],
    filterMap = {},
  } = options;

  const model = () => {
    const delegate = prisma[modelName];
    if (!delegate) {
      throw new Error(`Prisma model "${modelName}" not found on client`);
    }
    return delegate;
  };

  function baseWhere(extra = {}) {
    if (!softDelete) return { ...extra };
    return { deletedAt: null, ...extra };
  }

  function buildSearchWhere(search) {
    if (!search || !searchFields.length) return {};
    return {
      OR: searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })),
    };
  }

  function coerceFilterValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  function buildFilters(filters = {}) {
    const where = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      if (filterMap[key]) {
        Object.assign(where, filterMap[key](value));
      } else {
        where[key] = coerceFilterValue(value);
      }
    }
    return where;
  }

  return {
    async findMany(query = {}, listOptions = {}) {
      const parsed = parsePaginationQuery(query, {
        defaultSort: listOptions.defaultSort || 'createdAt',
        allowedSorts: listOptions.allowedSorts,
        filterKeys: listOptions.filterKeys || [],
      });

      const where = baseWhere({
        ...buildSearchWhere(parsed.search),
        ...buildFilters(parsed.filters),
        ...(listOptions.where || {}),
      });

      const [total, data] = await Promise.all([
        model().count({ where }),
        model().findMany({
          where,
          skip: parsed.skip,
          take: parsed.take,
          orderBy: parsed.orderBy,
          include: listOptions.include ?? defaultInclude,
        }),
      ]);

      return {
        data,
        meta: buildPaginationMeta(total, { page: parsed.page, limit: parsed.limit }),
      };
    },

    async findById(id, include) {
      const row = await model().findFirst({
        where: baseWhere({ id }),
        include: include ?? defaultInclude,
      });
      if (!row) throw new AppError('Resource not found', 404, { code: 'NOT_FOUND' });
      return row;
    },

    async create(data, include) {
      return model().create({
        data,
        include: include ?? defaultInclude,
      });
    },

    async update(id, data, include) {
      await this.findById(id);
      return model().update({
        where: { id },
        data,
        include: include ?? defaultInclude,
      });
    },

    async remove(id) {
      await this.findById(id);
      if (softDelete) {
        return model().update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      }
      return model().delete({ where: { id } });
    },
  };
}

/**
 * Thin service wrapper with audit logging.
 */
export function createCrudService(repository, options = {}) {
  const { entityType = 'Resource', audit = true } = options;

  return {
    list(query, listOptions) {
      return repository.findMany(query, listOptions);
    },

    getById(id) {
      return repository.findById(id);
    },

    async create(data, ctx = {}) {
      const created = await repository.create(data);
      if (audit) {
        await writeActivityLog(prisma, {
          userId: ctx.userId,
          action: 'CREATE',
          entityType,
          entityId: created.id,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
      return created;
    },

    async update(id, data, ctx = {}) {
      const updated = await repository.update(id, data);
      if (audit) {
        await writeActivityLog(prisma, {
          userId: ctx.userId,
          action: 'UPDATE',
          entityType,
          entityId: id,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
      return updated;
    },

    async remove(id, ctx = {}) {
      const removed = await repository.remove(id);
      if (audit) {
        await writeActivityLog(prisma, {
          userId: ctx.userId,
          action: 'DELETE',
          entityType,
          entityId: id,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
      return removed;
    },
  };
}

/**
 * Standard Express CRUD controller factory.
 */
export function createCrudController(service) {
  return {
    list: async (req, res) => {
      const result = await service.list(req.query);
      res.status(200).json({ success: true, data: result.data, meta: result.meta });
    },
    getById: async (req, res) => {
      const row = await service.getById(req.params.id);
      res.status(200).json({ success: true, data: row });
    },
    create: async (req, res) => {
      const row = await service.create(req.body, {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: row });
    },
    update: async (req, res) => {
      const row = await service.update(req.params.id, req.body, {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(200).json({ success: true, data: row });
    },
    remove: async (req, res) => {
      const row = await service.remove(req.params.id, {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(200).json({ success: true, data: row });
    },
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * @param {Record<string, unknown>} query
 * @param {{
 *   defaultSort?: string,
 *   defaultOrder?: 'asc' | 'desc',
 *   allowedSorts?: string[],
 *   maxLimit?: number,
 *   filterKeys?: string[],
 * }} [options]
 */
export function parsePaginationQuery(query = {}, options = {}) {
  const {
    defaultSort = 'createdAt',
    defaultOrder = 'desc',
    allowedSorts,
    maxLimit = MAX_LIMIT,
    filterKeys = [],
  } = options;

  const page = Math.max(1, Number.parseInt(String(query.page ?? DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  let limit = Number.parseInt(String(query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  limit = Math.min(Math.max(1, limit), maxLimit);

  const search =
    typeof query.search === 'string' && query.search.trim()
      ? query.search.trim()
      : typeof query.q === 'string' && query.q.trim()
        ? query.q.trim()
        : '';

  let sort = typeof query.sort === 'string' && query.sort ? query.sort : defaultSort;
  if (allowedSorts?.length && !allowedSorts.includes(sort)) {
    sort = defaultSort;
  }

  const orderRaw = String(query.order ?? query.sortOrder ?? defaultOrder).toLowerCase();
  const order = orderRaw === 'asc' ? 'asc' : 'desc';

  /** @type {Record<string, unknown>} */
  const filters = {};
  for (const key of filterKeys) {
    if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
      filters[key] = query[key];
    }
  }

  // Also collect filter[key] style params
  for (const [key, value] of Object.entries(query)) {
    const match = /^filter\[(.+)\]$/.exec(key);
    if (match && value !== undefined && value !== null && value !== '') {
      filters[match[1]] = value;
    }
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    search,
    sort,
    order,
    filters,
    orderBy: { [sort]: order },
  };
}

/**
 * Build Prisma args from a parsed pagination object.
 * @param {ReturnType<typeof parsePaginationQuery>} parsed
 * @param {import('@prisma/client').Prisma.JsonObject | Record<string, unknown>} [where]
 */
export function toPrismaQuery(parsed, where = {}) {
  return {
    skip: parsed.skip,
    take: parsed.take,
    orderBy: parsed.orderBy,
    where,
  };
}

/**
 * @param {number} total
 * @param {{ page: number, limit: number }} pagination
 */
export function buildPaginationMeta(total, { page, limit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export default {
  parsePaginationQuery,
  toPrismaQuery,
  buildPaginationMeta,
};

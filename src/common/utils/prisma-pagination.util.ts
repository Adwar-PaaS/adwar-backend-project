import { PaginationOptions } from '../interfaces/pagination-options.interface';

export function buildPrismaPagination(options: PaginationOptions) {
  const {
    page = 1,
    limit = 10,
    search,
    searchableFields = [],
    sort,
    filter = {},
  } = options;

  const skip = (page - 1) * limit;
  const take = limit;

  const where = {
    ...filter,
    ...(search && searchableFields.length
      ? {
          OR: searchableFields.map((field) => ({
            [field]: { contains: search, mode: 'insensitive' },
          })),
        }
      : {}),
  };

  return {
    skip,
    take,
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: sort,
  };
}

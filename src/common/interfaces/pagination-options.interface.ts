export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchableFields?: string[];
  sort?: Record<string, 'asc' | 'desc'>;
  filter?: Record<string, any>;
}

export interface PaginationMeta {
  strategy: 'offset' | 'cursor';
  page?: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

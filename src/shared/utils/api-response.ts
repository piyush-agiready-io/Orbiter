import type { ErrorCode, ApiSuccessResponse, ApiErrorResponse } from '@/shared/types/api.types';

export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function paginatedSuccess<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
): ApiSuccessResponse<T[]> {
  const { page, limit, total } = pagination;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    success: true,
    data,
    meta: { page, limit, total, totalPages },
  };
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
}

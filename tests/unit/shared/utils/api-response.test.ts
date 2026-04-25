import { apiSuccess, apiError, paginatedSuccess } from '@/shared/utils/api-response';

describe('apiSuccess', () => {
  it('wraps data in standard success format', () => {
    const result = apiSuccess({ id: '1', name: 'Test' });
    expect(result).toEqual({
      success: true,
      data: { id: '1', name: 'Test' },
    });
  });
});

describe('paginatedSuccess', () => {
  it('includes meta with pagination info', () => {
    const result = paginatedSuccess([{ id: '1' }], { page: 1, limit: 20, total: 45 });
    expect(result).toEqual({
      success: true,
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
    });
  });

  it('calculates totalPages correctly for zero results', () => {
    const result = paginatedSuccess([], { page: 1, limit: 10, total: 0 });
    expect(result.meta!.totalPages).toBe(0);
  });
});

describe('apiError', () => {
  it('wraps error in standard error format', () => {
    const result = apiError('VALIDATION_ERROR', 'Invalid input');
    expect(result).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    });
  });

  it('includes optional details', () => {
    const details = [{ field: 'email', message: 'Required' }];
    const result = apiError('VALIDATION_ERROR', 'Invalid input', details);
    expect(result.error.details).toEqual(details);
  });
});

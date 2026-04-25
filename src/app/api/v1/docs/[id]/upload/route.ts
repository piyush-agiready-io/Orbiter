import { apiHandler } from '@/shared/middleware/api-handler';

// This endpoint is deprecated. Use /api/v1/upload instead.
// Kept for backward compatibility — redirects to the main upload endpoint.
export const POST = apiHandler({
  handler: async (_req, _ctx) => {
    return {
      data: null,
      error: {
        code: 'DEPRECATED',
        message: 'Use /api/v1/upload instead for file uploads.',
      },
      status: 410,
    };
  },
});

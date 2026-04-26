import { apiHandler } from '@/shared/middleware/api-handler';
import { isStorageConfigured, getPresignedUploadUrl, buildInlineDataUrl } from '@/shared/lib/storage';

export const POST = apiHandler({
  handler: async (req, { user }) => {
    const body = await req.json();
    const { filename, contentType, base64Data } = body;

    if (!filename || typeof filename !== 'string') {
      return { data: null, status: 400 };
    }

    if (base64Data && typeof base64Data === 'string') {
      const { fileKey, publicUrl } = buildInlineDataUrl(user.userId, filename, base64Data, contentType);
      return {
        data: {
          uploadUrl: null,
          fileKey,
          publicUrl,
          fallback: true,
        },
        status: 200,
      };
    }

    if (!isStorageConfigured()) {
      console.error('[upload] R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY, and R2_SECRET_KEY env vars.');
      return {
        data: null,
        error: {
          code: 'R2_NOT_CONFIGURED',
          message: 'File storage is not configured. Use base64 fallback by providing base64Data in the request body.',
        },
        status: 503,
      };
    }

    try {
      const result = await getPresignedUploadUrl(user.userId, filename, contentType);
      return {
        data: result,
        status: 200,
      };
    } catch (err) {
      console.error('[upload] R2 presign error:', err);
      return {
        data: null,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to generate upload URL. R2 may be misconfigured.',
        },
        status: 500,
      };
    }
  },
});

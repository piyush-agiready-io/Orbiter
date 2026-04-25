import { apiHandler } from '@/shared/middleware/api-handler';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';
import { nanoid } from 'nanoid';

function isR2Configured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY && env.R2_SECRET_KEY);
}

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    },
  });
}

export const POST = apiHandler({
  handler: async (req, { user }) => {
    const body = await req.json();
    const { filename, contentType, base64Data } = body;

    if (!filename || typeof filename !== 'string') {
      return { data: null, status: 400 };
    }

    // If base64Data is provided, store directly (fallback mode)
    if (base64Data && typeof base64Data === 'string') {
      const dataUrl = `data:${contentType || 'application/octet-stream'};base64,${base64Data}`;
      return {
        data: {
          uploadUrl: null,
          fileKey: `inline/${user.userId}/${nanoid()}-${filename}`,
          publicUrl: dataUrl,
          fallback: true,
        },
        status: 200,
      };
    }

    // R2 presigned URL mode
    if (!isR2Configured()) {
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
      const s3 = getS3Client();
      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `uploads/${user.userId}/${nanoid()}-${sanitized}`;

      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
      const publicUrl = env.R2_PUBLIC_URL
        ? `${env.R2_PUBLIC_URL}/${key}`
        : uploadUrl.split('?')[0];

      return {
        data: { uploadUrl, fileKey: key, publicUrl },
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

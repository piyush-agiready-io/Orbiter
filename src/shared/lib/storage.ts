import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';
import { nanoid } from 'nanoid';

let s3Client: S3Client | null = null;

export function isStorageConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY && env.R2_SECRET_KEY);
}

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY,
        secretAccessKey: env.R2_SECRET_KEY,
      },
    });
  }
  return s3Client;
}

export async function getPresignedUploadUrl(
  userId: string,
  filename: string,
  contentType?: string,
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const s3 = getClient();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${userId}/${nanoid()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${key}`
    : uploadUrl.split('?')[0];

  return { uploadUrl, fileKey: key, publicUrl };
}

export function buildInlineDataUrl(
  userId: string,
  filename: string,
  base64Data: string,
  contentType?: string,
): { fileKey: string; publicUrl: string } {
  const dataUrl = `data:${contentType || 'application/octet-stream'};base64,${base64Data}`;
  return {
    fileKey: `inline/${userId}/${nanoid()}-${filename}`,
    publicUrl: dataUrl,
  };
}

import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(64, 'ENCRYPTION_KEY must be 32 bytes hex (64 chars)'),
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY: z.string().optional().default(''),
  R2_SECRET_KEY: z.string().optional().default(''),
  R2_BUCKET_NAME: z.string().optional().default('orbiter-uploads'),
  R2_PUBLIC_URL: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Orbiter <noreply@omrajpal.tech>'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  DEEPGRAM_API_KEY: z.string().optional().default(''),
  CHROME_EXTENSION_ID: z.string().optional().default(''),
  OPENAI_CLIENT_ID: z.string().default('app_EMoamEEZ73f0CkXaXp7hrann'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
  INNGEST_EVENT_KEY: z.string().optional().default(''),
  INNGEST_SIGNING_KEY: z.string().optional().default(''),
  INNGEST_SIGNING_KEY_FALLBACK: z.string().optional().default(''),
  INNGEST_SERVE_HOST: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function validateEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const validated = validateEnv();
    return validated[prop as keyof Env];
  },
});

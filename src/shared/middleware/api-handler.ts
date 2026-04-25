import { NextRequest, NextResponse } from 'next/server';
import { ZodType } from 'zod';
import { connectDB } from '@/shared/database/connection';
import { authenticate, AuthError, type AuthenticatedUser } from './auth';
import { validateBody, validateQuery, ValidationError } from './validate';
import { ForbiddenError } from './role-guard';
import { RateLimitError } from './rate-limiter';
import { apiSuccess, apiError } from '@/shared/utils/api-response';
import { ERROR_STATUS_MAP } from '@/shared/types/api.types';
import { env } from '@/config/env';

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigins = [
    env.NEXT_PUBLIC_APP_URL,
    env.CHROME_EXTENSION_ID ? `chrome-extension://${env.CHROME_EXTENSION_ID}` : '',
  ].filter(Boolean);

  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : env.NEXT_PUBLIC_APP_URL,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function addCorsHeaders(response: NextResponse, req: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(req);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

interface HandlerContext {
  params: Record<string, string>;
  user: AuthenticatedUser;
  body: unknown;
  query: unknown;
}

interface HandlerConfig {
  auth?: boolean; // default: true
  middleware?: ((user: AuthenticatedUser) => void)[];
  validate?: {
    body?: ZodType;
    query?: ZodType;
  };
  rateLimit?: (req: NextRequest) => void;
  handler: (
    req: NextRequest,
    ctx: HandlerContext,
  ) => Promise<{ data?: unknown; status?: number }>;
}

export function apiHandler(config: HandlerConfig) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    if (req.method === 'OPTIONS') {
      return addCorsHeaders(new NextResponse(null, { status: 204 }), req);
    }

    try {
      await connectDB();

      if (config.rateLimit) config.rateLimit(req);

      let user: AuthenticatedUser = { userId: '', role: 'internal' };
      if (config.auth !== false) {
        user = await authenticate(req);
      }

      if (config.middleware) {
        for (const mw of config.middleware) {
          mw(user);
        }
      }

      let body: unknown;
      let query: unknown;
      if (config.validate?.body) {
        const rawBody = await req.json().catch(() => ({}));
        body = validateBody(config.validate.body, rawBody);
      }
      if (config.validate?.query) {
        query = validateQuery(config.validate.query, req.nextUrl.searchParams);
      }

      const params = await context.params;
      const result = await config.handler(req, { params, user, body, query });
      const status = result.status ?? 200;

      return addCorsHeaders(NextResponse.json(apiSuccess(result.data), { status }), req);
    } catch (error) {
      return addCorsHeaders(handleError(error), req);
    }
  };
}

function handleError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      apiError('UNAUTHORIZED', error.message),
      { status: ERROR_STATUS_MAP.UNAUTHORIZED },
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      apiError('FORBIDDEN', error.message),
      { status: ERROR_STATUS_MAP.FORBIDDEN },
    );
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', error.message, error.details),
      { status: ERROR_STATUS_MAP.VALIDATION_ERROR },
    );
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      apiError('RATE_LIMITED', error.message),
      { status: ERROR_STATUS_MAP.RATE_LIMITED },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      apiError('NOT_FOUND', error.message),
      { status: ERROR_STATUS_MAP.NOT_FOUND },
    );
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      apiError('CONFLICT', error.message),
      { status: ERROR_STATUS_MAP.CONFLICT },
    );
  }

  console.error('Unhandled error:', error);
  return NextResponse.json(
    apiError('INTERNAL_ERROR', 'An unexpected error occurred'),
    { status: ERROR_STATUS_MAP.INTERNAL_ERROR },
  );
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

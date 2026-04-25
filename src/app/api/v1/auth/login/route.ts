import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { AuthService } from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.validator';
import { apiSuccess, apiError } from '@/shared/utils/api-response';
import { AuthError } from '@/shared/middleware/auth';
import { ValidationError, validateBody } from '@/shared/middleware/validate';
import { rateLimit, RateLimitError } from '@/shared/middleware/rate-limiter';

const authRateLimit = rateLimit(10, 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    authRateLimit(req);
    await connectDB();
    const rawBody = await req.json().catch(() => ({}));
    const body = validateBody(loginSchema, rawBody);
    const result = await AuthService.login(body);

    const cookie = serialize('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });

    const response = NextResponse.json(
      apiSuccess({ user: result.user, accessToken: result.accessToken }),
      { status: 200 },
    );
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        apiError('RATE_LIMITED', 'Too many requests'),
        { status: 429 },
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', error.message, error.details),
        { status: 400 },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json(
        apiError('UNAUTHORIZED', error.message),
        { status: 401 },
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'An unexpected error occurred'),
      { status: 500 },
    );
  }
}

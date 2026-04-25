import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { verifyRefreshToken, signAccessToken } from '@/shared/lib/tokens';
import { User } from '@/modules/users/user.model';
import { apiSuccess, apiError } from '@/shared/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        apiError('UNAUTHORIZED', 'No refresh token provided'),
        { status: 401 },
      );
    }

    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refreshToken;
    if (!refreshToken) {
      return NextResponse.json(
        apiError('UNAUTHORIZED', 'No refresh token provided'),
        { status: 401 },
      );
    }

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        apiError('UNAUTHORIZED', 'Invalid or expired refresh token'),
        { status: 401 },
      );
    }

    const user = await User.findOne({ _id: payload.userId, isActive: true });
    if (!user) {
      return NextResponse.json(
        apiError('UNAUTHORIZED', 'User not found or inactive'),
        { status: 401 },
      );
    }

    const accessToken = await signAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return NextResponse.json(
      apiSuccess({ accessToken, user: user.toJSON() }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      apiError('INTERNAL_ERROR', 'An unexpected error occurred'),
      { status: 500 },
    );
  }
}

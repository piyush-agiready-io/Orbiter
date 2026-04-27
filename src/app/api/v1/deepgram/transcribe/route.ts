import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/shared/database/connection';
import { DeepgramService } from '@/modules/deepgram/deepgram.service';
import { authenticate, AuthError } from '@/shared/middleware/auth';
import { apiSuccess, apiError } from '@/shared/utils/api-response';

// Custom handler (not via apiHandler) because we need access to the raw
// request body as ArrayBuffer rather than parsed JSON.
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    try {
      await authenticate(req);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          apiError('UNAUTHORIZED', err.message),
          { status: 401 },
        );
      }
      throw err;
    }

    const contentType = req.headers.get('content-type') || 'audio/webm';
    const audio = await req.arrayBuffer();

    if (!audio.byteLength) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', 'No audio data received'),
        { status: 400 },
      );
    }

    const transcript = await DeepgramService.transcribe(audio, contentType);

    return NextResponse.json(apiSuccess({ transcript }), { status: 200 });
  } catch (error) {
    console.error('Deepgram transcribe error:', error);
    const message =
      error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json(
      apiError('INTERNAL_ERROR', message),
      { status: 500 },
    );
  }
}

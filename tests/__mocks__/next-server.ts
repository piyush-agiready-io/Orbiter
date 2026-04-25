class MockNextRequest extends Request {
  nextUrl: URL;

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    this.nextUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
  }
}

class MockNextResponse extends Response {
  static json(body: unknown, init?: ResponseInit): MockNextResponse {
    const jsonBody = JSON.stringify(body);
    return new MockNextResponse(jsonBody, {
      ...init,
      headers: {
        ...((init?.headers as Record<string, string>) ?? {}),
        'Content-Type': 'application/json',
      },
    });
  }
}

export const NextRequest = MockNextRequest;
export const NextResponse = MockNextResponse;

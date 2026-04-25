/* eslint-disable @typescript-eslint/no-explicit-any */

export async function callRoute(
  routeModule: Record<string, any>,
  method: string,
  opts: {
    token: string;
    params?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  },
) {
  const url = new URL('http://localhost:3000/api/v1/test');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const req = new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  (req as any).nextUrl = url;
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: (res as any).status, body: await (res as any).json() };
}

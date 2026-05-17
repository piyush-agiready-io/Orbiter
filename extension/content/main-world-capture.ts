/**
 * Orbiter MAIN-world capture script.
 *
 * Runs in the page's MAIN world (per manifest `"world": "MAIN"`) so it can
 * intercept the page's own `window.console`, `window.fetch` and
 * `XMLHttpRequest` — which an ISOLATED-world content script cannot do
 * because ISOLATED and MAIN have separate JS contexts.
 *
 * Captured events are pushed into ring buffers AND posted to the ISOLATED
 * content script via `window.postMessage`. The ISOLATED side filters by
 * `event.data.source === 'orbiter-capture'` and forwards to the popup on
 * demand (`CAPTURE_PAGE_DATA` message).
 *
 * No imports — bundled as a self-contained IIFE so it can be injected
 * without ES module loading (MV3 MAIN-world scripts don't support modules).
 */

(function orbiterCapture(): void {
  const MAGIC = 'orbiter-capture';
  const MAX_CONSOLE = 100;
  const MAX_NETWORK = 100;
  const MAX_LOG_LENGTH = 500;
  // Idempotency guard: re-injecting (e.g. on extension reload) would otherwise
  // double-wrap the originals and we'd capture each event twice.
  const w = window as Window & { __orbiterCaptureInstalled?: boolean };
  if (w.__orbiterCaptureInstalled) return;
  w.__orbiterCaptureInstalled = true;

  type ConsoleLevel = 'error' | 'warn' | 'info';
  interface ConsoleEntry {
    level: ConsoleLevel;
    message: string;
    ts: number;
  }
  interface NetworkEntry {
    method: string;
    url: string;
    status: number;
    durationMs: number;
    ts: number;
  }

  const consoleBuf: ConsoleEntry[] = [];
  const networkBuf: NetworkEntry[] = [];

  function pushConsole(entry: ConsoleEntry): void {
    consoleBuf.push(entry);
    if (consoleBuf.length > MAX_CONSOLE) consoleBuf.shift();
    post('console', entry);
  }

  function pushNetwork(entry: NetworkEntry): void {
    networkBuf.push(entry);
    if (networkBuf.length > MAX_NETWORK) networkBuf.shift();
    post('network', entry);
  }

  function post(kind: 'console' | 'network', entry: ConsoleEntry | NetworkEntry): void {
    try {
      window.postMessage({ source: MAGIC, kind, entry }, '*');
    } catch {
      // postMessage can't fail on same-window dispatch, but keep guard for safety.
    }
  }

  function stringify(args: unknown[]): string {
    return args
      .map((a) => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ')
      .slice(0, MAX_LOG_LENGTH);
  }

  // Redact query-string values whose key matches token|key|secret|auth (case-
  // insensitive). Path and other params are preserved.
  const REDACT_RE = /token|key|secret|auth/i;
  function redact(rawUrl: string): string {
    try {
      const u = new URL(rawUrl, window.location.href);
      let changed = false;
      u.searchParams.forEach((_v, k) => {
        if (REDACT_RE.test(k)) {
          u.searchParams.set(k, '***');
          changed = true;
        }
      });
      return changed ? u.toString() : rawUrl;
    } catch {
      return rawUrl;
    }
  }

  // ---- console.error / .warn / .info ---------------------------------------
  (['error', 'warn', 'info'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = function patched(...args: unknown[]): void {
      try {
        pushConsole({ level, message: stringify(args), ts: Date.now() });
      } catch {
        // Never let our capture break the page.
      }
      original(...args);
    };
  });

  // window.onerror / unhandledrejection fire in MAIN world for real page errors.
  window.addEventListener('error', (event) => {
    try {
      const where = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
      pushConsole({ level: 'error', message: `${event.message}${where}`, ts: Date.now() });
    } catch {}
  });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason instanceof Error
        ? event.reason.stack || event.reason.message
        : stringify([event.reason]);
      pushConsole({ level: 'error', message: `Unhandled rejection: ${reason}`, ts: Date.now() });
    } catch {}
  });

  // ---- fetch ----------------------------------------------------------------
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const started = performance.now();
    const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
    const rawUrl = input instanceof Request ? input.url : input instanceof URL ? input.toString() : String(input);
    const url = redact(rawUrl);
    const ts = Date.now();
    try {
      const res = await originalFetch(input as RequestInfo, init);
      pushNetwork({
        method,
        url,
        status: res.status,
        durationMs: Math.round(performance.now() - started),
        ts,
      });
      return res;
    } catch (err) {
      pushNetwork({
        method,
        url,
        status: 0,
        durationMs: Math.round(performance.now() - started),
        ts,
      });
      throw err;
    }
  };

  // ---- XMLHttpRequest -------------------------------------------------------
  const XHRProto = XMLHttpRequest.prototype;
  const originalOpen = XHRProto.open;
  const originalSend = XHRProto.send;

  interface PatchedXHR extends XMLHttpRequest {
    __orbiter?: { method: string; url: string; ts: number; started: number };
  }

  XHRProto.open = function patchedOpen(
    this: PatchedXHR,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    try {
      this.__orbiter = {
        method: (method || 'GET').toUpperCase(),
        url: redact(typeof url === 'string' ? url : url.toString()),
        ts: Date.now(),
        started: 0,
      };
    } catch {}
    // Use apply so we forward exactly what we received without arity surprises.
    return originalOpen.apply(this, arguments as unknown as Parameters<typeof originalOpen>);
  };

  XHRProto.send = function patchedSend(this: PatchedXHR, body?: Document | XMLHttpRequestBodyInit | null): void {
    const meta = this.__orbiter;
    if (meta) {
      meta.started = performance.now();
      const finalize = (status: number): void => {
        try {
          pushNetwork({
            method: meta.method,
            url: meta.url,
            status,
            durationMs: Math.round(performance.now() - meta.started),
            ts: meta.ts,
          });
        } catch {}
      };
      this.addEventListener('loadend', () => finalize(this.status), { once: true });
      this.addEventListener('error', () => finalize(0), { once: true });
      this.addEventListener('abort', () => finalize(0), { once: true });
      this.addEventListener('timeout', () => finalize(0), { once: true });
    }
    return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
  };
})();

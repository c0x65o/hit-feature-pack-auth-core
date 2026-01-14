import { NextRequest, NextResponse } from 'next/server';
import { checkActionPermissionV2 } from './auth-proxy-v2';

export type ActionCheckResult = {
  ok: boolean;
  source?: string;
};

export type ActionCheckOptions = {
  debug?: boolean;
  logPrefix?: string;
};

type AuthBackendMode = 'python' | 'ts';

const actionCheckCache = new WeakMap<NextRequest, Map<string, ActionCheckResult>>();

function getAuthBackendMode(): AuthBackendMode {
  const raw = String(process.env.HIT_AUTH_BACKEND || '').trim().toLowerCase();
  if (raw === 'python') return 'python';
  return 'ts';
}

function getLogPrefix(options?: ActionCheckOptions): string {
  const raw = String(options?.logPrefix || '').trim();
  return raw || 'Authz';
}

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('hit_token')?.value || null;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const rawCookie = request.headers.get('cookie') || '';
  if (rawCookie) {
    const parts = rawCookie.split(';').map((c) => c.trim());
    for (const p of parts) {
      const eq = p.indexOf('=');
      if (eq <= 0) continue;
      const name = p.slice(0, eq);
      const value = p.slice(eq + 1);
      if (name === 'hit_token' && value) return value;
    }
  }

  return null;
}

function baseUrlFromRequest(request: NextRequest): string {
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';
  return `${proto}://${host}`;
}

function getCachedResult(request: NextRequest, actionKey: string): ActionCheckResult | null {
  const map = actionCheckCache.get(request);
  if (!map) return null;
  return map.get(actionKey) || null;
}

function setCachedResult(request: NextRequest, actionKey: string, result: ActionCheckResult) {
  const map = actionCheckCache.get(request) || new Map<string, ActionCheckResult>();
  map.set(actionKey, result);
  actionCheckCache.set(request, map);
}

async function checkActionViaProxy(
  request: NextRequest,
  actionKey: string,
  options?: ActionCheckOptions
): Promise<ActionCheckResult> {
  const debug = options?.debug === true;
  const logPrefix = getLogPrefix(options);
  const token = getTokenFromRequest(request);
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeaderRaw = request.headers.get('authorization') || '';

  if (!token && !cookieHeader && !authHeaderRaw) {
    if (debug) console.log(`[${logPrefix} Action Check] ${actionKey}: No token found`);
    return { ok: false, source: 'unauthenticated' };
  }

  const baseUrl = baseUrlFromRequest(request);
  const url = `${baseUrl}/api/proxy/auth/permissions/actions/check/${encodeURIComponent(actionKey)}`;
  if (debug) console.log(`[${logPrefix} Action Check] ${actionKey}: Checking via ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeaderRaw) {
    headers.Authorization = authHeaderRaw;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (cookieHeader) headers.Cookie = cookieHeader;

  const res = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  }).catch((e) => {
    console.log(`[${logPrefix} Action Check] ${actionKey}: Fetch error:`, e);
    return null;
  });

  if (!res) {
    console.log(`[${logPrefix} Action Check] ${actionKey}: Auth unreachable (no response)`);
    return { ok: false, source: 'auth_unreachable' };
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    console.log(
      `[${logPrefix} Action Check] ${actionKey}: Auth returned status ${res.status}:`,
      errorText
    );
    return { ok: false, source: `auth_status_${res.status}` };
  }

  const json = (await res.json().catch(() => null)) as any;
  const ok = Boolean(json?.has_permission ?? json?.hasPermission ?? false);
  if (debug) {
    console.log(`[${logPrefix} Action Check] ${actionKey}: Result`, {
      ok,
      source: json?.source,
      response: json,
    });
  }
  return { ok, source: String(json?.source || '') || undefined };
}

async function checkActionViaV2(
  request: NextRequest,
  actionKey: string,
  options?: ActionCheckOptions
): Promise<ActionCheckResult> {
  const debug = options?.debug === true;
  const logPrefix = getLogPrefix(options);
  const res = await checkActionPermissionV2(request, actionKey);
  if ('errorResponse' in res) {
    const status = res.errorResponse.status || 500;
    if (debug) {
      console.log(
        `[${logPrefix} Action Check] ${actionKey}: Auth returned status ${status}`
      );
    }
    if (status === 401) return { ok: false, source: 'unauthenticated' };
    return { ok: false, source: `auth_status_${status}` };
  }
  return { ok: res.ok, source: res.source };
}

export async function checkActionPermission(
  request: NextRequest,
  actionKey: string,
  options?: ActionCheckOptions
): Promise<ActionCheckResult> {
  const cached = getCachedResult(request, actionKey);
  if (cached) return cached;

  const backend = getAuthBackendMode();
  const result =
    backend === 'ts'
      ? await checkActionViaV2(request, actionKey, options)
      : await checkActionViaProxy(request, actionKey, options);

  setCachedResult(request, actionKey, result);
  return result;
}

export async function requireActionPermission(
  request: NextRequest,
  actionKey: string,
  options?: ActionCheckOptions
): Promise<NextResponse | null> {
  const result = await checkActionPermission(request, actionKey, options);
  if (result.ok) return null;

  const unauthorized =
    result.source === 'unauthenticated' || result.source === 'auth_status_401';
  const status = unauthorized ? 401 : 403;
  const error = status === 401 ? 'Unauthorized' : 'Not authorized';

  return NextResponse.json(
    {
      error,
      action: actionKey,
    },
    { status }
  );
}

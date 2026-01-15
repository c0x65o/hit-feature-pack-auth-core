import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCoreAction } from '../lib/require-action';
import { getAuthBaseUrl } from '../lib/acl-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getBearerFromRequest(request: NextRequest): string {
  const rawTokenHeader = request.headers.get('x-hit-token-raw') || request.headers.get('X-HIT-Token-Raw');
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cookieToken = request.cookies.get('hit_token')?.value || null;
  const bearer =
    rawTokenHeader && rawTokenHeader.trim()
      ? rawTokenHeader.trim().startsWith('Bearer ')
        ? rawTokenHeader.trim()
        : `Bearer ${rawTokenHeader.trim()}`
      : authHeader && authHeader.trim()
        ? authHeader
        : cookieToken
          ? `Bearer ${cookieToken}`
          : '';
  return bearer;
}

async function authFetch(request: NextRequest, path: string, init: RequestInit) {
  const authUrl = getAuthBaseUrl(request as any);
  if (!authUrl) throw new Error('[auth] Auth base URL not configured');
  const bearer = getBearerFromRequest(request);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = bearer;
  const res = await fetch(`${authUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    credentials: 'include',
  });
  return res;
}

function toUserRow(u: any) {
  const email = String(u?.email || '').trim();
  const pf = (u?.profile_fields || {}) as { first_name?: string; last_name?: string };
  const displayName = [pf.first_name, pf.last_name].filter(Boolean).join(' ').trim();
  const role = String(u?.role || (Array.isArray(u?.roles) ? u.roles?.[0] : '') || 'user');
  return {
    ...u,
    id: email,
    email,
    name: displayName || email,
    role,
    first_name: pf.first_name ?? '',
    last_name: pf.last_name ?? '',
    status: u?.locked ? 'Locked' : 'Active',
  };
}

/**
 * /api/auth/users
 * Mobile entity renderer convention for entityKey=auth.user.
 *
 * Supports:
 * - GET list: ?page&pageSize&search&sortBy&sortOrder
 * - POST create: { email, password, role, first_name, last_name }
 */
export async function GET(request: NextRequest) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10) || 25));
    const search = String(searchParams.get('search') || '').trim().toLowerCase();
    const sortBy = String(searchParams.get('sortBy') || 'created_at').trim();
    const sortOrder = String(searchParams.get('sortOrder') || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc';

    const res = await authFetch(request, '/users', { method: 'GET' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.detail || body?.message || `Failed to fetch users (${res.status})` },
        { status: res.status }
      );
    }

    const raw = await res.json().catch(() => []);
    const arr = Array.isArray(raw) ? raw : [];
    let rows = arr.map(toUserRow);

    if (search) {
      rows = rows.filter((u: any) => {
        const email = String(u?.email || '').toLowerCase();
        const name = String(u?.name || '').toLowerCase();
        return email.includes(search) || name.includes(search);
      });
    }

    const dir = sortOrder === 'asc' ? 1 : -1;
    rows.sort((a: any, b: any) => {
      if (sortBy === 'email') return String(a.email || '').localeCompare(String(b.email || '')) * dir;
      if (sortBy === 'last_login') {
        const av = a.last_login ? new Date(a.last_login).getTime() : -Infinity;
        const bv = b.last_login ? new Date(b.last_login).getTime() : -Infinity;
        return (av - bv) * dir;
      }
      // created_at default
      const av = a.created_at ? new Date(a.created_at).getTime() : -Infinity;
      const bv = b.created_at ? new Date(b.created_at).getTime() : -Infinity;
      return (av - bv) * dir;
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const items = rows.slice(startIdx, startIdx + pageSize);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (e) {
    console.error('[auth] list users error:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '').trim();
    const role = String(body?.role || 'user').trim() || 'user';
    const emailVerified = typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : undefined;
    const firstName = body?.first_name != null ? String(body.first_name).trim() : '';
    const lastName = body?.last_name != null ? String(body.last_name).trim() : '';

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    // Create user
    const payload: Record<string, unknown> = { email, password, roles: [role] };
    if (typeof emailVerified === 'boolean') payload.email_verified = emailVerified;
    const createRes = await authFetch(request, '/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to create user (${createRes.status})` },
        { status: createRes.status }
      );
    }

    // Set profile fields (best-effort)
    if (firstName || lastName) {
      await authFetch(request, `/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({
          profile_fields: {
            ...(firstName ? { first_name: firstName } : {}),
            ...(lastName ? { last_name: lastName } : {}),
          },
        }),
      }).catch(() => null);
    }

    // Return the created user record (best-effort)
    const getRes = await authFetch(request, `/users/${encodeURIComponent(email)}`, { method: 'GET' });
    if (getRes.ok) {
      const u = await getRes.json().catch(() => null);
      if (u) return NextResponse.json(toUserRow(u));
    }
    return NextResponse.json({ id: email, email });
  } catch (e) {
    console.error('[auth] create user error:', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}


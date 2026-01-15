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

function decodeId(id: string): string {
  let out = String(id || '').trim();
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) break;
    try {
      out = decodeURIComponent(out);
    } catch {
      break;
    }
  }
  return out;
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

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const email = decodeId(id);
    const res = await authFetch(request, `/users/${encodeURIComponent(email)}`, { method: 'GET' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.detail || body?.message || `Failed to fetch user (${res.status})` },
        { status: res.status }
      );
    }
    const u = await res.json().catch(() => null);
    return NextResponse.json(toUserRow(u));
  } catch (e) {
    console.error('[auth] get user error:', e);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const email = decodeId(id);
    const body = await request.json().catch(() => ({}));

    // Allow updating a subset of fields used by our schema-driven form
    const role = body?.role != null ? String(body.role).trim() : '';
    const locked = typeof body?.locked === 'boolean' ? body.locked : undefined;
    const emailVerified = typeof body?.email_verified === 'boolean' ? body.email_verified : undefined;
    const firstName = body?.first_name != null ? String(body.first_name).trim() : '';
    const lastName = body?.last_name != null ? String(body.last_name).trim() : '';

    const payload: any = {};
    if (role) payload.role = role;
    if (typeof locked === 'boolean') payload.locked = locked;
    if (typeof emailVerified === 'boolean') payload.email_verified = emailVerified;
    if (firstName || lastName) {
      payload.profile_fields = {
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      };
    }

    const res = await authFetch(request, `/users/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to update user (${res.status})` },
        { status: res.status }
      );
    }

    // Return updated record
    const getRes = await authFetch(request, `/users/${encodeURIComponent(email)}`, { method: 'GET' });
    if (getRes.ok) {
      const u = await getRes.json().catch(() => null);
      return NextResponse.json(toUserRow(u));
    }
    return NextResponse.json({ id: email, email });
  } catch (e) {
    console.error('[auth] update user error:', e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const email = decodeId(id);
    const res = await authFetch(request, `/users/${encodeURIComponent(email)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to delete user (${res.status})` },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth] delete user error:', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCoreAction } from '../lib/require-action';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAuthUrl(): string {
  // Prefer server-only module URL when available; fall back to HIT link env; then to the in-app proxy.
  return process.env.HIT_AUTH_URL || process.env.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
}

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
  const authUrl = getAuthUrl();
  const bearer = getBearerFromRequest(request);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = bearer;
  // Some auth module endpoints require the HIT service token (e.g. admin APIs).
  const serviceToken = process.env.HIT_SERVICE_TOKEN;
  if (serviceToken) headers['X-HIT-Service-Token'] = serviceToken;
  const res = await fetch(`${authUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    credentials: 'include',
  });
  return res;
}

function toGroupRow(g: any) {
  const id = String(g?.id || '').trim();
  const meta = g?.metadata && typeof g.metadata === 'object' ? (g.metadata as any) : {};
  const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
  const segment_key = typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '';
  return {
    ...g,
    id,
    kind,
    segment_key,
  };
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const gid = String(id || '').trim();
    const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, { method: 'GET' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.detail || body?.message || `Failed to fetch group (${res.status})` },
        { status: res.status }
      );
    }
    const g = await res.json().catch(() => null);
    return NextResponse.json(toGroupRow(g));
  } catch (e) {
    console.error('[auth] get group error:', e);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const gid = String(id || '').trim();
    const body = await request.json().catch(() => ({}));

    const name = body?.name != null ? String(body.name).trim() : '';
    const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
    const kind = String(body?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
    const segmentKey = String(body?.segment_key || '').trim();
    if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

    const metadata: Record<string, unknown> = { kind, ...(kind === 'dynamic' && segmentKey ? { segment_key: segmentKey } : {}) };

    const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, metadata }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to update group (${res.status})` },
        { status: res.status }
      );
    }
    const g = await res.json().catch(() => null);
    return NextResponse.json(toGroupRow(g));
  } catch (e) {
    console.error('[auth] update group error:', e);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthCoreAction(request, 'auth-core.admin.access');
  if (gate) return gate;

  try {
    const { id } = await ctx.params;
    const gid = String(id || '').trim();
    const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to delete group (${res.status})` },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth] delete group error:', e);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}


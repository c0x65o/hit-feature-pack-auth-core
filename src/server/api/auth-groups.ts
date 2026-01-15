import { NextRequest, NextResponse } from 'next/server';
import { requireAuthCoreReadScope } from '../lib/require-action';
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

/**
 * /api/auth/groups
 * Mobile entity renderer convention for entityKey=auth.group.
 *
 * Supports:
 * - GET list: ?page&pageSize&search&sortBy&sortOrder
 * - POST create: { name, description, kind, segment_key }
 */
export async function GET(request: NextRequest) {
  const gate = await requireAuthCoreReadScope(request);
  if (gate) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50));
    const search = String(searchParams.get('search') || '').trim().toLowerCase();
    const sortBy = String(searchParams.get('sortBy') || 'updated_at').trim();
    const sortOrder = String(searchParams.get('sortOrder') || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc';

    const res = await authFetch(request, '/admin/groups', { method: 'GET' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.detail || body?.message || `Failed to fetch groups (${res.status})` },
        { status: res.status }
      );
    }

    const raw = await res.json().catch(() => []);
    const arr = Array.isArray(raw) ? raw : [];
    let rows = arr.map(toGroupRow);

    if (search) {
      rows = rows.filter((g: any) => String(g?.name || '').toLowerCase().includes(search));
    }

    const dir = sortOrder === 'asc' ? 1 : -1;
    rows.sort((a: any, b: any) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || '')) * dir;
      if (sortBy === 'user_count') return (Number(a.user_count || 0) - Number(b.user_count || 0)) * dir;
      if (sortBy === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      // updated_at default
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
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
    console.error('[auth] list groups error:', e);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAuthCoreReadScope(request);
  if (gate) return gate;

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
    const kind = String(body?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
    const segmentKey = String(body?.segment_key || '').trim();

    if (!name) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

    const metadata: Record<string, unknown> = { kind, ...(kind === 'dynamic' && segmentKey ? { segment_key: segmentKey } : {}) };

    const res = await authFetch(request, '/admin/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, metadata }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.detail || err?.message || `Failed to create group (${res.status})` },
        { status: res.status }
      );
    }
    const g = await res.json().catch(() => null);
    return NextResponse.json(toGroupRow(g));
  } catch (e) {
    console.error('[auth] create group error:', e);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}


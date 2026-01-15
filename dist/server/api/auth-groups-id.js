import { NextResponse } from 'next/server';
import { requireAuthCoreReadScope } from '../lib/require-action';
import { getAuthBaseUrl } from '../lib/acl-utils';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function getBearerFromRequest(request) {
    const rawTokenHeader = request.headers.get('x-hit-token-raw') || request.headers.get('X-HIT-Token-Raw');
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const cookieToken = request.cookies.get('hit_token')?.value || null;
    const bearer = rawTokenHeader && rawTokenHeader.trim()
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
async function authFetch(request, path, init) {
    const authUrl = getAuthBaseUrl(request);
    if (!authUrl)
        throw new Error('[auth] Auth base URL not configured');
    const bearer = getBearerFromRequest(request);
    const headers = { 'Content-Type': 'application/json' };
    if (bearer)
        headers.Authorization = bearer;
    const res = await fetch(`${authUrl}${path}`, {
        ...init,
        headers: { ...headers, ...(init.headers || {}) },
        credentials: 'include',
    });
    return res;
}
function toGroupRow(g) {
    const id = String(g?.id || '').trim();
    const meta = g?.metadata && typeof g.metadata === 'object' ? g.metadata : {};
    const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
    const segment_key = typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '';
    return {
        ...g,
        id,
        kind,
        segment_key,
    };
}
export async function GET(request, ctx) {
    const gate = await requireAuthCoreReadScope(request);
    if (gate)
        return gate;
    try {
        const { id } = await ctx.params;
        const gid = String(id || '').trim();
        const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, { method: 'GET' });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return NextResponse.json({ error: body?.detail || body?.message || `Failed to fetch group (${res.status})` }, { status: res.status });
        }
        const g = await res.json().catch(() => null);
        return NextResponse.json(toGroupRow(g));
    }
    catch (e) {
        console.error('[auth] get group error:', e);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}
export async function PUT(request, ctx) {
    const gate = await requireAuthCoreReadScope(request);
    if (gate)
        return gate;
    try {
        const { id } = await ctx.params;
        const gid = String(id || '').trim();
        const body = await request.json().catch(() => ({}));
        const name = body?.name != null ? String(body.name).trim() : '';
        const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
        const kind = String(body?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
        const segmentKey = String(body?.segment_key || '').trim();
        if (!name)
            return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
        const metadata = { kind, ...(kind === 'dynamic' && segmentKey ? { segment_key: segmentKey } : {}) };
        const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description, metadata }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || err?.message || `Failed to update group (${res.status})` }, { status: res.status });
        }
        const g = await res.json().catch(() => null);
        return NextResponse.json(toGroupRow(g));
    }
    catch (e) {
        console.error('[auth] update group error:', e);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}
export async function DELETE(request, ctx) {
    const gate = await requireAuthCoreReadScope(request);
    if (gate)
        return gate;
    try {
        const { id } = await ctx.params;
        const gid = String(id || '').trim();
        const res = await authFetch(request, `/admin/groups/${encodeURIComponent(gid)}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || err?.message || `Failed to delete group (${res.status})` }, { status: res.status });
        }
        return NextResponse.json({ ok: true });
    }
    catch (e) {
        console.error('[auth] delete group error:', e);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
//# sourceMappingURL=auth-groups-id.js.map
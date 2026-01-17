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
function toUserRow(u) {
    const email = String(u?.email || '').trim();
    const role = String(u?.role || (Array.isArray(u?.roles) ? u.roles?.[0] : '') || 'user');
    return {
        ...u,
        id: email,
        email,
        name: email,
        role,
        status: u?.locked ? 'Locked' : 'Active',
    };
}
/**
 * /api/auth/users
 * Mobile entity renderer convention for entityKey=auth.user.
 *
 * Supports:
 * - GET list: ?page&pageSize&search&sortBy&sortOrder
 * - POST create: { email, password, role }
 */
export async function GET(request) {
    const gate = await requireAuthCoreReadScope(request);
    if (gate)
        return gate;
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
            return NextResponse.json({ error: body?.detail || body?.message || `Failed to fetch users (${res.status})` }, { status: res.status });
        }
        const raw = await res.json().catch(() => []);
        const arr = Array.isArray(raw) ? raw : [];
        let rows = arr.map(toUserRow);
        if (search) {
            rows = rows.filter((u) => {
                const email = String(u?.email || '').toLowerCase();
                const name = String(u?.name || '').toLowerCase();
                return email.includes(search) || name.includes(search);
            });
        }
        const dir = sortOrder === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            if (sortBy === 'email')
                return String(a.email || '').localeCompare(String(b.email || '')) * dir;
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
    }
    catch (e) {
        console.error('[auth] list users error:', e);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
export async function POST(request) {
    const gate = await requireAuthCoreReadScope(request);
    if (gate)
        return gate;
    try {
        const body = await request.json().catch(() => ({}));
        const email = String(body?.email || '').trim();
        const password = String(body?.password || '').trim();
        const role = String(body?.role || 'user').trim() || 'user';
        const emailVerified = typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : undefined;
        if (!email)
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        if (!password)
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        // Create user
        const payload = { email, password, roles: [role] };
        if (typeof emailVerified === 'boolean')
            payload.email_verified = emailVerified;
        const createRes = await authFetch(request, '/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || err?.message || `Failed to create user (${createRes.status})` }, { status: createRes.status });
        }
        // Return the created user record (best-effort)
        const getRes = await authFetch(request, `/users/${encodeURIComponent(email)}`, { method: 'GET' });
        if (getRes.ok) {
            const u = await getRes.json().catch(() => null);
            if (u)
                return NextResponse.json(toUserRow(u));
        }
        return NextResponse.json({ id: email, email });
    }
    catch (e) {
        console.error('[auth] create user error:', e);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
//# sourceMappingURL=auth-users.js.map
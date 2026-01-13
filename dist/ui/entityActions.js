'use client';
function getAuthUrl() {
    try {
        if (typeof window !== 'undefined') {
            const win = window;
            return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
        }
    }
    catch {
        // ignore
    }
    return '/api/proxy/auth';
}
function getAuthHeaders() {
    if (typeof window === 'undefined')
        return {};
    const token = localStorage.getItem('hit_token');
    if (token)
        return { Authorization: `Bearer ${token}` };
    return {};
}
async function authFetch(path, init) {
    const authUrl = getAuthUrl();
    const url = `${authUrl}${path}`;
    const res = await fetch(url, {
        ...init,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...(init.headers || {}),
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.detail || body?.message || `Request failed (${res.status})`;
        throw new Error(String(msg));
    }
    if (res.status === 204 || res.status === 205 || res.status === 304)
        return null;
    const textLen = res.headers.get('content-length');
    if (textLen === '0')
        return null;
    return await res.json().catch(() => null);
}
function setAuthToken(token) {
    if (typeof window === 'undefined')
        return;
    localStorage.setItem('hit_token', token);
    // Best-effort cookie max-age from JWT exp (falls back to 1 hour).
    let maxAge = 3600;
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp) {
                maxAge = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
            }
        }
    }
    catch {
        // ignore
    }
    document.cookie = `hit_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
// Action handlers (schema-driven header actions)
const handlers = {
    'auth.assumeUser': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        // Stash admin token so the shell can offer a quick toggle back.
        const originalToken = typeof window !== 'undefined' ? localStorage.getItem('hit_token') : null;
        if (originalToken && typeof window !== 'undefined') {
            localStorage.setItem('hit_token_original', originalToken);
            localStorage.setItem('hit_last_impersonated_email', email);
        }
        const res = await authFetch('/impersonate/start', {
            method: 'POST',
            body: JSON.stringify({ user_email: email }),
        });
        const token = res?.token ? String(res.token) : '';
        if (!token)
            throw new Error('Impersonation did not return a token');
        setAuthToken(token);
        if (typeof window !== 'undefined')
            window.location.href = '/';
    },
    'auth.verifyEmail': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        await authFetch(`/admin/users/${encodeURIComponent(email)}/verify`, { method: 'PUT' });
    },
    'auth.resendVerification': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        await authFetch(`/admin/users/${encodeURIComponent(email)}/resend-verification`, { method: 'POST' });
    },
    'auth.resetPasswordEmail': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        await authFetch(`/admin/users/${encodeURIComponent(email)}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ send_email: true }),
        });
    },
    'auth.lockUser': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        await authFetch(`/users/${encodeURIComponent(email)}`, { method: 'PUT', body: JSON.stringify({ locked: true }) });
    },
    'auth.unlockUser': async ({ record }) => {
        const email = String(record?.email || record?.id || '').trim();
        if (!email)
            throw new Error('Missing user email');
        await authFetch(`/users/${encodeURIComponent(email)}`, { method: 'PUT', body: JSON.stringify({ locked: false }) });
    },
};
export function getEntityActionHandler(handlerId) {
    return handlers[handlerId];
}
//# sourceMappingURL=entityActions.js.map
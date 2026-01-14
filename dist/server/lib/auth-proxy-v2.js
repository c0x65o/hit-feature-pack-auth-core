import { NextResponse } from 'next/server';
import { HIT_CONFIG } from '@/lib/hit-config.generated';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { sendMagicLinkEmail, sendPasswordResetEmail, sendVerifyEmail, } from './email-adapter';
function json(data, init) {
    return NextResponse.json(data, {
        status: init?.status ?? 200,
        headers: { 'X-Proxied-From': 'auth-v2', ...(init?.headers || {}) },
    });
}
function err(detail, status) {
    return json({ detail }, { status });
}
function normalizeBool(v, fallback) {
    return typeof v === 'boolean' ? v : fallback;
}
function normalizeStringArray(v) {
    if (!Array.isArray(v))
        return [];
    return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
}
function base64UrlToBase64(s) {
    let out = (s || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = out.length % 4;
    if (pad)
        out += '='.repeat(4 - pad);
    return out;
}
function base64ToBase64Url(s) {
    return (s || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlEncode(buf) {
    return base64ToBase64Url(buf.toString('base64'));
}
function frontendBaseUrlFromRequest(req) {
    const hdr = req.headers.get('x-frontend-base-url');
    if (hdr && String(hdr).trim())
        return String(hdr).trim();
    const proto = req.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    return host ? `${proto}://${host}` : null;
}
function parseJwtClaims(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payloadB64 = base64UrlToBase64(parts[1]);
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
        const exp = payload.exp;
        if (typeof exp === 'number' && exp * 1000 < Date.now())
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
function getJwtSecret() {
    const s = String(process.env.HIT_AUTH_JWT_SECRET || '').trim();
    return s ? s : null;
}
function signJwtHmac(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf8'));
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
    const msg = `${headerB64}.${payloadB64}`;
    const sig = crypto.createHmac('sha256', secret).update(msg).digest();
    const sigB64 = base64UrlEncode(sig);
    return `${msg}.${sigB64}`;
}
function verifyJwtHmac(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    const [h, p, s] = parts;
    if (!h || !p || !s)
        return null;
    const msg = `${h}.${p}`;
    const expected = base64UrlEncode(crypto.createHmac('sha256', secret).update(msg).digest());
    // constant-time compare
    const a = Buffer.from(expected);
    const b = Buffer.from(s);
    if (a.length !== b.length)
        return null;
    if (!crypto.timingSafeEqual(a, b))
        return null;
    return parseJwtClaims(token);
}
function extractBearer(req) {
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer '))
        return auth.slice(7).trim();
    const cookieToken = req.cookies.get('hit_token')?.value;
    return cookieToken || null;
}
function getClientIp(req) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0]?.trim();
        if (ip)
            return ip;
    }
    const real = req.headers.get('x-real-ip');
    if (real)
        return real.trim();
    return null;
}
function requireUser(req) {
    const token = extractBearer(req);
    if (!token)
        return err('Authentication required', 401);
    const secret = getJwtSecret();
    if (!secret)
        return err('Auth not configured: HIT_AUTH_JWT_SECRET is missing', 500);
    const claims = verifyJwtHmac(token, secret);
    if (!claims)
        return err('Authentication required', 401);
    const email = (typeof claims.email === 'string' && String(claims.email).trim()) ||
        (typeof claims.sub === 'string' && String(claims.sub).trim()) ||
        '';
    if (!email)
        return err('Authentication required', 401);
    const roles = Array.isArray(claims.roles) ? claims.roles : [];
    const role = typeof claims.role === 'string' ? String(claims.role) : '';
    const out = roles.map((r) => String(r)).filter(Boolean);
    if (role)
        out.push(role);
    return { email: email.toLowerCase(), roles: out.map((r) => r.toLowerCase()) };
}
function requireAdmin(req) {
    const u = requireUser(req);
    if (u instanceof NextResponse)
        return u;
    const normalized = u.roles;
    const ok = normalized.includes('admin');
    if (!ok)
        return err('Admin access required', 403);
    return null;
}
function buildFeaturesFromConfig() {
    const auth = HIT_CONFIG?.auth ?? {};
    // This matches the shape the legacy Python module returns: { features: { ...snake_case... } }.
    // We derive it purely from app-local build config (hit.yaml -> hit-config.generated).
    return {
        allow_signup: normalizeBool(auth.allowSignup, false),
        password_login: normalizeBool(auth.passwordLogin, true),
        password_reset: normalizeBool(auth.passwordReset, true),
        magic_link_login: normalizeBool(auth.magicLinkLogin, false),
        email_verification: normalizeBool(auth.emailVerification, true),
        two_factor_auth: normalizeBool(auth.twoFactorAuth, false),
        oauth_providers: normalizeStringArray(auth.socialProviders),
        // Groups: V2 supports static groups, but does NOT support dynamic/segment-backed groups.
        // Keep the boolean for UI compatibility; hard-disable dynamic groups.
        user_groups_enabled: normalizeBool(auth.userGroupsEnabled, true),
        dynamic_groups_enabled: false,
        // Roles: V2 is intentionally simple.
        available_roles: ['admin', 'user'],
        // Admin tooling.
        admin_impersonation: true,
    };
}
function getAllowSignupFromConfig() {
    const auth = HIT_CONFIG?.auth ?? {};
    return normalizeBool(auth.allowSignup, false);
}
function getEmailVerificationEnabledFromConfig() {
    const auth = HIT_CONFIG?.auth ?? {};
    return normalizeBool(auth.emailVerification, true);
}
function getMagicLinkEnabledFromConfig() {
    const auth = HIT_CONFIG?.auth ?? {};
    return normalizeBool(auth.magicLinkLogin, false);
}
// Node's `promisify(crypto.scrypt)` loses the overload that accepts `options`, which we use.
// Wrap it ourselves so TS is happy and we can pass N/r/p.
function scryptAsync(password, salt, keyLen, options) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLen, options, (err, derivedKey) => {
            if (err)
                return reject(err);
            resolve(derivedKey);
        });
    });
}
async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const N = 16384;
    const r = 8;
    const p = 1;
    const keyLen = 64;
    const dk = await scryptAsync(password, salt, keyLen, { N, r, p });
    return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${dk.toString('base64')}`;
}
async function verifyPassword(password, stored) {
    try {
        const parts = String(stored || '').split('$');
        let kind = '';
        let nStr = '';
        let rStr = '';
        let pStr = '';
        let saltB64 = '';
        let dkB64 = '';
        if (parts.length === 7) {
            [kind, , nStr, rStr, pStr, saltB64, dkB64] = parts;
        }
        else if (parts.length === 6) {
            [kind, nStr, rStr, pStr, saltB64, dkB64] = parts;
        }
        else {
            return false;
        }
        if (kind !== 'scrypt')
            return false;
        const N = Number(nStr);
        const r = Number(rStr);
        const p = Number(pStr);
        if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p))
            return false;
        const salt = Buffer.from(String(saltB64 || ''), 'base64');
        const expected = Buffer.from(String(dkB64 || ''), 'base64');
        if (!salt.length || !expected.length)
            return false;
        const dk = await scryptAsync(password, salt, expected.length, { N, r, p });
        if (dk.length !== expected.length)
            return false;
        return crypto.timingSafeEqual(dk, expected);
    }
    catch {
        return false;
    }
}
function randomToken(bytes = 32) {
    return base64UrlEncode(crypto.randomBytes(bytes));
}
function sha256Hex(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
}
function shortCode(length = 6) {
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += String(crypto.randomInt(0, 10));
    }
    return out;
}
function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}
function getAccessTtlSeconds() {
    // Keep this simple; can be made configurable later.
    const raw = Number(process.env.HIT_AUTH_ACCESS_TTL_SECONDS || '');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60 * 60; // 1h
}
function getRefreshTtlSeconds() {
    const raw = Number(process.env.HIT_AUTH_REFRESH_TTL_SECONDS || '');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30 * 24 * 60 * 60; // 30d
}
function getBootstrapEmail() {
    return String(process.env.HIT_AUTH_USERNAME || '').trim().toLowerCase();
}
function getBootstrapPassword() {
    const raw = String(process.env.HIT_AUTH_PASSWORD || '').trim();
    return raw ? raw : '';
}
function withAuthCookie(res, token) {
    res.cookies.set('hit_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: getAccessTtlSeconds(),
    });
    return res;
}
function clearAuthCookie(res) {
    res.cookies.set('hit_token', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return res;
}
function issueAccessToken(opts) {
    const secret = getJwtSecret();
    if (!secret)
        return err('Auth not configured: HIT_AUTH_JWT_SECRET is missing', 500);
    const exp = nowSeconds() + getAccessTtlSeconds();
    const payload = {
        sub: opts.email,
        email: opts.email,
        email_verified: opts.emailVerified,
        role: opts.role,
        roles: [opts.role],
        impersonator_email: opts.impersonatorEmail ?? null,
        impersonation_session_id: opts.impersonationSessionId ?? null,
        exp,
        iat: nowSeconds(),
    };
    return signJwtHmac(payload, secret);
}
async function tryWriteAuthAuditEvent(args) {
    try {
        // NOTE: Keep module path non-literal so TS doesn't require the audit-core package at build time.
        // (Audit-core may not be installed in all apps yet.)
        const modulePath = '@hit/feature-pack-audit-core/server/lib/write-audit';
        const mod = await import(modulePath).catch(() => null);
        const writeAuditEvent = mod?.writeAuditEvent;
        if (!writeAuditEvent)
            return;
        const url = new URL(args.req.url);
        await writeAuditEvent(getDb(), {
            entityKind: args.entityKind,
            entityId: args.entityId ?? null,
            action: args.action,
            summary: args.summary,
            details: args.details ?? null,
            actorId: args.actorEmail,
            actorName: args.actorEmail,
            actorType: 'user',
            packName: 'auth-core',
            method: args.req.method,
            path: url.pathname,
            ipAddress: getClientIp(args.req),
            userAgent: args.req.headers.get('user-agent'),
        });
    }
    catch {
        // Audit is best-effort for auth flows; don't break login/logout.
    }
}
async function createRefreshToken(db, opts) {
    const token = randomToken(48);
    const token_hash = sha256Hex(token);
    const ttl = getRefreshTtlSeconds();
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const ip = getClientIp(opts.req);
    const ua = opts.req.headers.get('user-agent');
    await db.execute(sql `
    INSERT INTO hit_auth_v2_refresh_tokens (
      user_email, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address
    ) VALUES (
      ${opts.email}, ${token_hash}, ${expiresAt}, now(), NULL, ${ua}, ${ip}
    )
  `);
    return { token, expiresAt };
}
async function revokeRefreshToken(db, token) {
    const token_hash = sha256Hex(token);
    await db.execute(sql `
    UPDATE hit_auth_v2_refresh_tokens
    SET revoked_at = now()
    WHERE token_hash = ${token_hash} AND revoked_at IS NULL
  `);
}
async function revokeAllRefreshTokensForUser(db, email) {
    await db.execute(sql `
    UPDATE hit_auth_v2_refresh_tokens
    SET revoked_at = now()
    WHERE user_email = ${email} AND revoked_at IS NULL
  `);
}
async function ensureBootstrapAdmin(db, email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !isEmail(normalizedEmail))
        return;
    const configuredEmail = getBootstrapEmail();
    const configuredPassword = getBootstrapPassword();
    if (!configuredEmail || !configuredPassword) {
        return;
    }
    if (configuredEmail !== normalizedEmail) {
        return;
    }
    if (password !== configuredPassword) {
        return;
    }
    const countRes = await db.execute(sql `
    SELECT COUNT(*)::int AS c FROM hit_auth_v2_users
  `);
    const count = Number(countRes?.rows?.[0]?.c || 0);
    if (count > 0) {
        const exists = await db.execute(sql `SELECT 1 FROM hit_auth_v2_users WHERE email = ${normalizedEmail} LIMIT 1`);
        if ((exists?.rows || []).length > 0)
            return;
    }
    const password_hash = await hashPassword(password);
    await db.execute(sql `
    INSERT INTO hit_auth_v2_users (
      email, password_hash, email_verified, two_factor_enabled, locked, role, metadata,
      profile_fields, created_at, updated_at
    ) VALUES (
      ${normalizedEmail}, ${password_hash}, true, false, false, 'admin', '{}'::jsonb,
      '{}'::jsonb, now(), now()
    )
    ON CONFLICT (email) DO NOTHING
  `);
}
async function createEmailVerificationToken(db, email) {
    const token = randomToken(32);
    const code = shortCode(6);
    const token_hash = sha256Hex(token);
    const code_hash = sha256Hex(code);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.execute(sql `
    INSERT INTO hit_auth_v2_email_verification_tokens (
      email, token_hash, code_hash, expires_at, used_at, created_at
    ) VALUES (
      ${email}, ${token_hash}, ${code_hash}, ${expiresAt}, NULL, now()
    )
  `);
    return { token, code, expiresAt };
}
async function createPasswordResetToken(db, email) {
    const token = randomToken(32);
    const token_hash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.execute(sql `
    INSERT INTO hit_auth_v2_password_reset_tokens (
      email, token_hash, expires_at, used_at, created_at
    ) VALUES (
      ${email}, ${token_hash}, ${expiresAt}, NULL, now()
    )
  `);
    return { token, expiresAt };
}
async function createMagicLinkToken(db, email) {
    const token = randomToken(32);
    const token_hash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.execute(sql `
    INSERT INTO hit_auth_v2_magic_link_tokens (
      email, token_hash, expires_at, used_at, created_at
    ) VALUES (
      ${email}, ${token_hash}, ${expiresAt}, NULL, now()
    )
  `);
    return { token, expiresAt };
}
function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function safeDecodePathSegment(seg) {
    try {
        return decodeURIComponent(seg);
    }
    catch {
        return seg;
    }
}
function normalizeUserRow(r) {
    const metadata = r?.metadata && typeof r.metadata === 'object' ? r.metadata : {};
    const profile_fields = r?.profile_fields && typeof r.profile_fields === 'object' ? r.profile_fields : {};
    return {
        email: String(r?.email || ''),
        email_verified: Boolean(r?.email_verified),
        two_factor_enabled: Boolean(r?.two_factor_enabled),
        locked: Boolean(r?.locked),
        role: String(r?.role || 'user'),
        metadata,
        profile_fields,
        profile_picture_url: r?.profile_picture_url ?? null,
        created_at: r?.created_at ? new Date(r.created_at).toISOString() : null,
        updated_at: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
        last_login: r?.last_login ? new Date(r.last_login).toISOString() : null,
    };
}
function normalizeGroupRow(g) {
    const meta = g?.metadata && typeof g.metadata === 'object' ? g.metadata : {};
    return {
        id: String(g?.id || ''),
        name: String(g?.name || ''),
        description: g?.description ?? null,
        metadata: meta,
        user_count: typeof g?.user_count === 'number' ? g.user_count : Number(g?.user_count || 0),
        created_at: g?.created_at ? new Date(g.created_at).toISOString() : null,
        updated_at: g?.updated_at ? new Date(g.updated_at).toISOString() : null,
    };
}
/**
 * V2 Auth Proxy Handler (TypeScript-only)
 *
 * Used to incrementally replace the Python auth module behind the existing
 * `/api/proxy/auth/*` surface, without changing the fundamental system yet.
 *
 * Return:
 * - NextResponse if handled by V2
 * - null if not handled (caller may return 501 or proxy to Python depending on app mode)
 */
export async function tryHandleAuthV2Proxy(opts) {
    const { req, pathSegments, method } = opts;
    const m = method.toUpperCase();
    const p0 = (pathSegments[0] || '').trim();
    const p1 = pathSegments[1] || '';
    // Minimal health check so wiring can be validated immediately.
    if (m === 'GET' && (p0 === 'healthz' || p0 === 'health')) {
        return clearAuthCookie(json({ ok: true }));
    }
    // Config surfaces used by SDK/admin hooks. These are config-derived in V2.
    if (m === 'GET' && (p0 === 'config' || p0 === 'features')) {
        return json({ features: buildFeaturesFromConfig() });
    }
    // ---------------------------------------------------------------------------
    // CORE AUTH (login/refresh/logout/validate/me)
    // ---------------------------------------------------------------------------
    if (p0 === 'register' && m === 'POST') {
        if (!getAllowSignupFromConfig())
            return err('Registration is disabled', 403);
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const email = String(body?.email || '').trim().toLowerCase();
        const password = String(body?.password || '').trim();
        if (!email || !isEmail(email))
            return err('Invalid email', 400);
        if (!password)
            return err('Password is required', 400);
        const exists = await db.execute(sql `SELECT 1 FROM hit_auth_v2_users WHERE email = ${email} LIMIT 1`);
        if ((exists?.rows || []).length > 0)
            return err('User already exists', 400);
        const password_hash = await hashPassword(password);
        const emailVerificationEnabled = getEmailVerificationEnabledFromConfig();
        const email_verified = emailVerificationEnabled ? false : true;
        const ins = await db.execute(sql `
      INSERT INTO hit_auth_v2_users (
        email,
        password_hash,
        email_verified,
        two_factor_enabled,
        locked,
        role,
        metadata,
        profile_fields,
        created_at,
        updated_at
      ) VALUES (
        ${email},
        ${password_hash},
        ${email_verified},
        false,
        false,
        'user',
        '{}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
      )
      RETURNING email, email_verified, role
    `);
        const row = ins?.rows?.[0];
        if (emailVerificationEnabled && !row?.email_verified) {
            try {
                const ver = await createEmailVerificationToken(db, email);
                const base = frontendBaseUrlFromRequest(req);
                const verifyUrl = base ? `${base}/verify-email?token=${encodeURIComponent(ver.token)}` : '';
                await sendVerifyEmail(req, { to: email, verifyUrl, code: ver.code });
            }
            catch {
                // Best-effort; registration shouldn't fail if email fails.
            }
        }
        const tokenOrErr = issueAccessToken({
            email,
            role: String(row?.role || 'user').toLowerCase(),
            emailVerified: Boolean(row?.email_verified),
        });
        if (tokenOrErr instanceof NextResponse)
            return tokenOrErr;
        const refresh = await createRefreshToken(db, { email, req });
        const res = json({
            token: tokenOrErr,
            refresh_token: refresh.token,
            email_verified: Boolean(row?.email_verified),
            expires_in: getAccessTtlSeconds(),
        }, { status: 201 });
        return withAuthCookie(res, tokenOrErr);
    }
    if (p0 === 'login' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const email = String(body?.email || '').trim().toLowerCase();
        const password = String(body?.password || '').trim();
        if (!email || !isEmail(email))
            return err('Invalid credentials', 401);
        if (!password)
            return err('Invalid credentials', 401);
        // Bootstrap admin if configured or if this is the first user and CHANGEME is used.
        await ensureBootstrapAdmin(db, email, password);
        const loginRes = await db.execute(sql `
      SELECT email, password_hash, email_verified, two_factor_enabled, locked, role
      FROM hit_auth_v2_users
      WHERE email = ${email}
      LIMIT 1
    `);
        const row = loginRes?.rows?.[0];
        if (!row) {
            await tryWriteAuthAuditEvent({
                req,
                actorEmail: email,
                action: 'auth.login_failed',
                summary: `Login failed for ${email}`,
                entityKind: 'auth.user',
                entityId: email,
                details: { reason: 'user_not_found' },
            });
            return err('Invalid credentials', 401);
        }
        if (row.locked)
            return err('Account is locked', 403);
        if (getEmailVerificationEnabledFromConfig() && !row.email_verified) {
            return err('Email verification required', 403);
        }
        const storedHash = row.password_hash ? String(row.password_hash) : '';
        let ok = false;
        if (!storedHash) {
            ok = password === getBootstrapPassword();
            if (ok) {
                const password_hash = await hashPassword(password);
                await db.execute(sql `
          UPDATE hit_auth_v2_users
          SET password_hash = ${password_hash}, updated_at = now()
          WHERE email = ${email}
        `);
            }
        }
        else {
            ok = await verifyPassword(password, storedHash);
        }
        if (!ok) {
            await tryWriteAuthAuditEvent({
                req,
                actorEmail: row.email,
                action: 'auth.login_failed',
                summary: `Login failed for ${row.email}`,
                entityKind: 'auth.user',
                entityId: row.email,
                details: { reason: 'bad_password' },
            });
            return err('Invalid credentials', 401);
        }
        // Update last_login best-effort
        await db.execute(sql `UPDATE hit_auth_v2_users SET last_login = now(), updated_at = now() WHERE email = ${email}`);
        const tokenOrErr = issueAccessToken({
            email,
            role: String(row.role || 'user').toLowerCase(),
            emailVerified: Boolean(row.email_verified),
        });
        if (tokenOrErr instanceof NextResponse)
            return tokenOrErr;
        const refresh = await createRefreshToken(db, { email, req });
        await tryWriteAuthAuditEvent({
            req,
            actorEmail: row.email,
            action: 'auth.login',
            summary: `Login successful for ${row.email}`,
            entityKind: 'auth.user',
            entityId: row.email,
        });
        const loginJson = json({
            token: tokenOrErr,
            refresh_token: refresh.token,
            email_verified: Boolean(row.email_verified),
            expires_in: getAccessTtlSeconds(),
        });
        return withAuthCookie(loginJson, tokenOrErr);
    }
    if (p0 === 'refresh' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const refreshToken = String(body?.refresh_token || '').trim();
        if (!refreshToken)
            return err('Invalid refresh token', 401);
        const token_hash = sha256Hex(refreshToken);
        const refreshRes = await db.execute(sql `
      SELECT rt.user_email, rt.expires_at, rt.revoked_at, u.role, u.email_verified
      FROM hit_auth_v2_refresh_tokens rt
      JOIN hit_auth_v2_users u ON u.email = rt.user_email
      WHERE rt.token_hash = ${token_hash}
      LIMIT 1
    `);
        const row = refreshRes?.rows?.[0];
        if (!row)
            return err('Invalid refresh token', 401);
        if (row.revoked_at)
            return err('Invalid refresh token', 401);
        const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
        if (!exp || exp < Date.now())
            return err('Invalid refresh token', 401);
        // Rotation: revoke old, mint new
        await revokeRefreshToken(db, refreshToken);
        const email = String(row.user_email || '').toLowerCase();
        const tokenOrErr = issueAccessToken({
            email,
            role: String(row.role || 'user').toLowerCase(),
            emailVerified: Boolean(row.email_verified),
        });
        if (tokenOrErr instanceof NextResponse)
            return tokenOrErr;
        const refresh = await createRefreshToken(db, { email, req });
        await tryWriteAuthAuditEvent({
            req,
            actorEmail: email,
            action: 'auth.refresh',
            summary: `Token refreshed for ${email}`,
            entityKind: 'auth.user',
            entityId: email,
        });
        const refreshJson = json({
            token: tokenOrErr,
            refresh_token: refresh.token,
            email_verified: Boolean(row.email_verified),
            expires_in: getAccessTtlSeconds(),
        });
        return withAuthCookie(refreshJson, tokenOrErr);
    }
    if (p0 === 'logout' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const refreshToken = String(body?.refresh_token || '').trim();
        if (refreshToken) {
            await revokeRefreshToken(db, refreshToken);
        }
        const u = requireUser(req);
        if (!(u instanceof NextResponse)) {
            await tryWriteAuthAuditEvent({
                req,
                actorEmail: u.email,
                action: 'auth.logout',
                summary: `Logout for ${u.email}`,
                entityKind: 'auth.user',
                entityId: u.email,
            });
        }
        return clearAuthCookie(json({ ok: true }));
    }
    if ((p0 === 'logout-all' || p0 === 'logout_all') && m === 'POST') {
        const u = requireUser(req);
        if (u instanceof NextResponse)
            return u;
        const db = getDb();
        await revokeAllRefreshTokensForUser(db, u.email);
        await tryWriteAuthAuditEvent({
            req,
            actorEmail: u.email,
            action: 'auth.logout_all',
            summary: `Logout-all for ${u.email}`,
            entityKind: 'auth.user',
            entityId: u.email,
        });
        return json({ ok: true });
    }
    // ---------------------------------------------------------------------------
    // EMAIL VERIFICATION + PASSWORD RESET + MAGIC LINK
    // ---------------------------------------------------------------------------
    if (p0 === 'verify-email' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const token = String(body?.token || '').trim();
        const email = String(body?.email || '').trim().toLowerCase();
        const code = String(body?.code || '').trim();
        if (token) {
            const token_hash = sha256Hex(token);
            const res = await db.execute(sql `
        SELECT email
        FROM hit_auth_v2_email_verification_tokens
        WHERE token_hash = ${token_hash} AND used_at IS NULL AND expires_at > now()
        LIMIT 1
      `);
            const row = res?.rows?.[0];
            if (!row?.email)
                return err('Invalid or expired verification token', 400);
            await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET email_verified = true, updated_at = now()
        WHERE email = ${String(row.email).toLowerCase()}
      `);
            await db.execute(sql `
        UPDATE hit_auth_v2_email_verification_tokens
        SET used_at = now()
        WHERE token_hash = ${token_hash}
      `);
            return json({ ok: true, email: String(row.email).toLowerCase() });
        }
        if (email && code) {
            const code_hash = sha256Hex(code);
            const res = await db.execute(sql `
        SELECT id, email
        FROM hit_auth_v2_email_verification_tokens
        WHERE email = ${email} AND code_hash = ${code_hash}
          AND used_at IS NULL AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1
      `);
            const row = res?.rows?.[0];
            if (!row?.email)
                return err('Invalid verification code', 400);
            await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET email_verified = true, updated_at = now()
        WHERE email = ${email}
      `);
            await db.execute(sql `
        UPDATE hit_auth_v2_email_verification_tokens
        SET used_at = now()
        WHERE id = ${row.id}::uuid
      `);
            return json({ ok: true, email });
        }
        return err('Token or email+code required', 400);
    }
    if (p0 === 'verification-status' && m === 'GET') {
        if (!getEmailVerificationEnabledFromConfig())
            return err('Email verification is disabled', 403);
        const url = new URL(req.url);
        const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
        if (!email || !isEmail(email))
            return err('Invalid email', 400);
        const db = getDb();
        const u = await db.execute(sql `
      SELECT email_verified FROM hit_auth_v2_users WHERE email = ${email} LIMIT 1
    `);
        const user = u?.rows?.[0];
        if (!user)
            return json({ email_verified: false, verification_sent_at: null });
        if (user.email_verified)
            return json({ email_verified: true, verification_sent_at: null });
        const t = await db.execute(sql `
      SELECT created_at
      FROM hit_auth_v2_email_verification_tokens
      WHERE email = ${email} AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);
        const tokenRow = t?.rows?.[0];
        const sentAt = tokenRow?.created_at ? new Date(tokenRow.created_at).toISOString() : null;
        return json({ email_verified: false, verification_sent_at: sentAt });
    }
    if (p0 === 'resend-verification' && m === 'POST') {
        if (!getEmailVerificationEnabledFromConfig())
            return err('Email verification is disabled', 403);
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const email = String(body?.email || '').trim().toLowerCase();
        if (!email || !isEmail(email))
            return json({ ok: true });
        const res = await db.execute(sql `
      SELECT email, email_verified
      FROM hit_auth_v2_users
      WHERE email = ${email}
      LIMIT 1
    `);
        const user = res?.rows?.[0];
        if (!user || user.email_verified)
            return json({ ok: true });
        try {
            const ver = await createEmailVerificationToken(db, email);
            const base = frontendBaseUrlFromRequest(req);
            const verifyUrl = base ? `${base}/verify-email?token=${encodeURIComponent(ver.token)}` : '';
            await sendVerifyEmail(req, { to: email, verifyUrl, code: ver.code });
        }
        catch {
            // best-effort
        }
        return json({ ok: true });
    }
    if (p0 === 'forgot-password' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const email = String(body?.email || '').trim().toLowerCase();
        if (!email || !isEmail(email))
            return json({ ok: true });
        const res = await db.execute(sql `
      SELECT email
      FROM hit_auth_v2_users
      WHERE email = ${email}
      LIMIT 1
    `);
        const user = res?.rows?.[0];
        if (!user?.email)
            return json({ ok: true });
        try {
            const reset = await createPasswordResetToken(db, email);
            const base = frontendBaseUrlFromRequest(req);
            const resetUrl = base ? `${base}/reset-password?token=${encodeURIComponent(reset.token)}` : '';
            await sendPasswordResetEmail(req, { to: email, resetUrl });
        }
        catch {
            // best-effort
        }
        return json({ ok: true });
    }
    if (p0 === 'reset-password' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const token = String(body?.token || '').trim();
        const password = String(body?.password || '').trim();
        if (!token || !password)
            return err('Token and password are required', 400);
        const token_hash = sha256Hex(token);
        const res = await db.execute(sql `
      SELECT email
      FROM hit_auth_v2_password_reset_tokens
      WHERE token_hash = ${token_hash} AND used_at IS NULL AND expires_at > now()
      LIMIT 1
    `);
        const row = res?.rows?.[0];
        if (!row?.email)
            return err('Invalid or expired reset token', 400);
        const password_hash = await hashPassword(password);
        await db.execute(sql `
      UPDATE hit_auth_v2_users
      SET password_hash = ${password_hash}, updated_at = now()
      WHERE email = ${String(row.email).toLowerCase()}
    `);
        await db.execute(sql `
      UPDATE hit_auth_v2_password_reset_tokens
      SET used_at = now()
      WHERE token_hash = ${token_hash}
    `);
        await revokeAllRefreshTokensForUser(db, String(row.email).toLowerCase());
        return json({ ok: true });
    }
    if (p0 === 'magic-link' && p1 === 'request' && m === 'POST') {
        if (!getMagicLinkEnabledFromConfig())
            return err('Magic link login is disabled', 403);
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const email = String(body?.email || '').trim().toLowerCase();
        if (!email || !isEmail(email))
            return json({ ok: true });
        const res = await db.execute(sql `
      SELECT email, locked
      FROM hit_auth_v2_users
      WHERE email = ${email}
      LIMIT 1
    `);
        const user = res?.rows?.[0];
        if (!user?.email || user.locked)
            return json({ ok: true });
        try {
            const magic = await createMagicLinkToken(db, email);
            const base = frontendBaseUrlFromRequest(req);
            const magicUrl = base ? `${base}/magic-link?token=${encodeURIComponent(magic.token)}` : '';
            await sendMagicLinkEmail(req, { to: email, magicUrl });
        }
        catch {
            // best-effort
        }
        return json({ ok: true });
    }
    if (p0 === 'magic-link' && p1 === 'verify' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const token = String(body?.token || '').trim();
        if (!token)
            return err('Token is required', 400);
        const token_hash = sha256Hex(token);
        const magicTokenRes = await db.execute(sql `
      SELECT email
      FROM hit_auth_v2_magic_link_tokens
      WHERE token_hash = ${token_hash} AND used_at IS NULL AND expires_at > now()
      LIMIT 1
    `);
        const row = magicTokenRes?.rows?.[0];
        if (!row?.email)
            return err('Invalid or expired token', 400);
        const userRes = await db.execute(sql `
      SELECT email, role, email_verified, locked
      FROM hit_auth_v2_users
      WHERE email = ${String(row.email).toLowerCase()}
      LIMIT 1
    `);
        const user = userRes?.rows?.[0];
        if (!user?.email || user.locked)
            return err('Invalid credentials', 401);
        if (getEmailVerificationEnabledFromConfig() && !user.email_verified) {
            await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET email_verified = true, updated_at = now()
        WHERE email = ${String(user.email).toLowerCase()}
      `);
        }
        const tokenOrErr = issueAccessToken({
            email: String(user.email).toLowerCase(),
            role: String(user.role || 'user').toLowerCase(),
            emailVerified: Boolean(user.email_verified) || getEmailVerificationEnabledFromConfig() === false,
        });
        if (tokenOrErr instanceof NextResponse)
            return tokenOrErr;
        const refresh = await createRefreshToken(db, { email: String(user.email).toLowerCase(), req });
        await db.execute(sql `
      UPDATE hit_auth_v2_magic_link_tokens
      SET used_at = now()
      WHERE token_hash = ${token_hash}
    `);
        const magicJson = json({
            token: tokenOrErr,
            refresh_token: refresh.token,
            email_verified: true,
            expires_in: getAccessTtlSeconds(),
        });
        return withAuthCookie(magicJson, tokenOrErr);
    }
    // ---------------------------------------------------------------------------
    // IMPERSONATION
    // ---------------------------------------------------------------------------
    if (p0 === 'impersonate' && p1 === 'start' && m === 'POST') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const admin = requireUser(req);
        if (admin instanceof NextResponse)
            return admin;
        const body = (await req.json().catch(() => ({})));
        const user_email = String(body?.user_email || '').trim().toLowerCase();
        if (!isEmail(user_email))
            return err('user_email is required', 400);
        const db = getDb();
        const userRes = await db.execute(sql `
      SELECT email, role, email_verified
      FROM hit_auth_v2_users
      WHERE email = ${user_email}
      LIMIT 1
    `);
        const u = userRes?.rows?.[0];
        if (!u?.email)
            return err('User not found', 404);
        const ip = getClientIp(req);
        const ua = req.headers.get('user-agent');
        const sess = await db.execute(sql `
      INSERT INTO hit_auth_v2_impersonation_sessions (
        admin_email, impersonated_email, started_at, ended_at, ended_reason, ip_address, user_agent
      ) VALUES (
        ${admin.email}, ${u.email}, now(), NULL, NULL, ${ip}, ${ua}
      )
      RETURNING id::text AS id
    `);
        const sessionId = String(sess?.rows?.[0]?.id || '');
        const tokenOrErr = issueAccessToken({
            email: String(u.email),
            role: String(u.role || 'user').toLowerCase(),
            emailVerified: Boolean(u.email_verified),
            impersonatorEmail: admin.email,
            impersonationSessionId: sessionId || null,
        });
        if (tokenOrErr instanceof NextResponse)
            return tokenOrErr;
        await tryWriteAuthAuditEvent({
            req,
            actorEmail: admin.email,
            action: 'auth.impersonate_start',
            summary: `Impersonation started: ${admin.email} -> ${u.email}`,
            entityKind: 'auth.impersonation_session',
            entityId: sessionId || null,
            details: { admin_email: admin.email, impersonated_email: u.email },
        });
        const impersonateJson = json({
            token: tokenOrErr,
            admin_email: admin.email,
            impersonated_user: { email: u.email, email_verified: Boolean(u.email_verified), roles: [String(u.role || 'user')] },
        });
        return withAuthCookie(impersonateJson, tokenOrErr);
    }
    if (p0 === 'impersonate' && p1 === 'end' && m === 'POST') {
        const db = getDb();
        const body = (await req.json().catch(() => ({})));
        const session_id = String(body?.session_id || '').trim();
        // Admin can end any session by id
        if (session_id) {
            const gate = requireAdmin(req);
            if (gate)
                return gate;
            const admin = requireUser(req);
            if (admin instanceof NextResponse)
                return admin;
            await db.execute(sql `
        UPDATE hit_auth_v2_impersonation_sessions
        SET ended_at = COALESCE(ended_at, now()), ended_reason = COALESCE(ended_reason, 'ended')
        WHERE id = ${session_id}::uuid
      `);
            await tryWriteAuthAuditEvent({
                req,
                actorEmail: admin.email,
                action: 'auth.impersonate_end',
                summary: `Impersonation ended by admin: ${admin.email} (session ${session_id})`,
                entityKind: 'auth.impersonation_session',
                entityId: session_id,
            });
            return json({ ok: true });
        }
        // Otherwise: end "current" impersonation session inferred from JWT claims.
        const token = extractBearer(req);
        if (!token)
            return err('Authentication required', 401);
        const secret = getJwtSecret();
        if (!secret)
            return err('Auth not configured: HIT_AUTH_JWT_SECRET is missing', 500);
        const claims = verifyJwtHmac(token, secret);
        if (!claims)
            return err('Authentication required', 401);
        const sid = typeof claims.impersonation_session_id === 'string'
            ? String(claims.impersonation_session_id).trim()
            : '';
        const imp = typeof claims.impersonator_email === 'string'
            ? String(claims.impersonator_email).trim()
            : '';
        const sub = (typeof claims.email === 'string' && String(claims.email).trim()) ||
            (typeof claims.sub === 'string' && String(claims.sub).trim()) ||
            '';
        if (!sid || !imp || !sub)
            return err('Not impersonating', 400);
        await db.execute(sql `
      UPDATE hit_auth_v2_impersonation_sessions
      SET ended_at = COALESCE(ended_at, now()), ended_reason = COALESCE(ended_reason, 'ended')
      WHERE id = ${sid}::uuid
    `);
        await tryWriteAuthAuditEvent({
            req,
            actorEmail: imp.toLowerCase(),
            action: 'auth.impersonate_end',
            summary: `Impersonation ended: ${imp} -> ${sub}`,
            entityKind: 'auth.impersonation_session',
            entityId: sid,
            details: { admin_email: imp, impersonated_email: sub },
        });
        return json({ ok: true });
    }
    if (p0 === 'validate' && m === 'POST') {
        const body = (await req.json().catch(() => ({})));
        const token = String(body?.token || '').trim();
        if (!token)
            return json({ valid: false, error: 'No token provided' });
        const secret = getJwtSecret();
        if (!secret)
            return json({ valid: false, error: 'Auth not configured' });
        const claims = verifyJwtHmac(token, secret);
        if (!claims)
            return json({ valid: false, error: 'Invalid token' });
        return json({ valid: true, claims });
    }
    if (p0 === 'me' && m === 'GET') {
        const u = requireUser(req);
        if (u instanceof NextResponse)
            return u;
        const db = getDb();
        const res = await db.execute(sql `
      SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
      FROM hit_auth_v2_users
      WHERE email = ${u.email}
      LIMIT 1
    `);
        const row = res?.rows?.[0];
        if (!row)
            return err('User not found', 404);
        return json(normalizeUserRow(row));
    }
    // ---------------------------------------------------------------------------
    // USERS (admin)
    // ---------------------------------------------------------------------------
    if (p0 === 'users') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const db = getDb();
        // GET /users (list)
        if (m === 'GET' && !p1) {
            const res = await db.execute(sql `SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
            FROM hit_auth_v2_users
            ORDER BY created_at DESC`);
            return json((res?.rows || []).map(normalizeUserRow));
        }
        // POST /users (create)
        if (m === 'POST' && !p1) {
            const body = (await req.json().catch(() => ({})));
            const email = String(body?.email || '').trim().toLowerCase();
            const password = String(body?.password || '').trim();
            const role = String(body?.role || (Array.isArray(body?.roles) ? body.roles?.[0] : '') || 'user')
                .trim()
                .toLowerCase();
            const emailVerified = typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : false;
            if (!email || !isEmail(email))
                return err('Invalid email', 400);
            if (!password)
                return err('Password is required', 400);
            const password_hash = await hashPassword(password);
            const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
            const profile_fields = body?.profile_fields && typeof body.profile_fields === 'object' ? body.profile_fields : {};
            try {
                const insertRes = await db.execute(sql `
          INSERT INTO hit_auth_v2_users (
            email,
            password_hash,
            email_verified,
            two_factor_enabled,
            locked,
            role,
            metadata,
            profile_fields,
            created_at,
            updated_at
          ) VALUES (
            ${email},
            ${password_hash},
            ${emailVerified},
            false,
            false,
            ${role || 'user'},
            ${JSON.stringify(metadata)}::jsonb,
            ${JSON.stringify(profile_fields)}::jsonb,
            now(),
            now()
          )
          RETURNING email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
        `);
                const row = insertRes?.rows?.[0];
                return json(normalizeUserRow(row), { status: 201 });
            }
            catch (e) {
                const msg = String(e?.message || e || '');
                if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
                    return err('User already exists', 400);
                }
                return err('Failed to create user', 500);
            }
        }
        // User-scoped routes: /users/{email}
        const email = safeDecodePathSegment(p1).trim().toLowerCase();
        if (!email || !isEmail(email))
            return err('Invalid user email', 400);
        // GET /users/{email}
        if (m === 'GET') {
            const res = await db.execute(sql `
        SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
        FROM hit_auth_v2_users
        WHERE email = ${email}
        LIMIT 1
      `);
            const row = res?.rows?.[0];
            if (!row)
                return err('User not found', 404);
            return json(normalizeUserRow(row));
        }
        // PUT /users/{email}
        if (m === 'PUT') {
            const body = (await req.json().catch(() => ({})));
            const role = body?.role != null ? String(body.role).trim().toLowerCase() : undefined;
            const locked = typeof body?.locked === 'boolean' ? Boolean(body.locked) : undefined;
            const email_verified = typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : undefined;
            const profile_fields = body?.profile_fields && typeof body.profile_fields === 'object' ? body.profile_fields : undefined;
            const profile_picture_url = body?.profile_picture_url != null ? String(body.profile_picture_url).trim() : undefined;
            const res = await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET
          role = COALESCE(${role}, role),
          locked = COALESCE(${locked}, locked),
          email_verified = COALESCE(${email_verified}, email_verified),
          profile_fields = COALESCE(${profile_fields ? JSON.stringify(profile_fields) : null}::jsonb, profile_fields),
          profile_picture_url = COALESCE(${profile_picture_url}, profile_picture_url),
          updated_at = now()
        WHERE email = ${email}
        RETURNING email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
      `);
            const row = res?.rows?.[0];
            if (!row)
                return err('User not found', 404);
            return json(normalizeUserRow(row));
        }
        // DELETE /users/{email}
        if (m === 'DELETE') {
            await db.execute(sql `DELETE FROM hit_auth_v2_users WHERE email = ${email}`);
            return json({}, { status: 204 });
        }
    }
    // ---------------------------------------------------------------------------
    // ADMIN: USER EMAIL + PASSWORD ACTIONS
    // ---------------------------------------------------------------------------
    if (p0 === 'admin' && (p1 || '').trim() === 'users' && (pathSegments[2] || '').trim()) {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const email = safeDecodePathSegment(String(pathSegments[2] || '')).trim().toLowerCase();
        const action = String(pathSegments[3] || '').trim();
        if (!email || !isEmail(email))
            return err('Invalid user email', 400);
        const db = getDb();
        if (action === 'resend-verification' && m === 'POST') {
            if (!getEmailVerificationEnabledFromConfig())
                return err('Email verification is disabled', 403);
            const userRes = await db.execute(sql `
        SELECT email, email_verified
        FROM hit_auth_v2_users
        WHERE email = ${email}
        LIMIT 1
      `);
            const user = userRes?.rows?.[0];
            if (!user?.email || user.email_verified)
                return json({ ok: true });
            try {
                const ver = await createEmailVerificationToken(db, email);
                const base = frontendBaseUrlFromRequest(req);
                const verifyUrl = base ? `${base}/verify-email?token=${encodeURIComponent(ver.token)}` : '';
                await sendVerifyEmail(req, { to: email, verifyUrl, code: ver.code });
            }
            catch {
                // best-effort
            }
            return json({ ok: true });
        }
        if (action === 'verify' && (m === 'PUT' || m === 'POST')) {
            await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET email_verified = true, updated_at = now()
        WHERE email = ${email}
      `);
            return json({ ok: true });
        }
        if (action === 'reset-password' && m === 'POST') {
            const body = (await req.json().catch(() => ({})));
            const send_email = body?.send_email !== false;
            const password = String(body?.password || '').trim();
            if (send_email) {
                const userRes = await db.execute(sql `
          SELECT email
          FROM hit_auth_v2_users
          WHERE email = ${email}
          LIMIT 1
        `);
                const user = userRes?.rows?.[0];
                if (!user?.email)
                    return json({ ok: true });
                try {
                    const reset = await createPasswordResetToken(db, email);
                    const base = frontendBaseUrlFromRequest(req);
                    const resetUrl = base ? `${base}/reset-password?token=${encodeURIComponent(reset.token)}` : '';
                    await sendPasswordResetEmail(req, { to: email, resetUrl });
                }
                catch {
                    // best-effort
                }
                return json({ ok: true });
            }
            if (!password)
                return err('Password is required when send_email is false', 400);
            const password_hash = await hashPassword(password);
            await db.execute(sql `
        UPDATE hit_auth_v2_users
        SET password_hash = ${password_hash}, updated_at = now()
        WHERE email = ${email}
      `);
            await revokeAllRefreshTokensForUser(db, email);
            return json({ ok: true });
        }
    }
    // ---------------------------------------------------------------------------
    // DIRECTORY (admin)
    // ---------------------------------------------------------------------------
    if (m === 'GET' && p0 === 'directory' && (p1 || '').trim() === 'users') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const db = getDb();
        const res = await db.execute(sql `
      SELECT email, profile_fields
      FROM hit_auth_v2_users
      ORDER BY email ASC
    `);
        const items = (res?.rows || []).map((r) => ({
            email: String(r?.email || ''),
            profile_fields: r?.profile_fields && typeof r.profile_fields === 'object' ? r.profile_fields : {},
        }));
        return json(items);
    }
    // ---------------------------------------------------------------------------
    // PERMISSIONS (action checks)
    // ---------------------------------------------------------------------------
    if (p0 === 'permissions' && (p1 || '').trim() === 'actions' && (pathSegments[2] || '').trim() === 'check' && m === 'GET') {
        const u = requireUser(req);
        if (u instanceof NextResponse)
            return u;
        const actionKey = pathSegments
            .slice(3)
            .map((s) => safeDecodePathSegment(String(s || '')).trim())
            .filter(Boolean)
            .join('/');
        if (!actionKey)
            return json({ has_permission: false, source: 'missing_action_key' }, { status: 200 });
        const db = getDb();
        const actionRes = await db.execute(sql `SELECT key, default_enabled FROM hit_auth_v2_permission_actions WHERE key = ${actionKey} LIMIT 1`);
        const actionRow = actionRes?.rows?.[0];
        if (!actionRow) {
            return json({ has_permission: false, source: 'unknown_action' }, { status: 200 });
        }
        // 1) User overrides (highest precedence)
        const userOv = await db.execute(sql `
      SELECT enabled
      FROM hit_auth_v2_user_action_overrides
      WHERE user_email = ${u.email} AND action_key = ${actionKey}
      LIMIT 1
    `);
        const uRow = userOv?.rows?.[0];
        if (uRow && typeof uRow.enabled === 'boolean') {
            return json({ has_permission: Boolean(uRow.enabled), source: 'user_override' }, { status: 200 });
        }
        // Resolve role (simple model: admin/user)
        const role = u.roles.includes('admin') ? 'admin' : 'user';
        // Resolve group memberships
        const groupsRes = await db.execute(sql `SELECT group_id::text AS id FROM hit_auth_v2_user_groups WHERE user_email = ${u.email}`);
        const groupIds = (groupsRes?.rows || [])
            .map((r) => String(r?.id || '').trim())
            .filter(Boolean);
        // 2) Permission Set grants (Security Groups)
        let assignmentWhere = sql `(a.principal_type = 'user' AND a.principal_id = ${u.email})
      OR (a.principal_type = 'role' AND a.principal_id = ${role})`;
        if (groupIds.length > 0) {
            assignmentWhere = sql `${assignmentWhere} OR (a.principal_type = 'group' AND a.principal_id IN (${sql.join(groupIds.map((gid) => sql `${gid}`), sql `, `)}))`;
        }
        const ps = await db.execute(sql `
      SELECT 1 AS ok
      FROM hit_auth_v2_permission_set_assignments a
      JOIN hit_auth_v2_permission_set_action_grants g
        ON g.permission_set_id = a.permission_set_id
       AND g.action_key = ${actionKey}
      WHERE ${assignmentWhere}
      LIMIT 1
    `);
        if ((ps?.rows || []).length > 0) {
            return json({ has_permission: true, source: 'permission_set' }, { status: 200 });
        }
        // 3) Group action permissions (deny-precedence within group overrides)
        if (groupIds.length > 0) {
            const gp = await db.execute(sql `
        SELECT enabled
        FROM hit_auth_v2_group_action_permissions
        WHERE action_key = ${actionKey}
          AND group_id::text IN (${sql.join(groupIds.map((gid) => sql `${gid}`), sql `, `)})
      `);
            const rows = (gp?.rows || []);
            if (rows.length > 0) {
                const anyDeny = rows.some((r) => r && r.enabled === false);
                const anyAllow = rows.some((r) => r && r.enabled === true);
                return json({ has_permission: anyDeny ? false : anyAllow ? true : false, source: 'group_action_permission' }, { status: 200 });
            }
        }
        // 4) Role action permissions
        const rp = await db.execute(sql `
      SELECT enabled
      FROM hit_auth_v2_role_action_permissions
      WHERE role = ${role} AND action_key = ${actionKey}
      LIMIT 1
    `);
        const rRow = rp?.rows?.[0];
        if (rRow && typeof rRow.enabled === 'boolean') {
            return json({ has_permission: Boolean(rRow.enabled), source: 'role_action_permission' }, { status: 200 });
        }
        // 5) Default
        return json({ has_permission: Boolean(actionRow.default_enabled), source: 'default' }, { status: 200 });
    }
    // ---------------------------------------------------------------------------
    // PERMISSIONS (page checks)
    // ---------------------------------------------------------------------------
    if (p0 === 'permissions' && (p1 || '').trim() === 'pages') {
        const u = requireUser(req);
        if (u instanceof NextResponse)
            return u;
        const db = getDb();
        const role = u.roles.includes('admin') ? 'admin' : 'user';
        const groupRes = await db.execute(sql `SELECT group_id::text AS id FROM hit_auth_v2_user_groups WHERE user_email = ${u.email}`);
        const groupIds = (groupRes?.rows || [])
            .map((r) => String(r?.id || '').trim())
            .filter(Boolean);
        const normalizePagePath = (p) => {
            const trimmed = String(p || '').trim();
            if (!trimmed)
                return '';
            return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        };
        const matchesWildcard = (pattern, path) => {
            if (!pattern.endsWith('/*'))
                return false;
            const base = pattern.slice(0, -2);
            if (!base || base === '/')
                return true;
            return path === base || path.startsWith(`${base}/`);
        };
        const evaluatePages = async (pagePaths) => {
            const paths = pagePaths
                .map((p) => normalizePagePath(p))
                .filter(Boolean);
            if (paths.length === 0)
                return {};
            const userOvRes = await db.execute(sql `SELECT page_path, enabled FROM hit_auth_v2_user_page_overrides WHERE user_email = ${u.email} AND page_path IN (${sql.join(paths.map((p) => sql `${p}`), sql `, `)})`);
            const userOverrides = new Map();
            for (const row of userOvRes?.rows || []) {
                userOverrides.set(String(row.page_path), Boolean(row.enabled));
            }
            const groupOverrides = new Map();
            if (groupIds.length > 0) {
                const groupRes2 = await db.execute(sql `SELECT page_path, enabled FROM hit_auth_v2_group_page_permissions WHERE group_id::text IN (${sql.join(groupIds.map((gid) => sql `${gid}`), sql `, `)}) AND page_path IN (${sql.join(paths.map((p) => sql `${p}`), sql `, `)})`);
                for (const row of groupRes2?.rows || []) {
                    const key = String(row.page_path);
                    const enabled = Boolean(row.enabled);
                    const arr = groupOverrides.get(key) || [];
                    arr.push(enabled);
                    groupOverrides.set(key, arr);
                }
            }
            const roleRes = await db.execute(sql `SELECT page_path, enabled FROM hit_auth_v2_role_page_permissions WHERE role = ${role} AND page_path IN (${sql.join(paths.map((p) => sql `${p}`), sql `, `)})`);
            const roleOverrides = new Map();
            for (const row of roleRes?.rows || []) {
                roleOverrides.set(String(row.page_path), Boolean(row.enabled));
            }
            let assignmentWhere = sql `(a.principal_type = 'user' AND a.principal_id = ${u.email})
        OR (a.principal_type = 'role' AND a.principal_id = ${role})`;
            if (groupIds.length > 0) {
                assignmentWhere = sql `${assignmentWhere} OR (a.principal_type = 'group' AND a.principal_id IN (${sql.join(groupIds.map((gid) => sql `${gid}`), sql `, `)}))`;
            }
            const psRes = await db.execute(sql `
        SELECT g.page_path
        FROM hit_auth_v2_permission_set_page_grants g
        JOIN hit_auth_v2_permission_set_assignments a
          ON a.permission_set_id = g.permission_set_id
        WHERE ${assignmentWhere}
      `);
            const psAllow = new Set((psRes?.rows || []).map((r) => normalizePagePath(String(r?.page_path || ''))));
            const out = {};
            for (const p of paths) {
                if (userOverrides.has(p)) {
                    out[p] = Boolean(userOverrides.get(p));
                    continue;
                }
                const groupList = groupOverrides.get(p) || [];
                if (groupList.length > 0) {
                    if (groupList.some((v) => v === false)) {
                        out[p] = false;
                        continue;
                    }
                    if (groupList.some((v) => v === true)) {
                        out[p] = true;
                        continue;
                    }
                }
                if (roleOverrides.has(p)) {
                    out[p] = Boolean(roleOverrides.get(p));
                    continue;
                }
                if (psAllow.has(p)) {
                    out[p] = true;
                    continue;
                }
                const wildcardAllowed = Array.from(psAllow.values()).some((pattern) => matchesWildcard(pattern, p));
                if (wildcardAllowed) {
                    out[p] = true;
                    continue;
                }
                // Default: allow
                out[p] = true;
            }
            return out;
        };
        if ((pathSegments[2] || '').trim() === 'check-batch' && m === 'POST') {
            const body = (await req.json().catch(() => ([])));
            const paths = Array.isArray(body)
                ? body
                : Array.isArray(body?.paths)
                    ? body.paths
                    : Array.isArray(body?.page_paths)
                        ? body.page_paths
                        : [];
            const allowedByPath = await evaluatePages(paths);
            return json(allowedByPath, { status: 200 });
        }
        if ((pathSegments[2] || '').trim() === 'check' && m === 'GET') {
            const rawPath = pathSegments
                .slice(3)
                .map((s) => safeDecodePathSegment(String(s || '')).trim())
                .filter(Boolean)
                .join('/');
            const pagePath = rawPath ? normalizePagePath(rawPath) : '';
            if (!pagePath)
                return json({ has_permission: false }, { status: 200 });
            const allowedByPath = await evaluatePages([pagePath]);
            const has_permission = Boolean(allowedByPath[pagePath]);
            return json({ has_permission }, { status: 200 });
        }
    }
    // ---------------------------------------------------------------------------
    // PERMISSION SETS (Security Groups) - admin APIs
    // ---------------------------------------------------------------------------
    if (p0 === 'admin' && (p1 || '').trim() === 'permissions' && (pathSegments[2] || '').trim() === 'sets') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const db = getDb();
        const psId = String(pathSegments[3] || '').trim();
        const sub = String(pathSegments[4] || '').trim();
        const tail = String(pathSegments[5] || '').trim();
        // GET /admin/permissions/sets
        if (m === 'GET' && !psId) {
            const res = await db.execute(sql `
        SELECT id, name, description, template_role, created_at, updated_at
        FROM hit_auth_v2_permission_sets
        ORDER BY updated_at DESC, name ASC
      `);
            return json({ items: res?.rows || [] });
        }
        // POST /admin/permissions/sets
        if (m === 'POST' && !psId) {
            const body = (await req.json().catch(() => ({})));
            const name = String(body?.name || '').trim();
            const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
            const template_role = body?.template_role != null && String(body.template_role).trim()
                ? String(body.template_role).trim().toLowerCase()
                : null;
            if (!name)
                return err('Permission set name is required', 400);
            if (template_role && template_role !== 'admin' && template_role !== 'user') {
                return err('Invalid template_role (must be admin|user)', 400);
            }
            try {
                const ins = await db.execute(sql `
          INSERT INTO hit_auth_v2_permission_sets (name, description, template_role, created_at, updated_at)
          VALUES (${name}, ${description}, ${template_role}, now(), now())
          RETURNING id, name, description, template_role, created_at, updated_at
        `);
                return json(ins?.rows?.[0] || null, { status: 201 });
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Permission set name already exists', 400);
                return err('Failed to create permission set', 500);
            }
        }
        if (!psId)
            return err('Permission set id is required', 400);
        // GET /admin/permissions/sets/{psId}
        if (m === 'GET' && !sub) {
            const setRes = await db.execute(sql `
        SELECT id, name, description, template_role, created_at, updated_at
        FROM hit_auth_v2_permission_sets
        WHERE id = ${psId}::uuid
        LIMIT 1
      `);
            const ps = setRes?.rows?.[0];
            if (!ps)
                return err('Permission set not found', 404);
            const [assignmentsRes, actionsRes, pagesRes, metricsRes] = await Promise.all([
                db.execute(sql `
          SELECT id, permission_set_id, principal_type, principal_id, created_at
          FROM hit_auth_v2_permission_set_assignments
          WHERE permission_set_id = ${psId}::uuid
          ORDER BY created_at DESC
        `),
                db.execute(sql `
          SELECT g.id, g.permission_set_id, g.action_key, g.created_at, a.label, a.description, a.pack_name
          FROM hit_auth_v2_permission_set_action_grants g
          LEFT JOIN hit_auth_v2_permission_actions a ON a.key = g.action_key
          WHERE g.permission_set_id = ${psId}::uuid
          ORDER BY g.created_at DESC
        `),
                db.execute(sql `
          SELECT id, permission_set_id, page_path, created_at
          FROM hit_auth_v2_permission_set_page_grants
          WHERE permission_set_id = ${psId}::uuid
          ORDER BY created_at DESC
        `),
                db.execute(sql `
          SELECT id, permission_set_id, metric_key, created_at
          FROM hit_auth_v2_permission_set_metric_grants
          WHERE permission_set_id = ${psId}::uuid
          ORDER BY created_at DESC
        `),
            ]);
            return json({
                permission_set: ps,
                assignments: assignmentsRes?.rows || [],
                action_grants: actionsRes?.rows || [],
                page_grants: pagesRes?.rows || [],
                metric_grants: metricsRes?.rows || [],
            });
        }
        // PUT/PATCH /admin/permissions/sets/{psId}
        if ((m === 'PUT' || m === 'PATCH') && !sub) {
            const body = (await req.json().catch(() => ({})));
            const name = body?.name != null ? String(body.name).trim() : undefined;
            const description = body?.description !== undefined
                ? body?.description != null && String(body.description).trim()
                    ? String(body.description).trim()
                    : null
                : undefined;
            const template_role = body?.template_role !== undefined
                ? body?.template_role != null && String(body.template_role).trim()
                    ? String(body.template_role).trim().toLowerCase()
                    : null
                : undefined;
            if (template_role !== undefined && template_role !== null && template_role !== 'admin' && template_role !== 'user') {
                return err('Invalid template_role (must be admin|user|null)', 400);
            }
            if (m === 'PUT' && (!name || !name.trim()))
                return err('Permission set name is required', 400);
            try {
                const upd = await db.execute(sql `
          UPDATE hit_auth_v2_permission_sets
          SET
            name = COALESCE(${(name ?? null)}, name),
            description = ${description === undefined ? sql `description` : description},
            template_role = ${template_role === undefined ? sql `template_role` : template_role},
            updated_at = now()
          WHERE id = ${psId}::uuid
          RETURNING id, name, description, template_role, created_at, updated_at
        `);
                const row = upd?.rows?.[0];
                if (!row)
                    return err('Permission set not found', 404);
                return json(row);
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Permission set name already exists', 400);
                return err('Failed to update permission set', 500);
            }
        }
        // DELETE /admin/permissions/sets/{psId}
        if (m === 'DELETE' && !sub) {
            await db.execute(sql `DELETE FROM hit_auth_v2_permission_sets WHERE id = ${psId}::uuid`);
            return json({}, { status: 204 });
        }
        // POST /admin/permissions/sets/{psId}/assignments
        if (sub === 'assignments' && m === 'POST') {
            const body = (await req.json().catch(() => ({})));
            const principal_type = String(body?.principal_type || '').trim().toLowerCase();
            const principal_id = String(body?.principal_id || '').trim();
            if (!principal_type || !principal_id)
                return err('principal_type and principal_id are required', 400);
            if (principal_type !== 'user' && principal_type !== 'group' && principal_type !== 'role') {
                return err('Invalid principal_type (must be user|group|role)', 400);
            }
            if (principal_type === 'user' && !isEmail(principal_id))
                return err('Invalid principal_id (email expected)', 400);
            if (principal_type === 'role' && principal_id !== 'admin' && principal_id !== 'user') {
                return err('Invalid principal_id (role must be admin|user)', 400);
            }
            // Best-effort existence checks
            if (principal_type === 'user') {
                const u1 = await db.execute(sql `SELECT 1 FROM hit_auth_v2_users WHERE email = ${principal_id.toLowerCase()} LIMIT 1`);
                if ((u1?.rows || []).length === 0)
                    return err('User not found', 404);
            }
            if (principal_type === 'group') {
                const g1 = await db.execute(sql `SELECT 1 FROM hit_auth_v2_groups WHERE id = ${principal_id}::uuid LIMIT 1`);
                if ((g1?.rows || []).length === 0)
                    return err('Group not found', 404);
            }
            try {
                const ins = await db.execute(sql `
          INSERT INTO hit_auth_v2_permission_set_assignments (permission_set_id, principal_type, principal_id, created_at)
          VALUES (${psId}::uuid, ${principal_type}, ${principal_id.toLowerCase()}, now())
          RETURNING id, permission_set_id, principal_type, principal_id, created_at
        `);
                return json(ins?.rows?.[0] || null, { status: 201 });
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Assignment already exists', 400);
                return err('Failed to create assignment', 500);
            }
        }
        // DELETE /admin/permissions/sets/{psId}/assignments/{assignment_id}
        if (sub === 'assignments' && tail && m === 'DELETE') {
            await db.execute(sql `DELETE FROM hit_auth_v2_permission_set_assignments WHERE id = ${tail}::uuid AND permission_set_id = ${psId}::uuid`);
            return json({}, { status: 204 });
        }
        // POST /admin/permissions/sets/{psId}/actions
        if (sub === 'actions' && m === 'POST') {
            const body = (await req.json().catch(() => ({})));
            const action_key = String(body?.action_key || body?.actionKey || '').trim();
            if (!action_key)
                return err('action_key is required', 400);
            // Ensure action exists (auto-register minimal record if missing)
            const a0 = await db.execute(sql `SELECT 1 FROM hit_auth_v2_permission_actions WHERE key = ${action_key} LIMIT 1`);
            if ((a0?.rows || []).length === 0) {
                await db.execute(sql `
          INSERT INTO hit_auth_v2_permission_actions (key, pack_name, label, description, default_enabled, created_at, updated_at)
          VALUES (${action_key}, NULL, '', NULL, false, now(), now())
          ON CONFLICT (key) DO NOTHING
        `);
            }
            try {
                const ins = await db.execute(sql `
          INSERT INTO hit_auth_v2_permission_set_action_grants (permission_set_id, action_key, created_at)
          VALUES (${psId}::uuid, ${action_key}, now())
          RETURNING id, permission_set_id, action_key, created_at
        `);
                return json(ins?.rows?.[0] || null, { status: 201 });
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Action grant already exists', 400);
                return err('Failed to create action grant', 500);
            }
        }
        // DELETE /admin/permissions/sets/{psId}/actions/{grant_id}
        if (sub === 'actions' && tail && m === 'DELETE') {
            await db.execute(sql `DELETE FROM hit_auth_v2_permission_set_action_grants WHERE id = ${tail}::uuid AND permission_set_id = ${psId}::uuid`);
            return json({}, { status: 204 });
        }
    }
    // ---------------------------------------------------------------------------
    // PERMISSION ACTIONS (registry) - admin APIs
    // ---------------------------------------------------------------------------
    if (p0 === 'admin' && (p1 || '').trim() === 'permissions' && (pathSegments[2] || '').trim() === 'actions') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const db = getDb();
        const actionKeyParam = pathSegments[3] ? safeDecodePathSegment(String(pathSegments[3])) : '';
        // GET /admin/permissions/actions?search&pack&page&pageSize
        if (m === 'GET' && !actionKeyParam) {
            const url = new URL(req.url);
            const search = String(url.searchParams.get('search') || '').trim().toLowerCase();
            const pack = String(url.searchParams.get('pack') || '').trim().toLowerCase();
            const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
            const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50));
            const offset = (page - 1) * pageSize;
            // Build WHERE dynamically (raw SQL but parameterized via drizzle-orm sql template).
            const whereParts = [];
            if (pack) {
                whereParts.push(sql `LOWER(COALESCE(pack_name, '')) = ${pack}`);
            }
            if (search) {
                const like = `%${search}%`;
                whereParts.push(sql `(LOWER(key) LIKE ${like} OR LOWER(COALESCE(label, '')) LIKE ${like} OR LOWER(COALESCE(description, '')) LIKE ${like})`);
            }
            const whereClause = whereParts.length > 0 ? sql `WHERE ${sql.join(whereParts, sql ` AND `)}` : sql ``;
            const [itemsRes, countRes] = await Promise.all([
                db.execute(sql `
          SELECT key, pack_name, label, description, default_enabled, created_at, updated_at
          FROM hit_auth_v2_permission_actions
          ${whereClause}
          ORDER BY key ASC
          LIMIT ${pageSize} OFFSET ${offset}
        `),
                db.execute(sql `
          SELECT COUNT(*)::int AS total
          FROM hit_auth_v2_permission_actions
          ${whereClause}
        `),
            ]);
            const total = Number(countRes?.rows?.[0]?.total || 0);
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            return json({
                items: itemsRes?.rows || [],
                pagination: { page, pageSize, total, totalPages },
            });
        }
        // POST /admin/permissions/actions (upsert/register)
        if (m === 'POST' && !actionKeyParam) {
            const body = (await req.json().catch(() => ({})));
            const key = String(body?.key || '').trim();
            const pack_name = body?.pack_name != null && String(body.pack_name).trim() ? String(body.pack_name).trim() : null;
            const label = body?.label != null ? String(body.label) : '';
            const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
            const default_enabled = typeof body?.default_enabled === 'boolean' ? Boolean(body.default_enabled) : false;
            if (!key)
                return err('key is required', 400);
            if (key.length > 200)
                return err('key is too long', 400);
            const res = await db.execute(sql `
        INSERT INTO hit_auth_v2_permission_actions (
          key, pack_name, label, description, default_enabled, created_at, updated_at
        ) VALUES (
          ${key}, ${pack_name}, ${label}, ${description}, ${default_enabled}, now(), now()
        )
        ON CONFLICT (key) DO UPDATE SET
          pack_name = EXCLUDED.pack_name,
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          default_enabled = EXCLUDED.default_enabled,
          updated_at = now()
        RETURNING key, pack_name, label, description, default_enabled, created_at, updated_at
      `);
            return json(res?.rows?.[0] || null, { status: 201 });
        }
        // DELETE /admin/permissions/actions/{action_key}
        if (m === 'DELETE' && actionKeyParam) {
            const key = actionKeyParam.trim();
            if (!key)
                return err('Invalid action key', 400);
            await db.execute(sql `DELETE FROM hit_auth_v2_permission_actions WHERE key = ${key}`);
            return json({}, { status: 204 });
        }
    }
    // ---------------------------------------------------------------------------
    // GROUPS (admin + me)
    // ---------------------------------------------------------------------------
    if (p0 === 'admin' && (p1 || '').trim() === 'groups') {
        const gate = requireAdmin(req);
        if (gate)
            return gate;
        const db = getDb();
        const p2 = pathSegments[2] || ''; // group_id
        const p3 = pathSegments[3] || '';
        // GET /admin/groups (list)
        if (m === 'GET' && !p2) {
            const res = await db.execute(sql `
        SELECT
          g.id,
          g.name,
          g.description,
          g.metadata,
          g.created_at,
          g.updated_at,
          COALESCE((
            SELECT COUNT(*)::int
            FROM hit_auth_v2_user_groups ug
            WHERE ug.group_id = g.id
          ), 0)::int AS user_count
        FROM hit_auth_v2_groups g
        ORDER BY g.name ASC
      `);
            return json((res?.rows || []).map(normalizeGroupRow));
        }
        // POST /admin/groups (create)
        if (m === 'POST' && !p2) {
            const body = (await req.json().catch(() => ({})));
            const name = String(body?.name || '').trim();
            const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
            const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
            if (!name)
                return err('Group name is required', 400);
            try {
                const ins = await db.execute(sql `
          INSERT INTO hit_auth_v2_groups (name, description, metadata, created_at, updated_at)
          VALUES (${name}, ${description}, ${JSON.stringify(metadata)}::jsonb, now(), now())
          RETURNING id, name, description, metadata, created_at, updated_at
        `);
                const row = ins?.rows?.[0];
                return json({ ...normalizeGroupRow({ ...row, user_count: 0 }) }, { status: 201 });
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Group name already exists', 400);
                return err('Failed to create group', 500);
            }
        }
        // /admin/groups/{group_id}
        const gid = String(p2 || '').trim();
        if (!gid)
            return err('Invalid group id', 400);
        // GET /admin/groups/{group_id}
        if (m === 'GET' && !p3) {
            const res = await db.execute(sql `
        SELECT
          g.id, g.name, g.description, g.metadata, g.created_at, g.updated_at,
          COALESCE((
            SELECT COUNT(*)::int
            FROM hit_auth_v2_user_groups ug
            WHERE ug.group_id = g.id
          ), 0)::int AS user_count
        FROM hit_auth_v2_groups g
        WHERE g.id = ${gid}::uuid
        LIMIT 1
      `);
            const row = res?.rows?.[0];
            if (!row)
                return err('Group not found', 404);
            return json(normalizeGroupRow(row));
        }
        // PUT /admin/groups/{group_id}
        if (m === 'PUT' && !p3) {
            const body = (await req.json().catch(() => ({})));
            const name = body?.name != null ? String(body.name).trim() : '';
            const description = body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
            const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;
            if (!name)
                return err('Group name is required', 400);
            try {
                const upd = await db.execute(sql `
          UPDATE hit_auth_v2_groups
          SET
            name = ${name},
            description = ${description},
            metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, metadata),
            updated_at = now()
          WHERE id = ${gid}::uuid
          RETURNING id, name, description, metadata, created_at, updated_at
        `);
                const row = upd?.rows?.[0];
                if (!row)
                    return err('Group not found', 404);
                // user_count is derived; compute quickly
                const cnt = await db.execute(sql `SELECT COUNT(*)::int AS c FROM hit_auth_v2_user_groups WHERE group_id = ${gid}::uuid`);
                const user_count = Number(cnt?.rows?.[0]?.c || 0);
                return json(normalizeGroupRow({ ...row, user_count }));
            }
            catch (e) {
                const msg = String(e?.message || e || '').toLowerCase();
                if (msg.includes('duplicate') || msg.includes('unique'))
                    return err('Group name already exists', 400);
                return err('Failed to update group', 500);
            }
        }
        // DELETE /admin/groups/{group_id}
        if (m === 'DELETE' && !p3) {
            await db.execute(sql `DELETE FROM hit_auth_v2_groups WHERE id = ${gid}::uuid`);
            return json({}, { status: 204 });
        }
        // GET /admin/groups/{group_id}/users
        if (m === 'GET' && p3 === 'users') {
            const res = await db.execute(sql `
        SELECT
          ug.id,
          ug.user_email,
          ug.group_id,
          g.name AS group_name,
          ug.created_at,
          ug.created_by
        FROM hit_auth_v2_user_groups ug
        JOIN hit_auth_v2_groups g ON g.id = ug.group_id
        WHERE ug.group_id = ${gid}::uuid
        ORDER BY ug.created_at DESC
      `);
            return json(res?.rows || []);
        }
    }
    // GET /admin/users/{user_email}/groups (admin)
    if (p0 === 'admin' && (p1 || '').trim() === 'users' && (pathSegments[2] || '').trim()) {
        const p2 = pathSegments[2] || ''; // user_email
        const p3 = pathSegments[3] || '';
        if (p3 === 'groups' && m === 'GET') {
            const gate = requireAdmin(req);
            if (gate)
                return gate;
            const email = safeDecodePathSegment(p2).trim().toLowerCase();
            if (!email || !isEmail(email))
                return err('Invalid user email', 400);
            const db = getDb();
            const res = await db.execute(sql `
        SELECT
          ug.id,
          ug.user_email,
          ug.group_id,
          g.name AS group_name,
          ug.created_at,
          ug.created_by
        FROM hit_auth_v2_user_groups ug
        JOIN hit_auth_v2_groups g ON g.id = ug.group_id
        WHERE ug.user_email = ${email}
        ORDER BY ug.created_at DESC
      `);
            return json(res?.rows || []);
        }
    }
    // GET /me/groups (authenticated)
    if (m === 'GET' && p0 === 'me' && (p1 || '').trim() === 'groups') {
        const u = requireUser(req);
        if (u instanceof NextResponse)
            return u;
        const db = getDb();
        const res = await db.execute(sql `
      SELECT
        ug.id,
        ug.user_email,
        ug.group_id,
        g.name AS group_name,
        ug.created_at,
        ug.created_by
      FROM hit_auth_v2_user_groups ug
      JOIN hit_auth_v2_groups g ON g.id = ug.group_id
      WHERE ug.user_email = ${u.email}
      ORDER BY ug.created_at DESC
    `);
        return json(res?.rows || []);
    }
    // Not implemented yet.
    return null;
}
//# sourceMappingURL=auth-proxy-v2.js.map
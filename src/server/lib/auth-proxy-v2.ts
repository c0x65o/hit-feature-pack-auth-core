import { NextRequest, NextResponse } from 'next/server';
import { HIT_CONFIG } from '@/lib/hit-config.generated';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { promisify } from 'util';

export type AuthBackendMode = 'python' | 'ts';

function json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(data as any, {
    status: init?.status ?? 200,
    headers: { 'X-Proxied-From': 'auth-v2', ...(init?.headers || {}) },
  });
}

function err(detail: string, status: number) {
  return json({ detail }, { status });
}

function normalizeBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
}

function base64UrlToBase64(s: string): string {
  let out = (s || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = out.length % 4;
  if (pad) out += '='.repeat(4 - pad);
  return out;
}

function base64ToBase64Url(s: string): string {
  return (s || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncode(buf: Buffer): string {
  return base64ToBase64Url(buf.toString('base64'));
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = base64UrlToBase64(parts[1]);
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
    const exp = payload.exp;
    if (typeof exp === 'number' && exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getJwtSecret(): string | null {
  const s = String(process.env.HIT_AUTH_JWT_SECRET || '').trim();
  return s ? s : null;
}

function signJwtHmac(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf8'));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const msg = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(msg).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${msg}.${sigB64}`;
}

function verifyJwtHmac(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  if (!h || !p || !s) return null;
  const msg = `${h}.${p}`;
  const expected = base64UrlEncode(crypto.createHmac('sha256', secret).update(msg).digest());
  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(s);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return parseJwtClaims(token);
}

function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookieToken = req.cookies.get('hit_token')?.value;
  return cookieToken || null;
}

function getClientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

function requireUser(req: NextRequest): { email: string; roles: string[] } | NextResponse {
  const token = extractBearer(req);
  if (!token) return err('Authentication required', 401);
  const secret = getJwtSecret();
  if (!secret) return err('Auth not configured: HIT_AUTH_JWT_SECRET is missing', 500);
  const claims = verifyJwtHmac(token, secret);
  if (!claims) return err('Authentication required', 401);

  const email =
    (typeof (claims as any).email === 'string' && String((claims as any).email).trim()) ||
    (typeof (claims as any).sub === 'string' && String((claims as any).sub).trim()) ||
    '';
  if (!email) return err('Authentication required', 401);

  const roles = Array.isArray((claims as any).roles) ? ((claims as any).roles as unknown[]) : [];
  const role = typeof (claims as any).role === 'string' ? String((claims as any).role) : '';
  const out = roles.map((r) => String(r)).filter(Boolean);
  if (role) out.push(role);
  return { email: email.toLowerCase(), roles: out.map((r) => r.toLowerCase()) };
}

function requireAdmin(req: NextRequest): NextResponse | null {
  const u = requireUser(req);
  if (u instanceof NextResponse) return u;
  const normalized = u.roles;
  const ok = normalized.includes('admin');
  if (!ok) return err('Admin access required', 403);
  return null;
}

function buildFeaturesFromConfig(): Record<string, unknown> {
  const auth = (HIT_CONFIG as any)?.auth ?? {};

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
  };
}

function getAllowSignupFromConfig(): boolean {
  const auth = (HIT_CONFIG as any)?.auth ?? {};
  return normalizeBool(auth.allowSignup, false);
}

function getEmailVerificationEnabledFromConfig(): boolean {
  const auth = (HIT_CONFIG as any)?.auth ?? {};
  return normalizeBool(auth.emailVerification, true);
}

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const dk = (await scryptAsync(password, salt, keyLen, { N, r, p })) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${dk.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 7) return false;
    const [kind, empty, nStr, rStr, pStr, saltB64, dkB64] = parts;
    if (kind !== 'scrypt' || empty !== '') return false;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    const salt = Buffer.from(String(saltB64 || ''), 'base64');
    const expected = Buffer.from(String(dkB64 || ''), 'base64');
    if (!salt.length || !expected.length) return false;
    const dk = (await scryptAsync(password, salt, expected.length, { N, r, p })) as Buffer;
    if (dk.length !== expected.length) return false;
    return crypto.timingSafeEqual(dk, expected);
  } catch {
    return false;
  }
}

function randomToken(bytes: number = 32): string {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getAccessTtlSeconds(): number {
  // Keep this simple; can be made configurable later.
  const raw = Number(process.env.HIT_AUTH_ACCESS_TTL_SECONDS || '');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60 * 60; // 1h
}

function getRefreshTtlSeconds(): number {
  const raw = Number(process.env.HIT_AUTH_REFRESH_TTL_SECONDS || '');
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30 * 24 * 60 * 60; // 30d
}

function issueAccessToken(opts: { email: string; role: string; emailVerified: boolean }): string | NextResponse {
  const secret = getJwtSecret();
  if (!secret) return err('Auth not configured: HIT_AUTH_JWT_SECRET is missing', 500);
  const exp = nowSeconds() + getAccessTtlSeconds();
  const payload = {
    sub: opts.email,
    email: opts.email,
    email_verified: opts.emailVerified,
    role: opts.role,
    roles: [opts.role],
    exp,
    iat: nowSeconds(),
  };
  return signJwtHmac(payload, secret);
}

async function createRefreshToken(db: any, opts: { email: string; req: NextRequest }) {
  const token = randomToken(48);
  const token_hash = sha256Hex(token);
  const ttl = getRefreshTtlSeconds();
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const ip = getClientIp(opts.req);
  const ua = opts.req.headers.get('user-agent');

  await db.execute(sql`
    INSERT INTO hit_auth_v2_refresh_tokens (
      user_email, token_hash, expires_at, created_at, revoked_at, user_agent, ip_address
    ) VALUES (
      ${opts.email}, ${token_hash}, ${expiresAt}, now(), NULL, ${ua as any}, ${ip as any}
    )
  `);

  return { token, expiresAt };
}

async function revokeRefreshToken(db: any, token: string) {
  const token_hash = sha256Hex(token);
  await db.execute(sql`
    UPDATE hit_auth_v2_refresh_tokens
    SET revoked_at = now()
    WHERE token_hash = ${token_hash} AND revoked_at IS NULL
  `);
}

async function revokeAllRefreshTokensForUser(db: any, email: string) {
  await db.execute(sql`
    UPDATE hit_auth_v2_refresh_tokens
    SET revoked_at = now()
    WHERE user_email = ${email} AND revoked_at IS NULL
  `);
}

function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeDecodePathSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

function normalizeUserRow(r: any) {
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

function normalizeGroupRow(g: any) {
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
export async function tryHandleAuthV2Proxy(opts: {
  req: NextRequest;
  pathSegments: string[];
  method: string;
}): Promise<NextResponse | null> {
  const { req, pathSegments, method } = opts;

  const m = method.toUpperCase();
  const p0 = (pathSegments[0] || '').trim();
  const p1 = pathSegments[1] || '';

  // Minimal health check so wiring can be validated immediately.
  if (m === 'GET' && (p0 === 'healthz' || p0 === 'health')) {
    return json({ ok: true });
  }

  // Config surfaces used by SDK/admin hooks. These are config-derived in V2.
  if (m === 'GET' && (p0 === 'config' || p0 === 'features')) {
    return json({ features: buildFeaturesFromConfig() });
  }

  // ---------------------------------------------------------------------------
  // CORE AUTH (login/refresh/logout/validate/me)
  // ---------------------------------------------------------------------------
  if (p0 === 'register' && m === 'POST') {
    if (!getAllowSignupFromConfig()) return err('Registration is disabled', 403);

    const db = getDb();
    const body = (await req.json().catch(() => ({}))) as any;
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    if (!email || !isEmail(email)) return err('Invalid email', 400);
    if (!password) return err('Password is required', 400);

    const exists = await db.execute(sql`SELECT 1 FROM hit_auth_v2_users WHERE email = ${email} LIMIT 1`);
    if ((exists?.rows || []).length > 0) return err('User already exists', 400);

    const password_hash = await hashPassword(password);
    const emailVerificationEnabled = getEmailVerificationEnabledFromConfig();
    const email_verified = emailVerificationEnabled ? false : true;

    const ins = await db.execute(sql`
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
    const row = ins?.rows?.[0] as any;

    const tokenOrErr = issueAccessToken({
      email,
      role: String(row?.role || 'user').toLowerCase(),
      emailVerified: Boolean(row?.email_verified),
    });
    if (tokenOrErr instanceof NextResponse) return tokenOrErr;

    const refresh = await createRefreshToken(db, { email, req });
    return json(
      {
        token: tokenOrErr,
        refresh_token: refresh.token,
        email_verified: Boolean(row?.email_verified),
        expires_in: getAccessTtlSeconds(),
      },
      { status: 201 }
    );
  }

  if (p0 === 'login' && m === 'POST') {
    const db = getDb();
    const body = (await req.json().catch(() => ({}))) as any;
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    if (!email || !isEmail(email)) return err('Invalid credentials', 401);
    if (!password) return err('Invalid credentials', 401);

    const res = await db.execute(sql`
      SELECT email, password_hash, email_verified, two_factor_enabled, locked, role
      FROM hit_auth_v2_users
      WHERE email = ${email}
      LIMIT 1
    `);
    const row = res?.rows?.[0] as any;
    if (!row) return err('Invalid credentials', 401);
    if (row.locked) return err('Account is locked', 403);
    if (!row.password_hash) return err('Invalid credentials', 401);
    const ok = await verifyPassword(password, String(row.password_hash));
    if (!ok) return err('Invalid credentials', 401);

    // Update last_login best-effort
    await db.execute(sql`UPDATE hit_auth_v2_users SET last_login = now(), updated_at = now() WHERE email = ${email}`);

    const tokenOrErr = issueAccessToken({
      email,
      role: String(row.role || 'user').toLowerCase(),
      emailVerified: Boolean(row.email_verified),
    });
    if (tokenOrErr instanceof NextResponse) return tokenOrErr;

    const refresh = await createRefreshToken(db, { email, req });
    return json({
      token: tokenOrErr,
      refresh_token: refresh.token,
      email_verified: Boolean(row.email_verified),
      expires_in: getAccessTtlSeconds(),
    });
  }

  if (p0 === 'refresh' && m === 'POST') {
    const db = getDb();
    const body = (await req.json().catch(() => ({}))) as any;
    const refreshToken = String(body?.refresh_token || '').trim();
    if (!refreshToken) return err('Invalid refresh token', 401);
    const token_hash = sha256Hex(refreshToken);

    const res = await db.execute(sql`
      SELECT rt.user_email, rt.expires_at, rt.revoked_at, u.role, u.email_verified
      FROM hit_auth_v2_refresh_tokens rt
      JOIN hit_auth_v2_users u ON u.email = rt.user_email
      WHERE rt.token_hash = ${token_hash}
      LIMIT 1
    `);
    const row = res?.rows?.[0] as any;
    if (!row) return err('Invalid refresh token', 401);
    if (row.revoked_at) return err('Invalid refresh token', 401);
    const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (!exp || exp < Date.now()) return err('Invalid refresh token', 401);

    // Rotation: revoke old, mint new
    await revokeRefreshToken(db, refreshToken);
    const email = String(row.user_email || '').toLowerCase();
    const tokenOrErr = issueAccessToken({
      email,
      role: String(row.role || 'user').toLowerCase(),
      emailVerified: Boolean(row.email_verified),
    });
    if (tokenOrErr instanceof NextResponse) return tokenOrErr;
    const refresh = await createRefreshToken(db, { email, req });
    return json({
      token: tokenOrErr,
      refresh_token: refresh.token,
      email_verified: Boolean(row.email_verified),
      expires_in: getAccessTtlSeconds(),
    });
  }

  if (p0 === 'logout' && m === 'POST') {
    const db = getDb();
    const body = (await req.json().catch(() => ({}))) as any;
    const refreshToken = String(body?.refresh_token || '').trim();
    if (refreshToken) {
      await revokeRefreshToken(db, refreshToken);
    }
    return json({ ok: true });
  }

  if ((p0 === 'logout-all' || p0 === 'logout_all') && m === 'POST') {
    const u = requireUser(req);
    if (u instanceof NextResponse) return u;
    const db = getDb();
    await revokeAllRefreshTokensForUser(db, u.email);
    return json({ ok: true });
  }

  if (p0 === 'validate' && m === 'POST') {
    const body = (await req.json().catch(() => ({}))) as any;
    const token = String(body?.token || '').trim();
    if (!token) return json({ valid: false, error: 'No token provided' });
    const secret = getJwtSecret();
    if (!secret) return json({ valid: false, error: 'Auth not configured' });
    const claims = verifyJwtHmac(token, secret);
    if (!claims) return json({ valid: false, error: 'Invalid token' });
    return json({ valid: true, claims });
  }

  if (p0 === 'me' && m === 'GET') {
    const u = requireUser(req);
    if (u instanceof NextResponse) return u;
    const db = getDb();
    const res = await db.execute(sql`
      SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
      FROM hit_auth_v2_users
      WHERE email = ${u.email}
      LIMIT 1
    `);
    const row = res?.rows?.[0];
    if (!row) return err('User not found', 404);
    return json(normalizeUserRow(row));
  }

  // ---------------------------------------------------------------------------
  // USERS (admin)
  // ---------------------------------------------------------------------------
  if (p0 === 'users') {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const db = getDb();

    // GET /users (list)
    if (m === 'GET' && !p1) {
      const res = await db.execute(
        sql`SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
            FROM hit_auth_v2_users
            ORDER BY created_at DESC`
      );
      return json((res?.rows || []).map(normalizeUserRow));
    }

    // POST /users (create)
    if (m === 'POST' && !p1) {
      const body = (await req.json().catch(() => ({}))) as any;
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '').trim();
      const role = String(body?.role || (Array.isArray(body?.roles) ? body.roles?.[0] : '') || 'user')
        .trim()
        .toLowerCase();
      const emailVerified = typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : false;

      if (!email || !isEmail(email)) return err('Invalid email', 400);
      if (!password) return err('Password is required', 400);

      const password_hash = await hashPassword(password);
      const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
      const profile_fields =
        body?.profile_fields && typeof body.profile_fields === 'object' ? body.profile_fields : {};

      try {
        const insertRes = await db.execute(sql`
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
      } catch (e: any) {
        const msg = String(e?.message || e || '');
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
          return err('User already exists', 400);
        }
        return err('Failed to create user', 500);
      }
    }

    // User-scoped routes: /users/{email}
    const email = safeDecodePathSegment(p1).trim().toLowerCase();
    if (!email || !isEmail(email)) return err('Invalid user email', 400);

    // GET /users/{email}
    if (m === 'GET') {
      const res = await db.execute(sql`
        SELECT email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
        FROM hit_auth_v2_users
        WHERE email = ${email}
        LIMIT 1
      `);
      const row = res?.rows?.[0];
      if (!row) return err('User not found', 404);
      return json(normalizeUserRow(row));
    }

    // PUT /users/{email}
    if (m === 'PUT') {
      const body = (await req.json().catch(() => ({}))) as any;
      const role = body?.role != null ? String(body.role).trim().toLowerCase() : undefined;
      const locked = typeof body?.locked === 'boolean' ? Boolean(body.locked) : undefined;
      const email_verified =
        typeof body?.email_verified === 'boolean' ? Boolean(body.email_verified) : undefined;
      const profile_fields =
        body?.profile_fields && typeof body.profile_fields === 'object' ? body.profile_fields : undefined;
      const profile_picture_url =
        body?.profile_picture_url != null ? String(body.profile_picture_url).trim() : undefined;

      const res = await db.execute(sql`
        UPDATE hit_auth_v2_users
        SET
          role = COALESCE(${role as any}, role),
          locked = COALESCE(${locked as any}, locked),
          email_verified = COALESCE(${email_verified as any}, email_verified),
          profile_fields = COALESCE(${profile_fields ? (JSON.stringify(profile_fields) as any) : null}::jsonb, profile_fields),
          profile_picture_url = COALESCE(${profile_picture_url as any}, profile_picture_url),
          updated_at = now()
        WHERE email = ${email}
        RETURNING email, email_verified, two_factor_enabled, locked, role, metadata, profile_fields, profile_picture_url, created_at, updated_at, last_login
      `);
      const row = res?.rows?.[0];
      if (!row) return err('User not found', 404);
      return json(normalizeUserRow(row));
    }

    // DELETE /users/{email}
    if (m === 'DELETE') {
      await db.execute(sql`DELETE FROM hit_auth_v2_users WHERE email = ${email}`);
      return json({}, { status: 204 });
    }
  }

  // ---------------------------------------------------------------------------
  // DIRECTORY (admin)
  // ---------------------------------------------------------------------------
  if (m === 'GET' && p0 === 'directory' && (p1 || '').trim() === 'users') {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const db = getDb();
    const res = await db.execute(sql`
      SELECT email, profile_fields
      FROM hit_auth_v2_users
      ORDER BY email ASC
    `);
    const items = (res?.rows || []).map((r: any) => ({
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
    if (u instanceof NextResponse) return u;

    const actionKey = pathSegments
      .slice(3)
      .map((s) => safeDecodePathSegment(String(s || '')).trim())
      .filter(Boolean)
      .join('/');
    if (!actionKey) return json({ has_permission: false, source: 'missing_action_key' }, { status: 200 });

    const db = getDb();

    const actionRes = await db.execute(
      sql`SELECT key, default_enabled FROM hit_auth_v2_permission_actions WHERE key = ${actionKey} LIMIT 1`
    );
    const actionRow = actionRes?.rows?.[0] as any;
    if (!actionRow) {
      return json({ has_permission: false, source: 'unknown_action' }, { status: 200 });
    }

    // 1) User overrides (highest precedence)
    const userOv = await db.execute(sql`
      SELECT enabled
      FROM hit_auth_v2_user_action_overrides
      WHERE user_email = ${u.email} AND action_key = ${actionKey}
      LIMIT 1
    `);
    const uRow = userOv?.rows?.[0] as any;
    if (uRow && typeof uRow.enabled === 'boolean') {
      return json({ has_permission: Boolean(uRow.enabled), source: 'user_override' }, { status: 200 });
    }

    // Resolve role (simple model: admin/user)
    const role = u.roles.includes('admin') ? 'admin' : 'user';

    // Resolve group memberships
    const groupsRes = await db.execute(
      sql`SELECT group_id::text AS id FROM hit_auth_v2_user_groups WHERE user_email = ${u.email}`
    );
    const groupIds = (groupsRes?.rows || [])
      .map((r: any) => String(r?.id || '').trim())
      .filter(Boolean);

    // 2) Permission Set grants (Security Groups)
    let assignmentWhere = sql`(a.principal_type = 'user' AND a.principal_id = ${u.email})
      OR (a.principal_type = 'role' AND a.principal_id = ${role})`;
    if (groupIds.length > 0) {
      assignmentWhere = sql`${assignmentWhere} OR (a.principal_type = 'group' AND a.principal_id IN (${sql.join(
        groupIds.map((gid) => sql`${gid}`),
        sql`, `
      )}))`;
    }

    const ps = await db.execute(sql`
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
      const gp = await db.execute(sql`
        SELECT enabled
        FROM hit_auth_v2_group_action_permissions
        WHERE action_key = ${actionKey}
          AND group_id::text IN (${sql.join(groupIds.map((gid) => sql`${gid}`), sql`, `)})
      `);
      const rows = (gp?.rows || []) as any[];
      if (rows.length > 0) {
        const anyDeny = rows.some((r) => r && r.enabled === false);
        const anyAllow = rows.some((r) => r && r.enabled === true);
        return json(
          { has_permission: anyDeny ? false : anyAllow ? true : false, source: 'group_action_permission' },
          { status: 200 }
        );
      }
    }

    // 4) Role action permissions
    const rp = await db.execute(sql`
      SELECT enabled
      FROM hit_auth_v2_role_action_permissions
      WHERE role = ${role} AND action_key = ${actionKey}
      LIMIT 1
    `);
    const rRow = rp?.rows?.[0] as any;
    if (rRow && typeof rRow.enabled === 'boolean') {
      return json({ has_permission: Boolean(rRow.enabled), source: 'role_action_permission' }, { status: 200 });
    }

    // 5) Default
    return json(
      { has_permission: Boolean(actionRow.default_enabled), source: 'default' },
      { status: 200 }
    );
  }

  // ---------------------------------------------------------------------------
  // PERMISSION SETS (Security Groups) - admin APIs
  // ---------------------------------------------------------------------------
  if (p0 === 'admin' && (p1 || '').trim() === 'permissions' && (pathSegments[2] || '').trim() === 'sets') {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const db = getDb();
    const psId = String(pathSegments[3] || '').trim();
    const sub = String(pathSegments[4] || '').trim();
    const tail = String(pathSegments[5] || '').trim();

    // GET /admin/permissions/sets
    if (m === 'GET' && !psId) {
      const res = await db.execute(sql`
        SELECT id, name, description, template_role, created_at, updated_at
        FROM hit_auth_v2_permission_sets
        ORDER BY updated_at DESC, name ASC
      `);
      return json({ items: res?.rows || [] });
    }

    // POST /admin/permissions/sets
    if (m === 'POST' && !psId) {
      const body = (await req.json().catch(() => ({}))) as any;
      const name = String(body?.name || '').trim();
      const description =
        body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
      const template_role =
        body?.template_role != null && String(body.template_role).trim()
          ? String(body.template_role).trim().toLowerCase()
          : null;
      if (!name) return err('Permission set name is required', 400);
      if (template_role && template_role !== 'admin' && template_role !== 'user') {
        return err('Invalid template_role (must be admin|user)', 400);
      }

      try {
        const ins = await db.execute(sql`
          INSERT INTO hit_auth_v2_permission_sets (name, description, template_role, created_at, updated_at)
          VALUES (${name}, ${description as any}, ${template_role as any}, now(), now())
          RETURNING id, name, description, template_role, created_at, updated_at
        `);
        return json(ins?.rows?.[0] || null, { status: 201 });
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Permission set name already exists', 400);
        return err('Failed to create permission set', 500);
      }
    }

    if (!psId) return err('Permission set id is required', 400);

    // GET /admin/permissions/sets/{psId}
    if (m === 'GET' && !sub) {
      const setRes = await db.execute(sql`
        SELECT id, name, description, template_role, created_at, updated_at
        FROM hit_auth_v2_permission_sets
        WHERE id = ${psId}::uuid
        LIMIT 1
      `);
      const ps = setRes?.rows?.[0];
      if (!ps) return err('Permission set not found', 404);

      const [assignmentsRes, actionsRes, pagesRes, metricsRes] = await Promise.all([
        db.execute(sql`
          SELECT id, permission_set_id, principal_type, principal_id, created_at
          FROM hit_auth_v2_permission_set_assignments
          WHERE permission_set_id = ${psId}::uuid
          ORDER BY created_at DESC
        `),
        db.execute(sql`
          SELECT g.id, g.permission_set_id, g.action_key, g.created_at, a.label, a.description, a.pack_name
          FROM hit_auth_v2_permission_set_action_grants g
          LEFT JOIN hit_auth_v2_permission_actions a ON a.key = g.action_key
          WHERE g.permission_set_id = ${psId}::uuid
          ORDER BY g.created_at DESC
        `),
        db.execute(sql`
          SELECT id, permission_set_id, page_path, created_at
          FROM hit_auth_v2_permission_set_page_grants
          WHERE permission_set_id = ${psId}::uuid
          ORDER BY created_at DESC
        `),
        db.execute(sql`
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
      const body = (await req.json().catch(() => ({}))) as any;
      const name = body?.name != null ? String(body.name).trim() : undefined;
      const description =
        body?.description !== undefined
          ? body?.description != null && String(body.description).trim()
            ? String(body.description).trim()
            : null
          : undefined;
      const template_role =
        body?.template_role !== undefined
          ? body?.template_role != null && String(body.template_role).trim()
            ? String(body.template_role).trim().toLowerCase()
            : null
          : undefined;

      if (template_role !== undefined && template_role !== null && template_role !== 'admin' && template_role !== 'user') {
        return err('Invalid template_role (must be admin|user|null)', 400);
      }
      if (m === 'PUT' && (!name || !name.trim())) return err('Permission set name is required', 400);

      try {
        const upd = await db.execute(sql`
          UPDATE hit_auth_v2_permission_sets
          SET
            name = COALESCE(${(name ?? null) as any}, name),
            description = ${description === undefined ? (sql`description` as any) : (description as any)},
            template_role = ${template_role === undefined ? (sql`template_role` as any) : (template_role as any)},
            updated_at = now()
          WHERE id = ${psId}::uuid
          RETURNING id, name, description, template_role, created_at, updated_at
        `);
        const row = upd?.rows?.[0];
        if (!row) return err('Permission set not found', 404);
        return json(row);
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Permission set name already exists', 400);
        return err('Failed to update permission set', 500);
      }
    }

    // DELETE /admin/permissions/sets/{psId}
    if (m === 'DELETE' && !sub) {
      await db.execute(sql`DELETE FROM hit_auth_v2_permission_sets WHERE id = ${psId}::uuid`);
      return json({}, { status: 204 });
    }

    // POST /admin/permissions/sets/{psId}/assignments
    if (sub === 'assignments' && m === 'POST') {
      const body = (await req.json().catch(() => ({}))) as any;
      const principal_type = String(body?.principal_type || '').trim().toLowerCase();
      const principal_id = String(body?.principal_id || '').trim();
      if (!principal_type || !principal_id) return err('principal_type and principal_id are required', 400);
      if (principal_type !== 'user' && principal_type !== 'group' && principal_type !== 'role') {
        return err('Invalid principal_type (must be user|group|role)', 400);
      }

      if (principal_type === 'user' && !isEmail(principal_id)) return err('Invalid principal_id (email expected)', 400);
      if (principal_type === 'role' && principal_id !== 'admin' && principal_id !== 'user') {
        return err('Invalid principal_id (role must be admin|user)', 400);
      }

      // Best-effort existence checks
      if (principal_type === 'user') {
        const u1 = await db.execute(sql`SELECT 1 FROM hit_auth_v2_users WHERE email = ${principal_id.toLowerCase()} LIMIT 1`);
        if ((u1?.rows || []).length === 0) return err('User not found', 404);
      }
      if (principal_type === 'group') {
        const g1 = await db.execute(sql`SELECT 1 FROM hit_auth_v2_groups WHERE id = ${principal_id}::uuid LIMIT 1`);
        if ((g1?.rows || []).length === 0) return err('Group not found', 404);
      }

      try {
        const ins = await db.execute(sql`
          INSERT INTO hit_auth_v2_permission_set_assignments (permission_set_id, principal_type, principal_id, created_at)
          VALUES (${psId}::uuid, ${principal_type}, ${principal_id.toLowerCase()}, now())
          RETURNING id, permission_set_id, principal_type, principal_id, created_at
        `);
        return json(ins?.rows?.[0] || null, { status: 201 });
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Assignment already exists', 400);
        return err('Failed to create assignment', 500);
      }
    }

    // DELETE /admin/permissions/sets/{psId}/assignments/{assignment_id}
    if (sub === 'assignments' && tail && m === 'DELETE') {
      await db.execute(
        sql`DELETE FROM hit_auth_v2_permission_set_assignments WHERE id = ${tail}::uuid AND permission_set_id = ${psId}::uuid`
      );
      return json({}, { status: 204 });
    }

    // POST /admin/permissions/sets/{psId}/actions
    if (sub === 'actions' && m === 'POST') {
      const body = (await req.json().catch(() => ({}))) as any;
      const action_key = String(body?.action_key || body?.actionKey || '').trim();
      if (!action_key) return err('action_key is required', 400);

      // Ensure action exists (auto-register minimal record if missing)
      const a0 = await db.execute(sql`SELECT 1 FROM hit_auth_v2_permission_actions WHERE key = ${action_key} LIMIT 1`);
      if ((a0?.rows || []).length === 0) {
        await db.execute(sql`
          INSERT INTO hit_auth_v2_permission_actions (key, pack_name, label, description, default_enabled, created_at, updated_at)
          VALUES (${action_key}, NULL, '', NULL, false, now(), now())
          ON CONFLICT (key) DO NOTHING
        `);
      }

      try {
        const ins = await db.execute(sql`
          INSERT INTO hit_auth_v2_permission_set_action_grants (permission_set_id, action_key, created_at)
          VALUES (${psId}::uuid, ${action_key}, now())
          RETURNING id, permission_set_id, action_key, created_at
        `);
        return json(ins?.rows?.[0] || null, { status: 201 });
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Action grant already exists', 400);
        return err('Failed to create action grant', 500);
      }
    }

    // DELETE /admin/permissions/sets/{psId}/actions/{grant_id}
    if (sub === 'actions' && tail && m === 'DELETE') {
      await db.execute(
        sql`DELETE FROM hit_auth_v2_permission_set_action_grants WHERE id = ${tail}::uuid AND permission_set_id = ${psId}::uuid`
      );
      return json({}, { status: 204 });
    }
  }

  // ---------------------------------------------------------------------------
  // PERMISSION ACTIONS (registry) - admin APIs
  // ---------------------------------------------------------------------------
  if (p0 === 'admin' && (p1 || '').trim() === 'permissions' && (pathSegments[2] || '').trim() === 'actions') {
    const gate = requireAdmin(req);
    if (gate) return gate;

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
      const whereParts: any[] = [];
      if (pack) {
        whereParts.push(sql`LOWER(COALESCE(pack_name, '')) = ${pack}`);
      }
      if (search) {
        const like = `%${search}%`;
        whereParts.push(
          sql`(LOWER(key) LIKE ${like} OR LOWER(COALESCE(label, '')) LIKE ${like} OR LOWER(COALESCE(description, '')) LIKE ${like})`
        );
      }
      const whereClause =
        whereParts.length > 0 ? sql`WHERE ${sql.join(whereParts, sql` AND `)}` : sql``;

      const [itemsRes, countRes] = await Promise.all([
        db.execute(sql`
          SELECT key, pack_name, label, description, default_enabled, created_at, updated_at
          FROM hit_auth_v2_permission_actions
          ${whereClause}
          ORDER BY key ASC
          LIMIT ${pageSize} OFFSET ${offset}
        `),
        db.execute(sql`
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
      const body = (await req.json().catch(() => ({}))) as any;
      const key = String(body?.key || '').trim();
      const pack_name = body?.pack_name != null && String(body.pack_name).trim() ? String(body.pack_name).trim() : null;
      const label = body?.label != null ? String(body.label) : '';
      const description =
        body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
      const default_enabled =
        typeof body?.default_enabled === 'boolean' ? Boolean(body.default_enabled) : false;

      if (!key) return err('key is required', 400);
      if (key.length > 200) return err('key is too long', 400);

      const res = await db.execute(sql`
        INSERT INTO hit_auth_v2_permission_actions (
          key, pack_name, label, description, default_enabled, created_at, updated_at
        ) VALUES (
          ${key}, ${pack_name as any}, ${label}, ${description as any}, ${default_enabled}, now(), now()
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
      if (!key) return err('Invalid action key', 400);
      await db.execute(sql`DELETE FROM hit_auth_v2_permission_actions WHERE key = ${key}`);
      return json({}, { status: 204 });
    }
  }

  // ---------------------------------------------------------------------------
  // GROUPS (admin + me)
  // ---------------------------------------------------------------------------
  if (p0 === 'admin' && (p1 || '').trim() === 'groups') {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const db = getDb();
    const p2 = pathSegments[2] || ''; // group_id
    const p3 = pathSegments[3] || '';

    // GET /admin/groups (list)
    if (m === 'GET' && !p2) {
      const res = await db.execute(sql`
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
      const body = (await req.json().catch(() => ({}))) as any;
      const name = String(body?.name || '').trim();
      const description =
        body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
      const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
      if (!name) return err('Group name is required', 400);

      try {
        const ins = await db.execute(sql`
          INSERT INTO hit_auth_v2_groups (name, description, metadata, created_at, updated_at)
          VALUES (${name}, ${description as any}, ${JSON.stringify(metadata)}::jsonb, now(), now())
          RETURNING id, name, description, metadata, created_at, updated_at
        `);
        const row = ins?.rows?.[0];
        return json({ ...normalizeGroupRow({ ...row, user_count: 0 }) }, { status: 201 });
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Group name already exists', 400);
        return err('Failed to create group', 500);
      }
    }

    // /admin/groups/{group_id}
    const gid = String(p2 || '').trim();
    if (!gid) return err('Invalid group id', 400);

    // GET /admin/groups/{group_id}
    if (m === 'GET' && !p3) {
      const res = await db.execute(sql`
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
      if (!row) return err('Group not found', 404);
      return json(normalizeGroupRow(row));
    }

    // PUT /admin/groups/{group_id}
    if (m === 'PUT' && !p3) {
      const body = (await req.json().catch(() => ({}))) as any;
      const name = body?.name != null ? String(body.name).trim() : '';
      const description =
        body?.description != null && String(body.description).trim() ? String(body.description).trim() : null;
      const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;
      if (!name) return err('Group name is required', 400);

      try {
        const upd = await db.execute(sql`
          UPDATE hit_auth_v2_groups
          SET
            name = ${name},
            description = ${description as any},
            metadata = COALESCE(${metadata ? (JSON.stringify(metadata) as any) : null}::jsonb, metadata),
            updated_at = now()
          WHERE id = ${gid}::uuid
          RETURNING id, name, description, metadata, created_at, updated_at
        `);
        const row = upd?.rows?.[0];
        if (!row) return err('Group not found', 404);
        // user_count is derived; compute quickly
        const cnt = await db.execute(
          sql`SELECT COUNT(*)::int AS c FROM hit_auth_v2_user_groups WHERE group_id = ${gid}::uuid`
        );
        const user_count = Number(cnt?.rows?.[0]?.c || 0);
        return json(normalizeGroupRow({ ...row, user_count }));
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) return err('Group name already exists', 400);
        return err('Failed to update group', 500);
      }
    }

    // DELETE /admin/groups/{group_id}
    if (m === 'DELETE' && !p3) {
      await db.execute(sql`DELETE FROM hit_auth_v2_groups WHERE id = ${gid}::uuid`);
      return json({}, { status: 204 });
    }

    // GET /admin/groups/{group_id}/users
    if (m === 'GET' && p3 === 'users') {
      const res = await db.execute(sql`
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
      if (gate) return gate;
      const email = safeDecodePathSegment(p2).trim().toLowerCase();
      if (!email || !isEmail(email)) return err('Invalid user email', 400);

      const db = getDb();
      const res = await db.execute(sql`
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
    if (u instanceof NextResponse) return u;

    const db = getDb();
    const res = await db.execute(sql`
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


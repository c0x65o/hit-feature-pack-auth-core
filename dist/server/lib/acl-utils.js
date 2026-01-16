let _warnedNoRequest = false;
let _warnedNoAuthForMeGroups = false;
let _warnedNoAuthForMeGroupsOnce = false;
let _warnedAdminGroupsForbidden = false;
let _adminGroupsEndpointForbidden = false;
let _warnedNoOrgRequestOnce = false;
function warnOnce(kind, msg) {
    if (kind === 'no_request') {
        if (_warnedNoRequest)
            return;
        _warnedNoRequest = true;
    }
    else if (kind === 'no_auth_for_me_groups') {
        if (_warnedNoAuthForMeGroupsOnce)
            return;
        _warnedNoAuthForMeGroupsOnce = true;
    }
    // eslint-disable-next-line no-console
    console.warn(msg);
}
function warnAdminGroupsForbiddenOnce(msg) {
    if (_warnedAdminGroupsForbidden)
        return;
    _warnedAdminGroupsForbidden = true;
    // eslint-disable-next-line no-console
    console.warn(msg);
}
function warnNoOrgRequestOnce(msg) {
    if (_warnedNoOrgRequestOnce)
        return;
    _warnedNoOrgRequestOnce = true;
    // eslint-disable-next-line no-console
    console.warn(msg);
}
function uniqStrings(xs) {
    const out = [];
    const seen = new Set();
    for (const raw of xs) {
        const s = String(raw || '').trim();
        if (!s)
            continue;
        if (seen.has(s))
            continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}
function baseUrlFromRequest(request) {
    const proto = request.headers.get('x-forwarded-proto') ||
        request.nextUrl?.protocol?.replace(':', '') ||
        'http';
    const host = request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        request.nextUrl?.host ||
        '';
    return `${proto}://${host}`;
}
function getBearerFromRequest(request) {
    const authz = request.headers.get('authorization');
    if (authz?.startsWith('Bearer '))
        return authz;
    const cookie = request.headers.get('cookie') || '';
    if (!cookie)
        return null;
    const parts = cookie.split(';').map((c) => c.trim());
    for (const p of parts) {
        const eqIdx = p.indexOf('=');
        if (eqIdx <= 0)
            continue;
        const name = p.slice(0, eqIdx);
        const value = p.slice(eqIdx + 1);
        if (name === 'hit_token' && value) {
            return `Bearer ${value}`;
        }
    }
    return null;
}
export function getAuthBaseUrl(request) {
    // Auth is app-local (Next.js API dispatcher under /api/auth).
    if (request)
        return `${baseUrlFromRequest(request)}/api/auth`;
    return '/api/auth';
}
export function getOrgBaseUrl(request) {
    // Org (LDD) is also app-local under /api/org.
    if (request)
        return `${baseUrlFromRequest(request)}/api/org`;
    return '/api/org';
}
async function fetchAuthMeGroupIds(request, strict) {
    const authBase = getAuthBaseUrl(request);
    if (!authBase) {
        if (strict)
            throw new Error('[acl-utils] Auth base URL not configured (/api/auth).');
        return [];
    }
    const headers = {
        'Content-Type': 'application/json',
    };
    // Auth module needs to know the dashboard origin so it can call downstream APIs (e.g. metrics-core segments).
    headers['X-Frontend-Base-URL'] = baseUrlFromRequest(request);
    const bearer = getBearerFromRequest(request);
    if (bearer)
        headers.Authorization = bearer;
    const res = await fetch(`${authBase}/me/groups`, { headers });
    if (!res.ok) {
        if (strict)
            throw new Error(`[acl-utils] GET ${authBase}/me/groups failed: ${res.status} ${res.statusText}`);
        return [];
    }
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) {
        if (strict)
            throw new Error('[acl-utils] /me/groups returned a non-array response.');
        return [];
    }
    const ids = [];
    for (const row of data) {
        // Auth module uses `group_id` in MeGroupResponse.
        const gid = row?.group_id ?? row?.groupId ?? null;
        if (gid)
            ids.push(String(gid));
    }
    return ids;
}
async function fetchOrgMeScope(request, strict) {
    const orgBase = getOrgBaseUrl(request);
    if (!orgBase) {
        if (strict)
            throw new Error('[acl-utils] Org base URL not configured (/api/org).');
        return { divisionIds: [], departmentIds: [], locationIds: [] };
    }
    const headers = {
        'Content-Type': 'application/json',
    };
    const bearer = getBearerFromRequest(request);
    if (bearer)
        headers.Authorization = bearer;
    const res = await fetch(`${orgBase}/me/scope`, { headers });
    if (!res.ok) {
        if (strict)
            throw new Error(`[acl-utils] GET ${orgBase}/me/scope failed: ${res.status} ${res.statusText}`);
        return { divisionIds: [], departmentIds: [], locationIds: [] };
    }
    const data = await res.json().catch(() => null);
    const divisionIds = Array.isArray(data?.divisionIds) ? data.divisionIds : [];
    const departmentIds = Array.isArray(data?.departmentIds) ? data.departmentIds : [];
    const locationIds = Array.isArray(data?.locationIds) ? data.locationIds : [];
    return {
        divisionIds: uniqStrings(divisionIds),
        departmentIds: uniqStrings(departmentIds),
        locationIds: uniqStrings(locationIds),
    };
}
/**
 * Resolve the current user's org scope (L/D/D ids).
 *
 * This is used for "share with a location/division/department" style features.
 */
export async function resolveUserOrgScope(options) {
    const { request, strict = false } = options;
    if (!request) {
        if (strict) {
            throw new Error('[acl-utils] Cannot resolve org scope without a request (needed to reach /api/org/me/scope or forward auth headers).');
        }
        warnNoOrgRequestOnce('[acl-utils] resolveUserOrgScope(): request not provided; org scope will be empty.');
        return { divisionIds: [], departmentIds: [], locationIds: [] };
    }
    try {
        return await fetchOrgMeScope(request, strict);
    }
    catch (e) {
        if (strict)
            throw e;
        return { divisionIds: [], departmentIds: [], locationIds: [] };
    }
}
// Kept for backwards compatibility / future use: some deployments may still hit this.
async function fetchAuthAdminUserGroupIds(request, userEmail, strict) {
    // If we've already learned this endpoint is forbidden in this deployment,
    // don't keep retrying on every request.
    if (_adminGroupsEndpointForbidden) {
        return [];
    }
    const authBase = getAuthBaseUrl(request);
    if (!authBase) {
        if (strict)
            throw new Error('[acl-utils] Auth base URL not configured (/api/auth).');
        return [];
    }
    const email = String(userEmail || '').trim().toLowerCase();
    if (!email)
        return [];
    const headers = {
        'Content-Type': 'application/json',
    };
    // Same as above: required so auth can reach metrics-core segment APIs.
    headers['X-Frontend-Base-URL'] = baseUrlFromRequest(request);
    // Forward caller auth (required for admin endpoint access).
    const bearer = getBearerFromRequest(request);
    if (bearer)
        headers.Authorization = bearer;
    const res = await fetch(`${authBase}/admin/users/${encodeURIComponent(email)}/groups`, { headers });
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            _adminGroupsEndpointForbidden = true;
            warnAdminGroupsForbiddenOnce(`[acl-utils] ${res.status} from ${authBase}/admin/users/{email}/groups. ` +
                `Disabling admin-group expansion and relying on /me/groups instead.`);
            return [];
        }
        if (strict)
            throw new Error(`[acl-utils] GET ${authBase}/admin/users/{email}/groups failed: ${res.status} ${res.statusText}`);
        return [];
    }
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) {
        if (strict)
            throw new Error('[acl-utils] /admin/users/{email}/groups returned a non-array response.');
        return [];
    }
    const ids = [];
    for (const row of data) {
        // Auth module uses `group_id` in UserGroupResponse.
        const gid = row?.group_id ?? row?.groupId ?? null;
        if (gid)
            ids.push(String(gid));
    }
    return ids;
}
/**
 * Resolve the current user's principals for ACL checks.
 *
 * Key behavior:
 * - Always includes userId + email + roles from the JWT claims.
 * - Optionally expands groups via auth module `/me/groups` (includes dynamic groups like "Everyone").
 * - Supports feature-pack-specific extra group sources.
 */
export async function resolveUserPrincipals(options) {
    const { request, user, includeTokenGroups = true, includeAuthMeGroups = true, strict = false, extraGroupIds, } = options;
    const userId = String(user.sub || '').trim();
    const userEmailRaw = String(user.email || '').trim();
    // In some deployments the JWT may omit `email` but set `sub` to the email address.
    // Dynamic group evaluation in auth module is email-based, so recover it when possible.
    const userEmail = userEmailRaw ||
        (userId.includes('@') ? userId : '');
    const roles = uniqStrings(Array.isArray(user.roles) ? user.roles : []);
    const groupIds = [];
    if (includeTokenGroups) {
        groupIds.push(...(Array.isArray(user.groups) ? user.groups : []));
    }
    if (includeAuthMeGroups) {
        if (!request) {
            if (strict) {
                throw new Error('[acl-utils] Cannot resolve auth groups without a request (needed to reach /api/auth or forward auth headers).');
            }
            warnOnce('no_request', '[acl-utils] resolveUserPrincipals(): request not provided; dynamic groups will not be resolved.');
        }
        else {
            const bearer = getBearerFromRequest(request);
            if (!bearer) {
                if (strict) {
                    throw new Error('[acl-utils] Cannot authenticate to auth module for group resolution (no Authorization/ hit_token cookie).');
                }
                warnOnce('no_auth_for_me_groups', '[acl-utils] resolveUserPrincipals(): no bearer/cookie auth; dynamic groups may be missing.');
            }
            // /me/groups (user-auth) — best effort unless strict.
            try {
                groupIds.push(...(await fetchAuthMeGroupIds(request, strict)));
            }
            catch (e) {
                if (strict)
                    throw e;
            }
        }
    }
    // NOTE: Do NOT call auth admin endpoints for group membership here.
    // `/admin/users/{email}/groups` is admin-gated and will return 403 for normal users.
    // Dynamic groups are included in `/me/groups` (when enabled) and that endpoint is what callers should use.
    //
    // fetchAuthAdminUserGroupIds() remains available for migrations / special deployments, but is intentionally unused.
    void fetchAuthAdminUserGroupIds;
    if (extraGroupIds) {
        try {
            groupIds.push(...(await extraGroupIds()));
        }
        catch (e) {
            if (strict)
                throw e;
        }
    }
    return {
        userId,
        userEmail,
        roles,
        groupIds: uniqStrings(groupIds),
    };
}
//# sourceMappingURL=acl-utils.js.map
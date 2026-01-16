import { checkActionPermissionV2 } from './auth-proxy-v2';
import { NextResponse } from 'next/server';
const actionCheckCache = new WeakMap();
function getLogPrefix(options) {
    const raw = String(options?.logPrefix || '').trim();
    return raw || 'Authz';
}
function getCachedResult(request, actionKey) {
    const map = actionCheckCache.get(request);
    if (!map)
        return null;
    return map.get(actionKey) || null;
}
function setCachedResult(request, actionKey, result) {
    const map = actionCheckCache.get(request) || new Map();
    map.set(actionKey, result);
    actionCheckCache.set(request, map);
}
async function checkActionViaV2(request, actionKey, options) {
    const debug = options?.debug === true;
    const logPrefix = getLogPrefix(options);
    const res = await checkActionPermissionV2(request, actionKey);
    if ('errorResponse' in res) {
        const status = res.errorResponse.status || 500;
        if (debug) {
            console.log(`[${logPrefix} Action Check] ${actionKey}: Auth returned status ${status}`);
        }
        if (status === 401)
            return { ok: false, source: 'unauthenticated' };
        return { ok: false, source: `auth_status_${status}` };
    }
    return { ok: res.ok, source: res.source };
}
export async function checkActionPermission(request, actionKey, options) {
    const cached = getCachedResult(request, actionKey);
    if (cached)
        return cached;
    const result = await checkActionViaV2(request, actionKey, options);
    setCachedResult(request, actionKey, result);
    return result;
}
export async function requireActionPermission(request, actionKey, options) {
    const result = await checkActionPermission(request, actionKey, options);
    if (result.ok)
        return null;
    const unauthorized = result.source === 'unauthenticated' || result.source === 'auth_status_401';
    const status = unauthorized ? 401 : 403;
    const error = status === 401 ? 'Unauthorized' : 'Not authorized';
    return NextResponse.json({
        error,
        action: actionKey,
    }, { status });
}
//# sourceMappingURL=action-check.js.map
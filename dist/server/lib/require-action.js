import { NextResponse } from 'next/server';
import { checkActionPermission, requireActionPermission, } from '@hit/feature-pack-auth-core/server/lib/action-check';
import { resolveAuthCoreScopeMode } from '@hit/feature-pack-auth-core/server/lib/scope-mode';
export async function checkAuthCoreAction(request, actionKey) {
    return checkActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}
export async function requireAuthCoreAction(request, actionKey) {
    return requireActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}
export async function checkAuthCoreReadScope(request) {
    const authCheck = await checkActionPermission(request, 'auth-core.read.scope.none', {
        logPrefix: 'Auth-Core',
    });
    if (!authCheck.ok && (authCheck.source === 'unauthenticated' || authCheck.source === 'auth_status_401')) {
        return authCheck;
    }
    const mode = await resolveAuthCoreScopeMode(request, { verb: 'read' });
    return { ok: mode !== 'none', source: `scope_${mode}` };
}
export async function requireAuthCoreReadScope(request) {
    const result = await checkAuthCoreReadScope(request);
    if (result.ok)
        return null;
    const unauthorized = result.source === 'unauthenticated' || result.source === 'auth_status_401';
    const status = unauthorized ? 401 : 403;
    const error = status === 401 ? 'Unauthorized' : 'Not authorized';
    return NextResponse.json({
        error,
        scope: 'auth-core.read.scope',
    }, { status });
}
//# sourceMappingURL=require-action.js.map
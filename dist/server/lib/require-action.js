import { checkActionPermission, requireActionPermission, } from '@hit/feature-pack-auth-core/server/lib/action-check';
export async function checkAuthCoreAction(request, actionKey) {
    return checkActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}
export async function requireAuthCoreAction(request, actionKey) {
    return requireActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}
//# sourceMappingURL=require-action.js.map
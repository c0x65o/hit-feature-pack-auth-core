import { checkAuthCoreAction } from './require-action';
/**
 * Resolve effective scope mode using a tree:
 * - entity override: auth-core.{entity}.{verb}.scope.{mode}
 * - auth-core default:     auth-core.{verb}.scope.{mode}
 * - fallback:        own
 *
 * Precedence if multiple are granted: most restrictive wins.
 */
export async function resolveAuthCoreScopeMode(request, args) {
    const { entity, verb } = args;
    const entityPrefix = entity ? `auth-core.${entity}.${verb}.scope` : `auth-core.${verb}.scope`;
    const globalPrefix = `auth-core.${verb}.scope`;
    // Most restrictive wins (first match returned).
    const modes = ['none', 'own', 'ldd', 'any'];
    for (const m of modes) {
        const res = await checkAuthCoreAction(request, `${entityPrefix}.${m}`);
        if (res.ok)
            return m;
    }
    for (const m of modes) {
        const res = await checkAuthCoreAction(request, `${globalPrefix}.${m}`);
        if (res.ok)
            return m;
    }
    return 'own';
}
//# sourceMappingURL=scope-mode.js.map
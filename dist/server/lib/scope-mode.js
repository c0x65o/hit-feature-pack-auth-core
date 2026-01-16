import { checkActionPermission } from './action-check';
/**
 * Resolve effective scope mode using a tree:
 * - entity override: {pack}.{entity}.{verb}.scope.{mode}
 * - pack default:    {pack}.{verb}.scope.{mode}
 * - fallback:        fallbackMode (default "own")
 *
 * Precedence if multiple are granted: most restrictive wins.
 *
 * Legacy back-compat (deprecated):
 * - Treat `.scope.any` as `.scope.all`.
 */
export async function resolveScopeMode(request, args) {
    const pack = String(args.pack || '').trim();
    const verb = args.verb;
    const entity = args.entity ? String(args.entity).trim() : '';
    const logPrefix = args.logPrefix || 'Scope';
    const fallbackMode = args.fallbackMode ?? 'own';
    if (!pack)
        return fallbackMode;
    const entityPrefix = entity ? `${pack}.${entity}.${verb}.scope` : '';
    const packPrefix = `${pack}.${verb}.scope`;
    // Most restrictive wins (first match returned).
    const modes = args.supportedModes?.length
        ? args.supportedModes
        : ['none', 'own', 'ldd_all', 'location', 'department', 'division', 'ldd_any', 'all'];
    const check = async (key) => checkActionPermission(request, key, { logPrefix });
    const checkPrefix = async (prefix) => {
        for (const m of modes) {
            if (m === 'all') {
                const allRes = await check(`${prefix}.all`);
                if (allRes.ok)
                    return 'all';
                const anyRes = await check(`${prefix}.any`);
                if (anyRes.ok)
                    return 'all';
                continue;
            }
            const res = await check(`${prefix}.${m}`);
            if (res.ok)
                return m;
        }
        return null;
    };
    if (entityPrefix) {
        const m = await checkPrefix(entityPrefix);
        if (m)
            return m;
    }
    const m = await checkPrefix(packPrefix);
    if (m)
        return m;
    return fallbackMode;
}
/**
 * Resolve effective scope mode using a tree:
 * - entity override: auth-core.{entity}.{verb}.scope.{mode}
 * - auth-core default:     auth-core.{verb}.scope.{mode}
 * - fallback:        own
 *
 * Precedence if multiple are granted: most restrictive wins.
 */
export async function resolveAuthCoreScopeMode(request, args) {
    return resolveScopeMode(request, {
        pack: 'auth-core',
        verb: args.verb,
        entity: args.entity,
        fallbackMode: 'own',
        logPrefix: 'Auth-Core',
    });
}
//# sourceMappingURL=scope-mode.js.map
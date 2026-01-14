import { NextRequest } from 'next/server';
export type ScopeMode = 'none' | 'own' | 'location' | 'department' | 'division' | 'all';
export type ScopeVerb = 'read' | 'write' | 'delete';
export type ScopeEntity = 'locations' | 'divisions' | 'departments' | 'assignments';
/**
 * Resolve effective scope mode using a tree:
 * - entity override: auth-core.{entity}.{verb}.scope.{mode}
 * - auth-core default:     auth-core.{verb}.scope.{mode}
 * - fallback:        own
 *
 * Precedence if multiple are granted: most restrictive wins.
 */
export declare function resolveAuthCoreScopeMode(request: NextRequest, args: {
    entity?: ScopeEntity;
    verb: ScopeVerb;
}): Promise<ScopeMode>;
//# sourceMappingURL=scope-mode.d.ts.map
import { NextRequest } from 'next/server';
export type ScopeMode = 'none' | 'own' | 'location' | 'department' | 'division' | 'all';
export type ScopeVerb = 'read' | 'write' | 'delete';
export type ScopeEntity = 'locations' | 'divisions' | 'departments' | 'assignments';
export type ResolveScopeModeArgs = {
    /**
     * Pack name used in action keys (e.g. "auth-core", "job-core", "notepad").
     */
    pack: string;
    /**
     * Scope verb.
     */
    verb: ScopeVerb;
    /**
     * Optional entity key used in action keys (e.g. "tasks", "notes", "locations").
     */
    entity?: string;
    /**
     * Optional subset of supported modes for this entity.
     * Example: system entities often only support none/all.
     */
    supportedModes?: ScopeMode[];
    /**
     * Fallback when no action keys are granted.
     * Default: "own" (matches user template behavior).
     */
    fallbackMode?: ScopeMode;
    /**
     * Log prefix used for debugging.
     */
    logPrefix?: string;
};
/**
 * Resolve effective scope mode using a tree:
 * - entity override: {pack}.{entity}.{verb}.scope.{mode}
 * - pack default:    {pack}.{verb}.scope.{mode}
 * - fallback:        fallbackMode (default "own")
 *
 * Precedence if multiple are granted: most restrictive wins.
 *
 * Back-compat:
 * - Treat `.scope.any` as `.scope.all`.
 */
export declare function resolveScopeMode(request: NextRequest, args: ResolveScopeModeArgs): Promise<ScopeMode>;
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
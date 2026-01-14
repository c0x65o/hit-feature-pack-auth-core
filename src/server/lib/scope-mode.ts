import { NextRequest } from 'next/server';
import { checkAuthCoreAction } from './require-action';

// Scope modes for LDD-enabled permission trees.
// - own is the default for user templates
// - all means full access (no L/D/D scoping)
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
export async function resolveAuthCoreScopeMode(
  request: NextRequest,
  args: { entity?: ScopeEntity; verb: ScopeVerb }
): Promise<ScopeMode> {
  const { entity, verb } = args;
  const entityPrefix = entity ? `auth-core.${entity}.${verb}.scope` : `auth-core.${verb}.scope`;
  const globalPrefix = `auth-core.${verb}.scope`;

  // Most restrictive wins (first match returned).
  const modes: ScopeMode[] = ['none', 'own', 'location', 'department', 'division', 'all'];

  for (const m of modes) {
    const res = await checkAuthCoreAction(request, `${entityPrefix}.${m}`);
    if (res.ok) return m;
  }

  for (const m of modes) {
    const res = await checkAuthCoreAction(request, `${globalPrefix}.${m}`);
    if (res.ok) return m;
  }

  return 'own';
}

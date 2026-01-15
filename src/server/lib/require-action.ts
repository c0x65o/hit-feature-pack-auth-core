import { NextRequest, NextResponse } from 'next/server';
import type { ActionCheckResult } from '@hit/feature-pack-auth-core/server/lib/action-check';
import {
  checkActionPermission,
  requireActionPermission,
} from '@hit/feature-pack-auth-core/server/lib/action-check';
import { resolveAuthCoreScopeMode } from '@hit/feature-pack-auth-core/server/lib/scope-mode';

export async function checkAuthCoreAction(
  request: NextRequest,
  actionKey: string
): Promise<ActionCheckResult> {
  return checkActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}

export async function requireAuthCoreAction(
  request: NextRequest,
  actionKey: string
): Promise<NextResponse | null> {
  return requireActionPermission(request, actionKey, { logPrefix: 'Auth-Core' });
}

export async function checkAuthCoreReadScope(request: NextRequest): Promise<ActionCheckResult> {
  const authCheck = await checkActionPermission(request, 'auth-core.read.scope.none', {
    logPrefix: 'Auth-Core',
  });
  if (!authCheck.ok && (authCheck.source === 'unauthenticated' || authCheck.source === 'auth_status_401')) {
    return authCheck;
  }

  if (process.env.HIT_AUTH_DISABLE_SCOPES === '1') {
    return { ok: true, source: 'scope_disabled' };
  }

  const mode = await resolveAuthCoreScopeMode(request, { verb: 'read' });
  return { ok: mode !== 'none', source: `scope_${mode}` };
}

export async function requireAuthCoreReadScope(
  request: NextRequest
): Promise<NextResponse | null> {
  const result = await checkAuthCoreReadScope(request);
  if (result.ok) return null;

  const unauthorized =
    result.source === 'unauthenticated' || result.source === 'auth_status_401';
  const status = unauthorized ? 401 : 403;
  const error = status === 401 ? 'Unauthorized' : 'Not authorized';

  return NextResponse.json(
    {
      error,
      scope: 'auth-core.read.scope',
    },
    { status }
  );
}

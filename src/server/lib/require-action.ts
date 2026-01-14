import { NextRequest, NextResponse } from 'next/server';
import type { ActionCheckResult } from '@hit/feature-pack-auth-core/server/lib/action-check';
import {
  checkActionPermission,
  requireActionPermission,
} from '@hit/feature-pack-auth-core/server/lib/action-check';

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

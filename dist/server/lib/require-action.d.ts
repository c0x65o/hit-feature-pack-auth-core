import { NextRequest, NextResponse } from 'next/server';
import type { ActionCheckResult } from '@hit/feature-pack-auth-core/server/lib/action-check';
export declare function checkAuthCoreAction(request: NextRequest, actionKey: string): Promise<ActionCheckResult>;
export declare function requireAuthCoreAction(request: NextRequest, actionKey: string): Promise<NextResponse | null>;
export declare function checkAuthCoreReadScope(request: NextRequest): Promise<ActionCheckResult>;
export declare function requireAuthCoreReadScope(request: NextRequest): Promise<NextResponse | null>;
//# sourceMappingURL=require-action.d.ts.map
import { NextRequest, NextResponse } from 'next/server';
export type ActionPermissionCheckV2 = {
    ok: boolean;
    source: string;
} | {
    errorResponse: NextResponse;
};
export declare function checkActionPermissionV2(req: NextRequest, actionKey: string): Promise<ActionPermissionCheckV2>;
/**
 * Auth Handler (TypeScript-only)
 *
 * All auth routes are app-local under `/api/auth/*`.
 *
 * Return:
 * - NextResponse if handled
 * - null if not handled (caller returns 404)
 */
export declare function tryHandleAuthV2Proxy(opts: {
    req: NextRequest;
    pathSegments: string[];
    method: string;
}): Promise<NextResponse | null>;
//# sourceMappingURL=auth-proxy-v2.d.ts.map
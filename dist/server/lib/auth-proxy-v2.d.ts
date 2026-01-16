import { NextRequest, NextResponse } from 'next/server';
export type AuthBackendMode = 'python' | 'ts';
export type ActionPermissionCheckV2 = {
    ok: boolean;
    source: string;
} | {
    errorResponse: NextResponse;
};
export declare function checkActionPermissionV2(req: NextRequest, actionKey: string): Promise<ActionPermissionCheckV2>;
/**
 * V2 Auth Proxy Handler (TypeScript-only)
 *
 * Used to incrementally replace the Python auth module behind the existing
 * Historical note: earlier iterations routed auth through a proxy path.
 * Canonical auth routes are now app-local under `/api/auth/*`.
 *
 * Return:
 * - NextResponse if handled by V2
 * - null if not handled (caller may return 501 or proxy to Python depending on app mode)
 */
export declare function tryHandleAuthV2Proxy(opts: {
    req: NextRequest;
    pathSegments: string[];
    method: string;
}): Promise<NextResponse | null>;
//# sourceMappingURL=auth-proxy-v2.d.ts.map
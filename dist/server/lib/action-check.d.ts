import { NextRequest, NextResponse } from 'next/server';
export type ActionCheckResult = {
    ok: boolean;
    source?: string;
};
export type ActionCheckOptions = {
    debug?: boolean;
    logPrefix?: string;
};
export declare function checkActionPermission(request: NextRequest, actionKey: string, options?: ActionCheckOptions): Promise<ActionCheckResult>;
export declare function requireActionPermission(request: NextRequest, actionKey: string, options?: ActionCheckOptions): Promise<NextResponse | null>;
//# sourceMappingURL=action-check.d.ts.map
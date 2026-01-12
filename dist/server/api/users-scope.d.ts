import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/users/[userKey]/scope
 * Get org scope for a specific user (admin only)
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=users-scope.d.ts.map
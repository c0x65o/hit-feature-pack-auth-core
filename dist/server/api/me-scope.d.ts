import { NextRequest, NextResponse } from "next/server";
import type { OrgScope } from "../../schema/org-dimensions";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/me/scope
 * Get the current user's org scope (divisions, departments, locations)
 *
 * This is the primary endpoint for resolving a user's org dimensions for ACL checks.
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<OrgScope>>;
//# sourceMappingURL=me-scope.d.ts.map
import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/assignments
 * List user org assignments
 *
 * Filters:
 * - userKey: filter by user
 * - divisionId: filter by division
 * - departmentId: filter by department
 * - locationId: filter by location
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
}>>;
/**
 * POST /api/org/assignments
 * Create a new user org assignment
 */
export declare function POST(request: NextRequest): Promise<Response>;
//# sourceMappingURL=assignments.d.ts.map
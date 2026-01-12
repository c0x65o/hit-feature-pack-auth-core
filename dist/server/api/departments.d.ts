import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/departments
 * List all departments
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>>;
/**
 * POST /api/org/departments
 * Create a new department
 */
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=departments.d.ts.map
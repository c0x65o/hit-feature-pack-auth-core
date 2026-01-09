import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/departments
 * List all departments
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * POST /api/org/departments
 * Create a new department
 */
export declare function POST(request: NextRequest): Promise<Response>;
//# sourceMappingURL=departments.d.ts.map
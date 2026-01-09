import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/divisions
 * List all divisions
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * POST /api/org/divisions
 * Create a new division
 */
export declare function POST(request: NextRequest): Promise<Response>;
//# sourceMappingURL=divisions.d.ts.map
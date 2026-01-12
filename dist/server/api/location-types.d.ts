import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/location-types
 * List all location types
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
/**
 * POST /api/org/location-types
 * Create a new location type
 */
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=location-types.d.ts.map
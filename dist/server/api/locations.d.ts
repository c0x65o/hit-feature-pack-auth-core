import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/locations
 * List all locations
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * POST /api/org/locations
 * Create a new location
 */
export declare function POST(request: NextRequest): Promise<Response>;
//# sourceMappingURL=locations.d.ts.map
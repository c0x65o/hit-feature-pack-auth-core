import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/locations/[id]
 * Get a single location by ID
 */
export declare function GET(request: NextRequest): Promise<NextResponse<any>>;
/**
 * PUT /api/org/locations/[id]
 * Update a location
 */
export declare function PUT(request: NextRequest): Promise<NextResponse<any>>;
/**
 * DELETE /api/org/locations/[id]
 * Delete a location
 */
export declare function DELETE(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
}>>;
//# sourceMappingURL=locations-id.d.ts.map
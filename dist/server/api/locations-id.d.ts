import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/locations/[id]
 * Get a single location by ID
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * PUT /api/org/locations/[id]
 * Update a location
 */
export declare function PUT(request: NextRequest): Promise<Response>;
/**
 * DELETE /api/org/locations/[id]
 * Delete a location
 */
export declare function DELETE(request: NextRequest): Promise<Response>;
//# sourceMappingURL=locations-id.d.ts.map
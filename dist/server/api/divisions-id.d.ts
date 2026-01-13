import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/divisions/[id]
 * Get a single division by ID
 */
export declare function GET(request: NextRequest): Promise<NextResponse<any>>;
/**
 * PUT /api/org/divisions/[id]
 * Update a division
 */
export declare function PUT(request: NextRequest): Promise<NextResponse<any>>;
/**
 * DELETE /api/org/divisions/[id]
 * Delete a division
 */
export declare function DELETE(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=divisions-id.d.ts.map
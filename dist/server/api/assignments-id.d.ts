import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/assignments/[id]
 * Get a single assignment by ID
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * PUT /api/org/assignments/[id]
 * Update an assignment
 */
export declare function PUT(request: NextRequest): Promise<Response>;
/**
 * DELETE /api/org/assignments/[id]
 * Delete an assignment
 */
export declare function DELETE(request: NextRequest): Promise<Response>;
//# sourceMappingURL=assignments-id.d.ts.map
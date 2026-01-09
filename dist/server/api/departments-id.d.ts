import { NextRequest } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/departments/[id]
 * Get a single department by ID
 */
export declare function GET(request: NextRequest): Promise<Response>;
/**
 * PUT /api/org/departments/[id]
 * Update a department
 */
export declare function PUT(request: NextRequest): Promise<Response>;
/**
 * DELETE /api/org/departments/[id]
 * Delete a department
 */
export declare function DELETE(request: NextRequest): Promise<Response>;
//# sourceMappingURL=departments-id.d.ts.map
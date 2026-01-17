import { NextRequest, NextResponse } from "next/server";
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/org/users
 * List users for pickers (manager, assignments, etc.)
 *
 * Wraps the auth module directory API and adds:
 * - search filtering (email)
 * - result limiting
 * - id lookup (for resolveValue in autocomplete)
 *
 * Query params:
 * - search: filter by email (optional)
 * - pageSize: max items to return (default 25, max 100)
 * - id: email to resolve (optional)
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=users.d.ts.map
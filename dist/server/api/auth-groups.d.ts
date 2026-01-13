import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * /api/auth/groups
 * Mobile entity renderer convention for entityKey=auth.group.
 *
 * Supports:
 * - GET list: ?page&pageSize&search&sortBy&sortOrder
 * - POST create: { name, description, kind, segment_key }
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=auth-groups.d.ts.map
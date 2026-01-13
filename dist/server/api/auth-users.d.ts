import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * /api/auth/users
 * Mobile entity renderer convention for entityKey=auth.user.
 *
 * Supports:
 * - GET list: ?page&pageSize&search&sortBy&sortOrder
 * - POST create: { email, password, role, first_name, last_name }
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=auth-users.d.ts.map
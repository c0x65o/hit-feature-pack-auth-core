import { NextRequest } from "next/server";
export interface User {
    sub: string;
    email: string;
    roles?: string[];
}
/**
 * Extract user from JWT token in cookies or Authorization header
 * Also checks x-user-id header (set by proxy/middleware in production)
 */
export declare function extractUserFromRequest(request: NextRequest): User | null;
/**
 * Extract user ID from request (convenience function)
 */
export declare function getUserId(request: NextRequest): string | null;
/**
 * Check if user has admin role
 */
export declare function isAdmin(request: NextRequest): boolean;
/**
 * Require admin role - returns error response or null if allowed
 */
export declare function requireAdmin(request: NextRequest): Response | null;
//# sourceMappingURL=auth.d.ts.map
/**
 * Extract user from JWT token in cookies or Authorization header
 */
export function extractUserFromRequest(request) {
    // Check for token in cookie first
    let token = request.cookies.get("hit_token")?.value;
    // Fall back to Authorization header
    if (!token) {
        const authHeader = request.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.slice(7);
        }
    }
    if (!token)
        return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        const payload = JSON.parse(atob(parts[1]));
        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }
        return {
            sub: payload.sub || payload.email || "",
            email: payload.email || "",
            roles: payload.roles || [],
        };
    }
    catch {
        return null;
    }
}
/**
 * Extract user ID from request (convenience function)
 */
export function getUserId(request) {
    const user = extractUserFromRequest(request);
    return user?.sub || null;
}
/**
 * Check if user has admin role
 */
export function isAdmin(request) {
    const user = extractUserFromRequest(request);
    return user?.roles?.includes("admin") ?? false;
}
/**
 * Require admin role - returns error response or null if allowed
 */
export function requireAdmin(request) {
    if (!isAdmin(request)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }
    return null;
}
//# sourceMappingURL=auth.js.map
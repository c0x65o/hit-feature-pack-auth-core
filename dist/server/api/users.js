// src/server/api/users.ts
import { NextResponse } from "next/server";
import { requireAuthCoreReadScope } from "../lib/require-action";
import { getAuthBaseUrl } from "../lib/acl-utils";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function getAuthUrl() {
    // Deprecated: server-side fetch must use absolute URLs; callers should use getAuthBaseUrl(request).
    return "/api/auth";
}
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
export async function GET(request) {
    try {
        const gate = await requireAuthCoreReadScope(request);
        if (gate)
            return gate;
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim().toLowerCase();
        const id = searchParams.get("id"); // for resolveValue
        const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "25", 10), 100);
        // Forward auth.
        // NOTE: Feature-pack dispatcher may normalize JWTs for local decoding (atob), which breaks
        // upstream signature verification. Prefer a preserved raw token if available.
        const rawTokenHeader = request.headers.get("x-hit-token-raw") || request.headers.get("X-HIT-Token-Raw");
        const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
        const cookieToken = request.cookies.get("hit_token")?.value || null;
        const bearer = rawTokenHeader && rawTokenHeader.trim()
            ? rawTokenHeader.trim().startsWith("Bearer ")
                ? rawTokenHeader.trim()
                : `Bearer ${rawTokenHeader.trim()}`
            : authHeader && authHeader.trim()
                ? authHeader
                : cookieToken
                    ? `Bearer ${cookieToken}`
                    : "";
        const headers = { "Content-Type": "application/json" };
        if (bearer)
            headers["Authorization"] = bearer;
        const authUrl = getAuthBaseUrl(request);
        if (!authUrl) {
            return NextResponse.json({ error: "Auth base URL not configured" }, { status: 500 });
        }
        const res = await fetch(`${authUrl}/directory/users`, {
            method: "GET",
            headers,
            credentials: "include",
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return NextResponse.json({ error: body?.detail || body?.message || `Failed to fetch users (${res.status})` }, { status: res.status });
        }
        const users = await res.json().catch(() => []);
        if (!Array.isArray(users)) {
            return NextResponse.json({ items: [] });
        }
        const toItem = (u) => {
            const email = String(u?.email || "").trim();
            return {
                id: email,
                email,
                name: email,
            };
        };
        // Resolve by id/email (for editing existing records)
        if (id) {
            const hit = users.find((u) => String(u?.email || "") === id);
            return NextResponse.json({ items: hit ? [toItem(hit)] : [] });
        }
        // Filter by search term
        let filtered = users;
        if (search) {
            filtered = users.filter((u) => {
                const email = String(u?.email || "").toLowerCase();
                return email.includes(search);
            });
        }
        return NextResponse.json({ items: filtered.slice(0, pageSize).map(toItem) });
    }
    catch (error) {
        console.error("[org] List users error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
//# sourceMappingURL=users.js.map
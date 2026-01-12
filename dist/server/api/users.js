// src/server/api/users.ts
import { NextResponse } from "next/server";
import { requireAuthCoreAction } from "../lib/require-action";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function getAuthUrl() {
    return process.env.NEXT_PUBLIC_HIT_AUTH_URL || "/api/proxy/auth";
}
/**
 * GET /api/org/users
 * List users for pickers (manager, assignments, etc.)
 *
 * Wraps the auth module directory API and adds:
 * - search filtering (name/email)
 * - result limiting
 * - id lookup (for resolveValue in autocomplete)
 *
 * Query params:
 * - search: filter by name/email (optional)
 * - pageSize: max items to return (default 25, max 100)
 * - id: email to resolve (optional)
 */
export async function GET(request) {
    try {
        const gate = await requireAuthCoreAction(request, "auth-core.admin.access");
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
        const authUrl = getAuthUrl();
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
            const pf = (u?.profile_fields || {});
            const displayName = [pf.first_name, pf.last_name].filter(Boolean).join(" ").trim();
            return {
                id: email,
                email,
                name: displayName || email,
                profile_fields: u?.profile_fields,
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
                const pf = (u?.profile_fields || {});
                const firstName = String(pf.first_name || "").toLowerCase();
                const lastName = String(pf.last_name || "").toLowerCase();
                const fullName = `${firstName} ${lastName}`.trim();
                return (email.includes(search) ||
                    firstName.includes(search) ||
                    lastName.includes(search) ||
                    fullName.includes(search));
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
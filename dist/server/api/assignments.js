// src/server/api/assignments.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userOrgAssignments, divisions, departments, locations } from "@/lib/feature-pack-schemas";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import { resolveAuthCoreScopeMode } from "../lib/scope-mode";
import { requireAuthCoreAction } from "../lib/require-action";
import { extractUserFromRequest } from "../auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * GET /api/org/assignments
 * List user org assignments
 *
 * Filters:
 * - userKey: filter by user
 * - divisionId: filter by division
 * - departmentId: filter by department
 * - locationId: filter by location
 */
async function fetchUserOrgScopeIds(db, userKey) {
    const rows = await db
        .select({
        divisionId: userOrgAssignments.divisionId,
        departmentId: userOrgAssignments.departmentId,
        locationId: userOrgAssignments.locationId,
    })
        .from(userOrgAssignments)
        .where(eq(userOrgAssignments.userKey, userKey));
    const divisionIds = [];
    const departmentIds = [];
    const locationIds = [];
    for (const r of rows) {
        if (r.divisionId && !divisionIds.includes(r.divisionId))
            divisionIds.push(r.divisionId);
        if (r.departmentId && !departmentIds.includes(r.departmentId))
            departmentIds.push(r.departmentId);
        if (r.locationId && !locationIds.includes(r.locationId))
            locationIds.push(r.locationId);
    }
    return { divisionIds, departmentIds, locationIds };
}
export async function GET(request) {
    try {
        const user = extractUserFromRequest(request);
        if (!user?.sub || !user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Check read permission with explicit scope mode branching
        const mode = await resolveAuthCoreScopeMode(request, { entity: 'assignments', verb: 'read' });
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const userKeyFilter = searchParams.get("userKey");
        const divisionId = searchParams.get("divisionId");
        const departmentId = searchParams.get("departmentId");
        const locationId = searchParams.get("locationId");
        // Build conditions
        const conditions = [];
        // Apply scope-based filtering (explicit branching on none/own/ldd/any)
        if (mode === 'none') {
            // Explicit deny: return empty results (fail-closed but non-breaking for list UI)
            conditions.push(sql `false`);
        }
        else if (mode === 'own') {
            // Only show the current user's own assignment
            conditions.push(eq(userOrgAssignments.userKey, user.email));
        }
        else if (mode === 'ldd') {
            // Show assignments where:
            // 1. The assignment is the current user's own (own)
            // 2. The assignment's division/department/location matches the user's LDD scope
            const scopeIds = await fetchUserOrgScopeIds(db, user.sub);
            const ownCondition = eq(userOrgAssignments.userKey, user.email);
            // For LDD matching, check if assignment's division/department/location matches user's scope
            const lddParts = [];
            if (scopeIds.divisionIds.length) {
                lddParts.push(inArray(userOrgAssignments.divisionId, scopeIds.divisionIds));
            }
            if (scopeIds.departmentIds.length) {
                lddParts.push(inArray(userOrgAssignments.departmentId, scopeIds.departmentIds));
            }
            if (scopeIds.locationIds.length) {
                lddParts.push(inArray(userOrgAssignments.locationId, scopeIds.locationIds));
            }
            if (lddParts.length > 0) {
                conditions.push(or(ownCondition, or(...lddParts)));
            }
            else {
                conditions.push(ownCondition);
            }
        }
        else if (mode === 'any') {
            // Allow access - no additional filtering based on scope
        }
        else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // Apply additional filters
        if (userKeyFilter) {
            conditions.push(eq(userOrgAssignments.userKey, userKeyFilter));
        }
        if (divisionId) {
            conditions.push(eq(userOrgAssignments.divisionId, divisionId));
        }
        if (departmentId) {
            conditions.push(eq(userOrgAssignments.departmentId, departmentId));
        }
        if (locationId) {
            conditions.push(eq(userOrgAssignments.locationId, locationId));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // Execute query with joins
        const baseQuery = db
            .select({
            id: userOrgAssignments.id,
            userKey: userOrgAssignments.userKey,
            divisionId: userOrgAssignments.divisionId,
            divisionName: divisions.name,
            departmentId: userOrgAssignments.departmentId,
            departmentName: departments.name,
            locationId: userOrgAssignments.locationId,
            locationName: locations.name,
            createdAt: userOrgAssignments.createdAt,
            createdByUserKey: userOrgAssignments.createdByUserKey,
        })
            .from(userOrgAssignments)
            .leftJoin(divisions, eq(userOrgAssignments.divisionId, divisions.id))
            .leftJoin(departments, eq(userOrgAssignments.departmentId, departments.id))
            .leftJoin(locations, eq(userOrgAssignments.locationId, locations.id));
        const items = whereClause
            ? await baseQuery.where(whereClause).orderBy(desc(userOrgAssignments.createdAt))
            : await baseQuery.orderBy(desc(userOrgAssignments.createdAt));
        return NextResponse.json({ items });
    }
    catch (error) {
        console.error("[org] List assignments error:", error);
        return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }
}
/**
 * POST /api/org/assignments
 * Create a new user org assignment
 */
export async function POST(request) {
    try {
        // Check create permission
        const createCheck = await requireAuthCoreAction(request, 'auth-core.assignments.create');
        if (createCheck)
            return createCheck;
        // Check write permission with explicit scope mode branching
        const mode = await resolveAuthCoreScopeMode(request, { entity: 'assignments', verb: 'write' });
        if (mode === 'none') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        else if (mode === 'own' || mode === 'ldd') {
            // For write, we need to check if user can write their own assignment or matching LDD
            // This is handled at the individual assignment level, so we allow creation here
            // but the assignment will be checked when accessed
        }
        else if (mode === 'any') {
            // Allow access - proceed with creation
        }
        else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const db = getDb();
        const body = await request.json();
        const user = extractUserFromRequest(request);
        const currentUserId = user?.sub || null;
        // Validate required fields
        if (!body.userKey) {
            return NextResponse.json({ error: "userKey is required" }, { status: 400 });
        }
        // At least one of division, department, or location should be set
        if (!body.divisionId && !body.departmentId && !body.locationId) {
            return NextResponse.json({ error: "At least one of divisionId, departmentId, or locationId is required" }, { status: 400 });
        }
        // Validate division exists if provided
        if (body.divisionId) {
            const [division] = await db
                .select()
                .from(divisions)
                .where(eq(divisions.id, body.divisionId))
                .limit(1);
            if (!division) {
                return NextResponse.json({ error: "Division not found" }, { status: 400 });
            }
        }
        // Validate department exists if provided
        if (body.departmentId) {
            const [department] = await db
                .select()
                .from(departments)
                .where(eq(departments.id, body.departmentId))
                .limit(1);
            if (!department) {
                return NextResponse.json({ error: "Department not found" }, { status: 400 });
            }
        }
        // Validate location exists if provided
        if (body.locationId) {
            const [location] = await db
                .select()
                .from(locations)
                .where(eq(locations.id, body.locationId))
                .limit(1);
            if (!location) {
                return NextResponse.json({ error: "Location not found" }, { status: 400 });
            }
        }
        // Enforce one assignment row per user.
        const existing = await db
            .select({ id: userOrgAssignments.id })
            .from(userOrgAssignments)
            .where(eq(userOrgAssignments.userKey, body.userKey))
            .limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ error: "User already has an org assignment" }, { status: 409 });
        }
        const result = await db
            .insert(userOrgAssignments)
            .values({
            userKey: body.userKey,
            divisionId: body.divisionId || null,
            departmentId: body.departmentId || null,
            locationId: body.locationId || null,
            createdByUserKey: currentUserId,
        })
            .returning();
        return NextResponse.json(result[0], { status: 201 });
    }
    catch (error) {
        console.error("[org] Create assignment error:", error);
        if (error?.code === "23505" || error?.message?.includes("unique")) {
            return NextResponse.json({ error: "User already has this assignment" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
    }
}
//# sourceMappingURL=assignments.js.map
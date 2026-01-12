// src/server/api/assignments-id.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userOrgAssignments, divisions, departments, locations } from "@/lib/feature-pack-schemas";
import { eq } from "drizzle-orm";
import { resolveAuthCoreScopeMode } from "../lib/scope-mode";
import { extractUserFromRequest } from "../auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Extract ID from URL path
 */
function extractId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    // Pattern: /api/org/assignments/[id]
    const assignmentsIndex = parts.indexOf("assignments");
    if (assignmentsIndex !== -1 && parts[assignmentsIndex + 1]) {
        return parts[assignmentsIndex + 1];
    }
    return null;
}
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
async function canAccessAssignment(db, request, assignmentUserKey, assignmentDivisionId, assignmentDepartmentId, assignmentLocationId, verb) {
    const user = extractUserFromRequest(request);
    if (!user?.sub || !user?.email)
        return false;
    const mode = await resolveAuthCoreScopeMode(request, { entity: 'assignments', verb });
    if (mode === 'none') {
        return false;
    }
    else if (mode === 'own') {
        return assignmentUserKey.toLowerCase() === user.email.toLowerCase();
    }
    else if (mode === 'any') {
        return true;
    }
    else if (mode === 'ldd') {
        // Check if assignment is the current user's own
        if (assignmentUserKey.toLowerCase() === user.email.toLowerCase()) {
            return true;
        }
        // Check if assignment's division/department/location matches user's LDD scope
        const scopeIds = await fetchUserOrgScopeIds(db, user.sub);
        if (assignmentDivisionId && scopeIds.divisionIds.includes(assignmentDivisionId)) {
            return true;
        }
        if (assignmentDepartmentId && scopeIds.departmentIds.includes(assignmentDepartmentId)) {
            return true;
        }
        if (assignmentLocationId && scopeIds.locationIds.includes(assignmentLocationId)) {
            return true;
        }
        return false;
    }
    return false;
}
/**
 * GET /api/org/assignments/[id]
 * Get a single assignment by ID
 */
export async function GET(request) {
    try {
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
        }
        const db = getDb();
        const [assignment] = await db
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
            .leftJoin(locations, eq(userOrgAssignments.locationId, locations.id))
            .where(eq(userOrgAssignments.id, id))
            .limit(1);
        if (!assignment) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }
        // Check access permission
        const canAccess = await canAccessAssignment(db, request, assignment.userKey, assignment.divisionId || null, assignment.departmentId || null, assignment.locationId || null, 'read');
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(assignment);
    }
    catch (error) {
        console.error("[org] Get assignment error:", error);
        return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
    }
}
/**
 * PUT /api/org/assignments/[id]
 * Update an assignment
 */
export async function PUT(request) {
    try {
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
        }
        const db = getDb();
        const body = await request.json();
        // Check if assignment exists
        const [existing] = await db
            .select()
            .from(userOrgAssignments)
            .where(eq(userOrgAssignments.id, id))
            .limit(1);
        if (!existing) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }
        // Check access permission
        const canAccess = await canAccessAssignment(db, request, existing.userKey, existing.divisionId || null, existing.departmentId || null, existing.locationId || null, 'write');
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // Validate division exists if being changed
        if (body.divisionId && body.divisionId !== existing.divisionId) {
            const [division] = await db
                .select()
                .from(divisions)
                .where(eq(divisions.id, body.divisionId))
                .limit(1);
            if (!division) {
                return NextResponse.json({ error: "Division not found" }, { status: 400 });
            }
        }
        // Validate department exists if being changed
        if (body.departmentId && body.departmentId !== existing.departmentId) {
            const [department] = await db
                .select()
                .from(departments)
                .where(eq(departments.id, body.departmentId))
                .limit(1);
            if (!department) {
                return NextResponse.json({ error: "Department not found" }, { status: 400 });
            }
        }
        // Validate location exists if being changed
        if (body.locationId && body.locationId !== existing.locationId) {
            const [location] = await db
                .select()
                .from(locations)
                .where(eq(locations.id, body.locationId))
                .limit(1);
            if (!location) {
                return NextResponse.json({ error: "Location not found" }, { status: 400 });
            }
        }
        // Build update object
        const updateData = {};
        if (body.divisionId !== undefined)
            updateData.divisionId = body.divisionId || null;
        if (body.departmentId !== undefined)
            updateData.departmentId = body.departmentId || null;
        if (body.locationId !== undefined)
            updateData.locationId = body.locationId || null;
        const [updated] = await db
            .update(userOrgAssignments)
            .set(updateData)
            .where(eq(userOrgAssignments.id, id))
            .returning();
        return NextResponse.json(updated);
    }
    catch (error) {
        console.error("[org] Update assignment error:", error);
        if (error?.code === "23505" || error?.message?.includes("unique")) {
            return NextResponse.json({ error: "User already has this assignment" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }
}
/**
 * DELETE /api/org/assignments/[id]
 * Delete an assignment
 */
export async function DELETE(request) {
    try {
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
        }
        const db = getDb();
        // Check if assignment exists
        const [existing] = await db
            .select()
            .from(userOrgAssignments)
            .where(eq(userOrgAssignments.id, id))
            .limit(1);
        if (!existing) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }
        // Check access permission
        const canAccess = await canAccessAssignment(db, request, existing.userKey, existing.divisionId || null, existing.departmentId || null, existing.locationId || null, 'delete');
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await db.delete(userOrgAssignments).where(eq(userOrgAssignments.id, id));
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[org] Delete assignment error:", error);
        return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
    }
}
//# sourceMappingURL=assignments-id.js.map
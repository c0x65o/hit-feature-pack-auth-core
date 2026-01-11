// src/server/api/assignments-id.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userOrgAssignments, divisions, departments, locations } from "@/lib/feature-pack-schemas";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../auth";
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
/**
 * GET /api/org/assignments/[id]
 * Get a single assignment by ID
 */
export async function GET(request) {
    try {
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
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
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
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
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
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
        await db.delete(userOrgAssignments).where(eq(userOrgAssignments.id, id));
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[org] Delete assignment error:", error);
        return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
    }
}
//# sourceMappingURL=assignments-id.js.map
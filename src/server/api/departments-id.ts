// src/server/api/departments-id.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { departments, divisions } from "@/lib/feature-pack-schemas";
import { eq, and, ne } from "drizzle-orm";
import { requireAdmin } from "../auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Extract ID from URL path
 */
function extractId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  // Pattern: /api/org/departments/[id]
  const departmentsIndex = parts.indexOf("departments");
  if (departmentsIndex !== -1 && parts[departmentsIndex + 1]) {
    return parts[departmentsIndex + 1];
  }
  return null;
}

/**
 * GET /api/org/departments/[id]
 * Get a single department by ID
 */
export async function GET(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const db = getDb();
    const [department] = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        divisionId: departments.divisionId,
        divisionName: divisions.name,
        parentId: departments.parentId,
        managerUserKey: departments.managerUserKey,
        costCenterCode: departments.costCenterCode,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
      })
      .from(departments)
      .leftJoin(divisions, eq(departments.divisionId, divisions.id))
      .where(eq(departments.id, id))
      .limit(1);

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("[org] Get department error:", error);
    return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}

/**
 * PUT /api/org/departments/[id]
 * Update a department
 */
export async function PUT(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const db = getDb();
    const body = await request.json();

    // Check if department exists
    const [existing] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check for unique code if being changed
    if (body.code && body.code !== existing.code) {
      const [codeConflict] = await db
        .select()
        .from(departments)
        .where(and(eq(departments.code, body.code), ne(departments.id, id)))
        .limit(1);
      if (codeConflict) {
        return NextResponse.json({ error: "Department with this code already exists" }, { status: 409 });
      }
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

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.code !== undefined) updateData.code = body.code || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.divisionId !== undefined) updateData.divisionId = body.divisionId || null;
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;
    if (body.managerUserKey !== undefined) updateData.managerUserKey = body.managerUserKey || null;
    if (body.costCenterCode !== undefined) updateData.costCenterCode = body.costCenterCode || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db
      .update(departments)
      .set(updateData)
      .where(eq(departments.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[org] Update department error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "Department with this code already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

/**
 * DELETE /api/org/departments/[id]
 * Delete a department
 */
export async function DELETE(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    const db = getDb();

    // Check if department exists
    const [existing] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Delete (cascade will handle child assignments)
    await db.delete(departments).where(eq(departments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[org] Delete department error:", error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

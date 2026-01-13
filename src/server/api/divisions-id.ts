// src/server/api/divisions-id.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { divisions } from "@/lib/feature-pack-schemas";
import { eq, and, ne } from "drizzle-orm";
import { resolveAuthCoreScopeMode } from "../lib/scope-mode";
import { requireAuthCoreAction } from "../lib/require-action";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Extract ID from URL path
 */
function extractId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  // Pattern: /api/org/divisions/[id]
  const divisionsIndex = parts.indexOf("divisions");
  if (divisionsIndex !== -1 && parts[divisionsIndex + 1]) {
    return parts[divisionsIndex + 1];
  }
  return null;
}

/**
 * GET /api/org/divisions/[id]
 * Get a single division by ID
 */
export async function GET(request: NextRequest) {
  try {
    // Check read permission with explicit scope mode branching
    const mode = await resolveAuthCoreScopeMode(request, { entity: 'divisions', verb: 'read' });
    
    if (mode === 'none') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (mode === 'own' || mode === 'ldd') {
      // Divisions don't have ownership or LDD fields, so these modes deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else if (mode === 'any') {
      // Allow access - proceed with query
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const db = getDb();
    const [division] = await db.select().from(divisions).where(eq(divisions.id, id)).limit(1);

    if (!division) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    return NextResponse.json(division);
  } catch (error) {
    console.error("[org] Get division error:", error);
    return NextResponse.json({ error: "Failed to fetch division" }, { status: 500 });
  }
}

/**
 * PUT /api/org/divisions/[id]
 * Update a division
 */
export async function PUT(request: NextRequest) {
  try {
    const updateCheck = await requireAuthCoreAction(request, 'auth-core.divisions.update');
    if (updateCheck) return updateCheck;

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const db = getDb();
    const body = await request.json();

    // Check if division exists
    const [existing] = await db.select().from(divisions).where(eq(divisions.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    // Check for unique code if being changed
    if (body.code && body.code !== existing.code) {
      const [codeConflict] = await db
        .select()
        .from(divisions)
        .where(and(eq(divisions.code, body.code), ne(divisions.id, id)))
        .limit(1);
      if (codeConflict) {
        return NextResponse.json({ error: "Division with this code already exists" }, { status: 409 });
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.code !== undefined) updateData.code = body.code || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;
    if (body.managerUserKey !== undefined) updateData.managerUserKey = body.managerUserKey || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db
      .update(divisions)
      .set(updateData)
      .where(eq(divisions.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[org] Update division error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "Division with this code already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to update division" }, { status: 500 });
  }
}

/**
 * DELETE /api/org/divisions/[id]
 * Delete a division
 */
export async function DELETE(request: NextRequest) {
  try {
    const deleteCheck = await requireAuthCoreAction(request, 'auth-core.divisions.delete');
    if (deleteCheck) return deleteCheck;

    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const db = getDb();

    // Check if division exists
    const [existing] = await db.select().from(divisions).where(eq(divisions.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    // Delete (cascade will handle child assignments)
    await db.delete(divisions).where(eq(divisions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[org] Delete division error:", error);
    return NextResponse.json({ error: "Failed to delete division" }, { status: 500 });
  }
}

// src/server/api/assignments.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userOrgAssignments, divisions, departments, locations } from "@/lib/feature-pack-schemas";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin, getUserId, isAdmin } from "../auth";

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
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const userKeyFilter = searchParams.get("userKey");
    const divisionId = searchParams.get("divisionId");
    const departmentId = searchParams.get("departmentId");
    const locationId = searchParams.get("locationId");

    // Non-admins can only see their own assignments
    const currentUserId = getUserId(request);
    const userIsAdmin = isAdmin(request);

    if (!userIsAdmin && !userKeyFilter) {
      // Default to current user's assignments
      if (!currentUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Build conditions
    const conditions = [];

    if (userKeyFilter) {
      // Non-admins can only see their own
      if (!userIsAdmin && userKeyFilter !== currentUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      conditions.push(eq(userOrgAssignments.userKey, userKeyFilter));
    } else if (!userIsAdmin && currentUserId) {
      conditions.push(eq(userOrgAssignments.userKey, currentUserId));
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
  } catch (error) {
    console.error("[org] List assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

/**
 * POST /api/org/assignments
 * Create a new user org assignment
 */
export async function POST(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const db = getDb();
    const body = await request.json();
    const currentUserId = getUserId(request);

    // Validate required fields
    if (!body.userKey) {
      return NextResponse.json({ error: "userKey is required" }, { status: 400 });
    }

    // At least one of division, department, or location should be set
    if (!body.divisionId && !body.departmentId && !body.locationId) {
      return NextResponse.json(
        { error: "At least one of divisionId, departmentId, or locationId is required" },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("[org] Create assignment error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "User already has this assignment" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

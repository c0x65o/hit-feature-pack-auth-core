// src/server/api/me-scope.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../lib-stubs/db";
import { userOrgAssignments } from "../../lib-stubs/feature-pack-schemas";
import { eq } from "drizzle-orm";
import { getUserId } from "../auth";
import type { OrgScope } from "../../schema/org-dimensions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/org/me/scope
 * Get the current user's org scope (divisions, departments, locations)
 *
 * This is the primary endpoint for resolving a user's org dimensions for ACL checks.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get all assignments for this user
    const assignments = await db
      .select()
      .from(userOrgAssignments)
      .where(eq(userOrgAssignments.userKey, userId));

    // Build org scope
    const scope: OrgScope = {
      divisionIds: [],
      departmentIds: [],
      locationIds: [],
    };

    for (const assignment of assignments) {
      if (assignment.divisionId && !scope.divisionIds.includes(assignment.divisionId)) {
        scope.divisionIds.push(assignment.divisionId);
      }
      if (assignment.departmentId && !scope.departmentIds.includes(assignment.departmentId)) {
        scope.departmentIds.push(assignment.departmentId);
      }
      if (assignment.locationId && !scope.locationIds.includes(assignment.locationId)) {
        scope.locationIds.push(assignment.locationId);
      }
    }

    return NextResponse.json(scope);
  } catch (error) {
    console.error("[org] Get my scope error:", error);
    return NextResponse.json({ error: "Failed to fetch org scope" }, { status: 500 });
  }
}

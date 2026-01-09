// src/server/api/users-scope.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userOrgAssignments } from "@/lib/feature-pack-schemas";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../auth";
import type { OrgScope } from "../../schema/org-dimensions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Extract userKey from URL path
 */
function extractUserKey(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  // Pattern: /api/org/users/[userKey]/scope
  const usersIndex = parts.indexOf("users");
  if (usersIndex !== -1 && parts[usersIndex + 1] && parts[usersIndex + 2] === "scope") {
    return decodeURIComponent(parts[usersIndex + 1]);
  }
  return null;
}

/**
 * GET /api/org/users/[userKey]/scope
 * Get org scope for a specific user (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const userKey = extractUserKey(request);
    if (!userKey) {
      return NextResponse.json({ error: "User key is required" }, { status: 400 });
    }

    const db = getDb();

    // Get all assignments for this user
    const assignments = await db
      .select()
      .from(userOrgAssignments)
      .where(eq(userOrgAssignments.userKey, userKey));

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
    console.error("[org] Get user scope error:", error);
    return NextResponse.json({ error: "Failed to fetch org scope" }, { status: 500 });
  }
}

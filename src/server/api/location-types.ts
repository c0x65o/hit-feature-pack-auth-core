// src/server/api/location-types.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../lib-stubs/db";
import { locationTypes } from "../../lib-stubs/feature-pack-schemas";
import { eq, desc, asc, sql } from "drizzle-orm";
import { requireAdmin } from "../auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/org/location-types
 * List all location types
 */
export async function GET(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const db = getDb();
    const items = await db.select().from(locationTypes).orderBy(asc(locationTypes.name));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[org] List location types error:", error);
    return NextResponse.json({ error: "Failed to fetch location types" }, { status: 500 });
  }
}

/**
 * POST /api/org/location-types
 * Create a new location type
 */
export async function POST(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const db = getDb();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    // Check for unique code
    const existing = await db
      .select()
      .from(locationTypes)
      .where(eq(locationTypes.code, body.code))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Location type with this code already exists" }, { status: 409 });
    }

    const result = await db
      .insert(locationTypes)
      .values({
        name: body.name,
        code: body.code,
        icon: body.icon || "MapPin",
        color: body.color || "#3b82f6",
        description: body.description || null,
        isSystem: false,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("[org] Create location type error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "Location type with this code already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create location type" }, { status: 500 });
  }
}

// src/server/api/location-types.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { locationTypes, DEFAULT_LOCATION_TYPES } from "@/lib/feature-pack-schemas";
import { eq, desc, asc, sql } from "drizzle-orm";
import { requireAuthCoreReadScope } from "../lib/require-action";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/org/location-types
 * List all location types
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAuthCoreReadScope(request);
    if (gate) return gate;

    const db = getDb();

    // Seed defaults once (CRM-style): if the table is empty, insert system defaults.
    // This keeps the app "zero extra steps" for new environments.
    const [{ count }] =
      (await db
        .select({ count: sql<number>`count(*)` })
        .from(locationTypes)
        .limit(1)) || [];
    const total = Number(count || 0);
    if (total === 0 && Array.isArray(DEFAULT_LOCATION_TYPES) && DEFAULT_LOCATION_TYPES.length > 0) {
      await db.insert(locationTypes).values(DEFAULT_LOCATION_TYPES as any);
    }

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
    const gate = await requireAuthCoreReadScope(request);
    if (gate) return gate;

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
        // Never allow clients to set isSystem.
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

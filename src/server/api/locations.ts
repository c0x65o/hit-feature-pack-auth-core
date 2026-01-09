// src/server/api/locations.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { locations, locationTypes } from "@/lib/feature-pack-schemas";
import { eq, desc, asc, like, and, or, isNull, sql, type AnyColumn } from "drizzle-orm";
import { requireAdmin } from "../auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/org/locations
 * List all locations
 */
export async function GET(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const db = getDb();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "100", 10);
    const offset = (page - 1) * pageSize;

    // Sorting
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Search
    const search = searchParams.get("search") || "";

    // Filters
    const active = searchParams.get("active");
    const parentId = searchParams.get("parentId");
    const locationTypeId = searchParams.get("locationTypeId");

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(locations.name, `%${search}%`),
          like(locations.code, `%${search}%`),
          like(locations.city, `%${search}%`),
          like(locations.state, `%${search}%`)
        )!
      );
    }

    if (active !== null && active !== undefined && active !== "") {
      conditions.push(eq(locations.isActive, active === "true"));
    }

    if (parentId) {
      if (parentId === "null") {
        conditions.push(isNull(locations.parentId));
      } else {
        conditions.push(eq(locations.parentId, parentId));
      }
    }

    if (locationTypeId) {
      conditions.push(eq(locations.locationTypeId, locationTypeId));
    }

    // Apply sorting
    const sortColumns: Record<string, AnyColumn> = {
      id: locations.id,
      name: locations.name,
      code: locations.code,
      city: locations.city,
      createdAt: locations.createdAt,
      updatedAt: locations.updatedAt,
    };
    const orderCol = sortColumns[sortBy] ?? locations.name;
    const orderDirection = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(locations);
    const countResult = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = Number(countResult[0]?.count || 0);

    // Execute main query with type name join
    const baseQuery = db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
        description: locations.description,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        postalCode: locations.postalCode,
        country: locations.country,
        latitude: locations.latitude,
        longitude: locations.longitude,
        parentId: locations.parentId,
        locationTypeId: locations.locationTypeId,
        locationTypeName: locationTypes.name,
        managerUserKey: locations.managerUserKey,
        isPrimary: locations.isPrimary,
        isActive: locations.isActive,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
      })
      .from(locations)
      .leftJoin(locationTypes, eq(locations.locationTypeId, locationTypes.id));

    const items = whereClause
      ? await baseQuery.where(whereClause).orderBy(orderDirection).limit(pageSize).offset(offset)
      : await baseQuery.orderBy(orderDirection).limit(pageSize).offset(offset);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[org] List locations error:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

/**
 * POST /api/org/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  try {
    const forbidden = requireAdmin(request);
    if (forbidden) return forbidden;

    const db = getDb();
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Check for unique code if provided
    if (body.code) {
      const existing = await db
        .select()
        .from(locations)
        .where(eq(locations.code, body.code))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: "Location with this code already exists" }, { status: 409 });
      }
    }

    const result = await db
      .insert(locations)
      .values({
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        postalCode: body.postalCode || null,
        country: body.country || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        parentId: body.parentId || null,
        locationTypeId: body.locationTypeId || null,
        managerUserKey: body.managerUserKey || null,
        isPrimary: body.isPrimary || false,
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("[org] Create location error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "Location with this code already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}

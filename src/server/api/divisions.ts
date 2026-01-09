// src/server/api/divisions.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { divisions } from "@/lib/feature-pack-schemas";
import { eq, desc, asc, like, and, or, isNull, sql, type AnyColumn } from "drizzle-orm";
import { requireAdmin, getUserId } from "../auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/org/divisions
 * List all divisions
 */
export async function GET(request: NextRequest) {
  try {
    // Divisions are admin-only for now
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

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(divisions.name, `%${search}%`),
          like(divisions.code, `%${search}%`),
          like(divisions.description, `%${search}%`)
        )!
      );
    }

    if (active !== null && active !== undefined && active !== "") {
      conditions.push(eq(divisions.isActive, active === "true"));
    }

    if (parentId) {
      if (parentId === "null") {
        conditions.push(isNull(divisions.parentId));
      } else {
        conditions.push(eq(divisions.parentId, parentId));
      }
    }

    // Apply sorting
    const sortColumns: Record<string, AnyColumn> = {
      id: divisions.id,
      name: divisions.name,
      code: divisions.code,
      createdAt: divisions.createdAt,
      updatedAt: divisions.updatedAt,
    };
    const orderCol = sortColumns[sortBy] ?? divisions.name;
    const orderDirection = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(divisions);
    const countResult = whereClause ? await countQuery.where(whereClause) : await countQuery;
    const total = Number(countResult[0]?.count || 0);

    // Execute main query
    const baseQuery = db.select().from(divisions);
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
    console.error("[org] List divisions error:", error);
    return NextResponse.json({ error: "Failed to fetch divisions" }, { status: 500 });
  }
}

/**
 * POST /api/org/divisions
 * Create a new division
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
        .from(divisions)
        .where(eq(divisions.code, body.code))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: "Division with this code already exists" }, { status: 409 });
      }
    }

    const result = await db
      .insert(divisions)
      .values({
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        parentId: body.parentId || null,
        managerUserKey: body.managerUserKey || null,
        isActive: body.isActive ?? true,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("[org] Create division error:", error);

    if (error?.code === "23505" || error?.message?.includes("unique")) {
      return NextResponse.json({ error: "Division with this code already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create division" }, { status: 500 });
  }
}

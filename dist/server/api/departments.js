// src/server/api/departments.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { departments, divisions } from "@/lib/feature-pack-schemas";
import { eq, desc, asc, like, and, or, isNull, sql } from "drizzle-orm";
import { resolveAuthCoreScopeMode } from "../lib/scope-mode";
import { requireAuthCoreAction } from "../lib/require-action";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * GET /api/org/departments
 * List all departments
 */
export async function GET(request) {
    try {
        // Check read permission with explicit scope mode branching
        const mode = await resolveAuthCoreScopeMode(request, { entity: 'departments', verb: 'read' });
        if (mode === 'none') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        else if (mode === 'own' || mode === 'ldd') {
            // Departments don't have ownership or LDD fields, so these modes deny access
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        else if (mode === 'any') {
            // Allow access - proceed with query
        }
        else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
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
        const divisionId = searchParams.get("divisionId");
        const parentId = searchParams.get("parentId");
        // Build where conditions
        const conditions = [];
        if (search) {
            conditions.push(or(like(departments.name, `%${search}%`), like(departments.code, `%${search}%`), like(departments.description, `%${search}%`)));
        }
        if (active !== null && active !== undefined && active !== "") {
            conditions.push(eq(departments.isActive, active === "true"));
        }
        if (divisionId) {
            if (divisionId === "null") {
                conditions.push(isNull(departments.divisionId));
            }
            else {
                conditions.push(eq(departments.divisionId, divisionId));
            }
        }
        if (parentId) {
            if (parentId === "null") {
                conditions.push(isNull(departments.parentId));
            }
            else {
                conditions.push(eq(departments.parentId, parentId));
            }
        }
        // Apply sorting
        const sortColumns = {
            id: departments.id,
            name: departments.name,
            code: departments.code,
            createdAt: departments.createdAt,
            updatedAt: departments.updatedAt,
        };
        const orderCol = sortColumns[sortBy] ?? departments.name;
        const orderDirection = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);
        // Build where clause
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // Get total count for pagination
        const countQuery = db.select({ count: sql `count(*)` }).from(departments);
        const countResult = whereClause ? await countQuery.where(whereClause) : await countQuery;
        const total = Number(countResult[0]?.count || 0);
        // Execute main query with division name join
        const baseQuery = db
            .select({
            id: departments.id,
            name: departments.name,
            code: departments.code,
            description: departments.description,
            divisionId: departments.divisionId,
            divisionName: divisions.name,
            parentId: departments.parentId,
            managerUserKey: departments.managerUserKey,
            isActive: departments.isActive,
            createdAt: departments.createdAt,
            updatedAt: departments.updatedAt,
        })
            .from(departments)
            .leftJoin(divisions, eq(departments.divisionId, divisions.id));
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
    }
    catch (error) {
        console.error("[org] List departments error:", error);
        return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }
}
/**
 * POST /api/org/departments
 * Create a new department
 */
export async function POST(request) {
    try {
        // Check create permission
        const createCheck = await requireAuthCoreAction(request, 'auth-core.departments.create');
        if (createCheck)
            return createCheck;
        // Check write permission with explicit scope mode branching
        const mode = await resolveAuthCoreScopeMode(request, { entity: 'departments', verb: 'write' });
        if (mode === 'none') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        else if (mode === 'own' || mode === 'ldd') {
            // Departments don't have ownership or LDD fields, so these modes deny access
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        else if (mode === 'any') {
            // Allow access - proceed with creation
        }
        else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
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
                .from(departments)
                .where(eq(departments.code, body.code))
                .limit(1);
            if (existing.length > 0) {
                return NextResponse.json({ error: "Department with this code already exists" }, { status: 409 });
            }
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
        const result = await db
            .insert(departments)
            .values({
            name: body.name,
            code: body.code || null,
            description: body.description || null,
            divisionId: body.divisionId || null,
            parentId: body.parentId || null,
            managerUserKey: body.managerUserKey || null,
            isActive: body.isActive ?? true,
        })
            .returning();
        return NextResponse.json(result[0], { status: 201 });
    }
    catch (error) {
        console.error("[org] Create department error:", error);
        if (error?.code === "23505" || error?.message?.includes("unique")) {
            return NextResponse.json({ error: "Department with this code already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
    }
}
//# sourceMappingURL=departments.js.map
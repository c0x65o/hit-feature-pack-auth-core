// src/server/api/locations-id.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { locations, locationTypes } from "@/lib/feature-pack-schemas";
import { eq, and, ne } from "drizzle-orm";
import { requireAdmin } from "../auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Extract ID from URL path
 */
function extractId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    // Pattern: /api/org/locations/[id]
    const locationsIndex = parts.indexOf("locations");
    if (locationsIndex !== -1 && parts[locationsIndex + 1]) {
        return parts[locationsIndex + 1];
    }
    return null;
}
/**
 * GET /api/org/locations/[id]
 * Get a single location by ID
 */
export async function GET(request) {
    try {
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }
        const db = getDb();
        const [location] = await db
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
            .leftJoin(locationTypes, eq(locations.locationTypeId, locationTypes.id))
            .where(eq(locations.id, id))
            .limit(1);
        if (!location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }
        return NextResponse.json(location);
    }
    catch (error) {
        console.error("[org] Get location error:", error);
        return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
    }
}
/**
 * PUT /api/org/locations/[id]
 * Update a location
 */
export async function PUT(request) {
    try {
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }
        const db = getDb();
        const body = await request.json();
        // Check if location exists
        const [existing] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
        if (!existing) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }
        // Check for unique code if being changed
        if (body.code && body.code !== existing.code) {
            const [codeConflict] = await db
                .select()
                .from(locations)
                .where(and(eq(locations.code, body.code), ne(locations.id, id)))
                .limit(1);
            if (codeConflict) {
                return NextResponse.json({ error: "Location with this code already exists" }, { status: 409 });
            }
        }
        // Build update object
        const updateData = {
            updatedAt: new Date(),
        };
        if (body.name !== undefined)
            updateData.name = body.name;
        if (body.code !== undefined)
            updateData.code = body.code || null;
        if (body.description !== undefined)
            updateData.description = body.description || null;
        if (body.address !== undefined)
            updateData.address = body.address || null;
        if (body.city !== undefined)
            updateData.city = body.city || null;
        if (body.state !== undefined)
            updateData.state = body.state || null;
        if (body.postalCode !== undefined)
            updateData.postalCode = body.postalCode || null;
        if (body.country !== undefined)
            updateData.country = body.country || null;
        if (body.latitude !== undefined)
            updateData.latitude = body.latitude || null;
        if (body.longitude !== undefined)
            updateData.longitude = body.longitude || null;
        if (body.parentId !== undefined)
            updateData.parentId = body.parentId || null;
        if (body.locationTypeId !== undefined)
            updateData.locationTypeId = body.locationTypeId || null;
        if (body.managerUserKey !== undefined)
            updateData.managerUserKey = body.managerUserKey || null;
        if (body.isPrimary !== undefined)
            updateData.isPrimary = body.isPrimary;
        if (body.isActive !== undefined)
            updateData.isActive = body.isActive;
        const [updated] = await db
            .update(locations)
            .set(updateData)
            .where(eq(locations.id, id))
            .returning();
        return NextResponse.json(updated);
    }
    catch (error) {
        console.error("[org] Update location error:", error);
        if (error?.code === "23505" || error?.message?.includes("unique")) {
            return NextResponse.json({ error: "Location with this code already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
    }
}
/**
 * DELETE /api/org/locations/[id]
 * Delete a location
 */
export async function DELETE(request) {
    try {
        const forbidden = requireAdmin(request);
        if (forbidden)
            return forbidden;
        const id = extractId(request);
        if (!id) {
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }
        const db = getDb();
        // Check if location exists
        const [existing] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
        if (!existing) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }
        // Delete (cascade will handle child assignments)
        await db.delete(locations).where(eq(locations.id, id));
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("[org] Delete location error:", error);
        return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
    }
}
//# sourceMappingURL=locations-id.js.map
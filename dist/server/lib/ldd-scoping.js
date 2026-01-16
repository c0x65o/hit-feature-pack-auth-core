import { and, eq } from "drizzle-orm";
import { orgEntityScopes, userOrgAssignments } from "@/lib/feature-pack-schemas";
import { getDb } from "@/lib/db";
import { isFullyInUserOrgScope, isInUserOrgScope, isOwner } from "./org-utils";
export function hasAnyLdd(scope) {
    if (!scope)
        return false;
    return Boolean(scope.divisionId || scope.departmentId || scope.locationId);
}
export function normalizeLddScope(input) {
    return {
        divisionId: input?.divisionId ?? null,
        departmentId: input?.departmentId ?? null,
        locationId: input?.locationId ?? null,
    };
}
export function normalizeLddScopeInput(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return normalizeLddScope(null);
    }
    const rec = input;
    const norm = (v) => {
        if (v == null)
            return null;
        if (typeof v === "string") {
            const s = v.trim();
            return s ? s : null;
        }
        return String(v);
    };
    return normalizeLddScope({
        divisionId: norm(rec.divisionId),
        departmentId: norm(rec.departmentId),
        locationId: norm(rec.locationId),
    });
}
export function normalizeLddScopesInput(input) {
    if (!Array.isArray(input))
        return [];
    const out = [];
    const seen = new Set();
    for (const item of input) {
        const scope = normalizeLddScopeInput(item);
        if (!hasAnyLdd(scope))
            continue;
        const key = `${scope.divisionId || ""}|${scope.departmentId || ""}|${scope.locationId || ""}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(scope);
    }
    return out;
}
export function buildOrgScopeFromAssignments(assignments) {
    const scope = { divisionIds: [], departmentIds: [], locationIds: [] };
    for (const a of assignments) {
        if (a.divisionId && !scope.divisionIds.includes(a.divisionId))
            scope.divisionIds.push(a.divisionId);
        if (a.departmentId && !scope.departmentIds.includes(a.departmentId))
            scope.departmentIds.push(a.departmentId);
        if (a.locationId && !scope.locationIds.includes(a.locationId))
            scope.locationIds.push(a.locationId);
    }
    return scope;
}
export function defaultLddScopeFromOrgScope(orgScope) {
    const scope = orgScope || { divisionIds: [], departmentIds: [], locationIds: [] };
    return normalizeLddScope({
        divisionId: scope.divisionIds?.[0] ?? null,
        departmentId: scope.departmentIds?.[0] ?? null,
        locationId: scope.locationIds?.[0] ?? null,
    });
}
export async function fetchUserOrgContext(userKey) {
    const db = getDb();
    const assignments = await db
        .select()
        .from(userOrgAssignments)
        .where(eq(userOrgAssignments.userKey, userKey));
    const orgScope = buildOrgScopeFromAssignments(assignments);
    return {
        userKey,
        orgScope,
        assignments: assignments,
    };
}
export async function fetchEntityExtraScopes(args) {
    const { entityType, entityId, scopeKind } = args;
    const db = getDb();
    const where = and(eq(orgEntityScopes.entityType, entityType), eq(orgEntityScopes.entityId, entityId), ...(scopeKind ? [eq(orgEntityScopes.scopeKind, scopeKind)] : []));
    const rows = await db
        .select({
        divisionId: orgEntityScopes.divisionId,
        departmentId: orgEntityScopes.departmentId,
        locationId: orgEntityScopes.locationId,
    })
        .from(orgEntityScopes)
        .where(where);
    return rows.map((r) => normalizeLddScope(r));
}
export function mergePrimaryAndExtraScopes(args) {
    const out = [];
    if (args.primary && hasAnyLdd(args.primary))
        out.push(normalizeLddScope(args.primary));
    if (Array.isArray(args.extras)) {
        for (const s of args.extras) {
            if (hasAnyLdd(s))
                out.push(normalizeLddScope(s));
        }
    }
    return out;
}
function scopeMatchesAssignment(scope, a) {
    // For each dimension set on the scope, require exact match.
    if (scope.divisionId && scope.divisionId !== (a.divisionId ?? null))
        return false;
    if (scope.departmentId && scope.departmentId !== (a.departmentId ?? null))
        return false;
    if (scope.locationId && scope.locationId !== (a.locationId ?? null))
        return false;
    return true;
}
export function canAccessByRule(args) {
    const { entityOwnerUserKey, entityScopes, rule, ctx } = args;
    if (rule.type === "owner") {
        return isOwner(entityOwnerUserKey, ctx.userKey);
    }
    const scopes = Array.isArray(entityScopes) ? entityScopes.filter(hasAnyLdd).map(normalizeLddScope) : [];
    if (scopes.length === 0)
        return false;
    if (rule.type === "anyLdd") {
        // Any dimension match against user's resolved OrgScope.
        return scopes.some((s) => isInUserOrgScope(s, ctx.orgScope ?? null));
    }
    if (rule.type === "sameDivision") {
        return scopes.some((s) => {
            if (!s.divisionId)
                return false;
            return ctx.assignments.some((a) => a.divisionId === s.divisionId);
        });
    }
    if (rule.type === "sameDepartment") {
        return scopes.some((s) => {
            if (!s.departmentId)
                return false;
            return ctx.assignments.some((a) => a.departmentId === s.departmentId);
        });
    }
    if (rule.type === "sameLocation") {
        return scopes.some((s) => {
            if (!s.locationId)
                return false;
            return ctx.assignments.some((a) => a.locationId === s.locationId);
        });
    }
    if (rule.type === "sameLdd") {
        return scopes.some((s) => {
            return ctx.assignments.some((a) => scopeMatchesAssignment(s, a));
        });
    }
    if (rule.type === "divisionManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameDivision" },
            ctx,
        });
    }
    if (rule.type === "departmentManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameDepartment" },
            ctx,
        });
    }
    if (rule.type === "locationManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameLocation" },
            ctx,
        });
    }
    return false;
}
export function isScopeWithinUser(scope, orgScope, mode = "all") {
    if (!hasAnyLdd(scope))
        return true;
    if (mode === "any")
        return isInUserOrgScope(scope, orgScope ?? null);
    return isFullyInUserOrgScope(scope, orgScope ?? null);
}
export function isScopeOutsideUser(scope, orgScope, mode = "all") {
    return !isScopeWithinUser(scope, orgScope, mode);
}
export function canAccessByAnyRule(args) {
    const { entityOwnerUserKey, entityScopes, rules, ctx } = args;
    return rules.some((rule) => canAccessByRule({ entityOwnerUserKey, entityScopes, rule, ctx }));
}
export function isLddMutation(args) {
    const b = normalizeLddScope(args.before);
    const a = normalizeLddScope(args.after);
    return b.divisionId !== a.divisionId || b.departmentId !== a.departmentId || b.locationId !== a.locationId;
}
//# sourceMappingURL=ldd-scoping.js.map
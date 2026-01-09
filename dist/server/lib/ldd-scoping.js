import { and, eq } from "drizzle-orm";
import { orgEntityScopes, userOrgAssignments } from "@/lib/feature-pack-schemas";
import { getDb } from "@/lib/db";
import { isInUserOrgScope, isOwner } from "./org-utils";
const ROLE_RANK = {
    member: 0,
    lead: 1,
    manager: 2,
};
export function normalizeOrgAssignmentRole(input) {
    const v = String(input ?? "").trim().toLowerCase();
    if (!v)
        return null;
    if (v === "member" || v === "lead" || v === "manager")
        return v;
    return null;
}
export function roleMeetsRequirement(actual, required) {
    const a = normalizeOrgAssignmentRole(actual) ?? "member";
    return ROLE_RANK[a] >= ROLE_RANK[required];
}
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
export function getPrimaryAssignment(assignments) {
    return assignments.find((a) => a.isPrimary) ?? null;
}
export async function fetchUserOrgContext(userKey) {
    const db = getDb();
    const assignments = await db
        .select()
        .from(userOrgAssignments)
        .where(eq(userOrgAssignments.userKey, userKey));
    const orgScope = buildOrgScopeFromAssignments(assignments);
    const primaryAssignment = getPrimaryAssignment(assignments);
    return {
        userKey,
        orgScope,
        assignments: assignments,
        primaryAssignment: primaryAssignment,
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
function assignmentMeetsMinRole(a, minRole) {
    if (!minRole)
        return true;
    return roleMeetsRequirement(a.role, minRole);
}
export function canAccessByRule(args) {
    const { entityOwnerUserKey, entityScopes, rule, ctx } = args;
    // Admin bypass if provided
    if (ctx.roles?.includes("admin"))
        return true;
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
            return ctx.assignments.some((a) => a.divisionId === s.divisionId && assignmentMeetsMinRole(a, rule.minRole));
        });
    }
    if (rule.type === "sameDepartment") {
        return scopes.some((s) => {
            if (!s.departmentId)
                return false;
            return ctx.assignments.some((a) => a.departmentId === s.departmentId && assignmentMeetsMinRole(a, rule.minRole));
        });
    }
    if (rule.type === "sameLocation") {
        return scopes.some((s) => {
            if (!s.locationId)
                return false;
            return ctx.assignments.some((a) => a.locationId === s.locationId && assignmentMeetsMinRole(a, rule.minRole));
        });
    }
    if (rule.type === "sameLdd") {
        return scopes.some((s) => {
            return ctx.assignments.some((a) => scopeMatchesAssignment(s, a) && assignmentMeetsMinRole(a, rule.minRole));
        });
    }
    if (rule.type === "divisionManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameDivision", minRole: "manager" },
            ctx,
        });
    }
    if (rule.type === "departmentManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameDepartment", minRole: "manager" },
            ctx,
        });
    }
    if (rule.type === "locationManager") {
        return canAccessByRule({
            entityOwnerUserKey,
            entityScopes,
            rule: { type: "sameLocation", minRole: "manager" },
            ctx,
        });
    }
    return false;
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
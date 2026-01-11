import { and, eq } from "drizzle-orm";
import type { OrgScope, OwnershipScope, UserOrgAssignment } from "../../schema/org-dimensions";
import { orgEntityScopes, userOrgAssignments } from "@/lib/feature-pack-schemas";
import { getDb } from "@/lib/db";
import { isInUserOrgScope, isOwner } from "./org-utils";

export type LddScope = Pick<OwnershipScope, "divisionId" | "departmentId" | "locationId">;

export function hasAnyLdd(scope: LddScope | null | undefined): boolean {
  if (!scope) return false;
  return Boolean(scope.divisionId || scope.departmentId || scope.locationId);
}

export function normalizeLddScope(input: Partial<LddScope> | null | undefined): LddScope {
  return {
    divisionId: input?.divisionId ?? null,
    departmentId: input?.departmentId ?? null,
    locationId: input?.locationId ?? null,
  };
}

export interface UserOrgContext {
  userKey: string;
  orgScope: OrgScope;
  assignments: UserOrgAssignment[];
}

export function buildOrgScopeFromAssignments(assignments: UserOrgAssignment[]): OrgScope {
  const scope: OrgScope = { divisionIds: [], departmentIds: [], locationIds: [] };
  for (const a of assignments) {
    if (a.divisionId && !scope.divisionIds.includes(a.divisionId)) scope.divisionIds.push(a.divisionId);
    if (a.departmentId && !scope.departmentIds.includes(a.departmentId)) scope.departmentIds.push(a.departmentId);
    if (a.locationId && !scope.locationIds.includes(a.locationId)) scope.locationIds.push(a.locationId);
  }
  return scope;
}

export async function fetchUserOrgContext(userKey: string): Promise<UserOrgContext> {
  const db = getDb();
  const assignments = await db
    .select()
    .from(userOrgAssignments)
    .where(eq(userOrgAssignments.userKey, userKey));

  const orgScope = buildOrgScopeFromAssignments(assignments as any);

  return {
    userKey,
    orgScope,
    assignments: assignments as any,
  };
}

export async function fetchEntityExtraScopes(args: {
  entityType: string;
  entityId: string;
  scopeKind?: string;
}): Promise<LddScope[]> {
  const { entityType, entityId, scopeKind } = args;
  const db = getDb();
  const where = and(
    eq(orgEntityScopes.entityType, entityType),
    eq(orgEntityScopes.entityId, entityId as any),
    ...(scopeKind ? [eq(orgEntityScopes.scopeKind, scopeKind)] : [])
  );

  const rows = await db
    .select({
      divisionId: orgEntityScopes.divisionId,
      departmentId: orgEntityScopes.departmentId,
      locationId: orgEntityScopes.locationId,
    })
    .from(orgEntityScopes)
    .where(where);

  return (rows as any[]).map((r) => normalizeLddScope(r));
}

export function mergePrimaryAndExtraScopes(args: {
  primary?: LddScope | null;
  extras?: LddScope[] | null;
}): LddScope[] {
  const out: LddScope[] = [];
  if (args.primary && hasAnyLdd(args.primary)) out.push(normalizeLddScope(args.primary));
  if (Array.isArray(args.extras)) {
    for (const s of args.extras) {
      if (hasAnyLdd(s)) out.push(normalizeLddScope(s));
    }
  }
  return out;
}

export type LddAccessRule =
  | { type: "owner" }
  | { type: "sameDivision" }
  | { type: "sameDepartment" }
  | { type: "sameLocation" }
  | { type: "anyLdd" }
  | { type: "sameLdd" }
  | { type: "divisionManager" }
  | { type: "departmentManager" }
  | { type: "locationManager" };

export interface LddAccessContext {
  userKey: string;
  orgScope: OrgScope | null;
  assignments: Array<Pick<UserOrgAssignment, "divisionId" | "departmentId" | "locationId">>;
  roles?: string[];
}

function scopeMatchesAssignment(scope: LddScope, a: { divisionId?: string | null; departmentId?: string | null; locationId?: string | null }): boolean {
  // For each dimension set on the scope, require exact match.
  if (scope.divisionId && scope.divisionId !== (a.divisionId ?? null)) return false;
  if (scope.departmentId && scope.departmentId !== (a.departmentId ?? null)) return false;
  if (scope.locationId && scope.locationId !== (a.locationId ?? null)) return false;
  return true;
}

export function canAccessByRule(args: {
  entityOwnerUserKey?: string | null;
  entityScopes: LddScope[];
  rule: LddAccessRule;
  ctx: LddAccessContext;
}): boolean {
  const { entityOwnerUserKey, entityScopes, rule, ctx } = args;

  // Admin bypass if provided
  if (ctx.roles?.includes("admin")) return true;

  if (rule.type === "owner") {
    return isOwner(entityOwnerUserKey, ctx.userKey);
  }

  const scopes = Array.isArray(entityScopes) ? entityScopes.filter(hasAnyLdd).map(normalizeLddScope) : [];
  if (scopes.length === 0) return false;

  if (rule.type === "anyLdd") {
    // Any dimension match against user's resolved OrgScope.
    return scopes.some((s) => isInUserOrgScope(s as any, ctx.orgScope ?? null));
  }

  if (rule.type === "sameDivision") {
    return scopes.some((s) => {
      if (!s.divisionId) return false;
      return ctx.assignments.some((a) => a.divisionId === s.divisionId);
    });
  }

  if (rule.type === "sameDepartment") {
    return scopes.some((s) => {
      if (!s.departmentId) return false;
      return ctx.assignments.some((a) => a.departmentId === s.departmentId);
    });
  }

  if (rule.type === "sameLocation") {
    return scopes.some((s) => {
      if (!s.locationId) return false;
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

export function canAccessByAnyRule(args: {
  entityOwnerUserKey?: string | null;
  entityScopes: LddScope[];
  rules: LddAccessRule[];
  ctx: LddAccessContext;
}): boolean {
  const { entityOwnerUserKey, entityScopes, rules, ctx } = args;
  return rules.some((rule) => canAccessByRule({ entityOwnerUserKey, entityScopes, rule, ctx }));
}

export function isLddMutation(args: {
  before: LddScope | null | undefined;
  after: LddScope | null | undefined;
}): boolean {
  const b = normalizeLddScope(args.before);
  const a = normalizeLddScope(args.after);
  return b.divisionId !== a.divisionId || b.departmentId !== a.departmentId || b.locationId !== a.locationId;
}


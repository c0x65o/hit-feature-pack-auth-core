import type { OrgScope, OwnershipScope, UserOrgAssignment } from "../../schema/org-dimensions";
export type OrgAssignmentRole = "member" | "lead" | "manager";
export declare function normalizeOrgAssignmentRole(input: unknown): OrgAssignmentRole | null;
export declare function roleMeetsRequirement(actual: unknown, required: OrgAssignmentRole): boolean;
export type LddScope = Pick<OwnershipScope, "divisionId" | "departmentId" | "locationId">;
export declare function hasAnyLdd(scope: LddScope | null | undefined): boolean;
export declare function normalizeLddScope(input: Partial<LddScope> | null | undefined): LddScope;
export interface UserOrgContext {
    userKey: string;
    orgScope: OrgScope;
    assignments: UserOrgAssignment[];
    primaryAssignment: UserOrgAssignment | null;
}
export declare function buildOrgScopeFromAssignments(assignments: UserOrgAssignment[]): OrgScope;
export declare function getPrimaryAssignment(assignments: UserOrgAssignment[]): UserOrgAssignment | null;
export declare function fetchUserOrgContext(userKey: string): Promise<UserOrgContext>;
export declare function fetchEntityExtraScopes(args: {
    entityType: string;
    entityId: string;
    scopeKind?: string;
}): Promise<LddScope[]>;
export declare function mergePrimaryAndExtraScopes(args: {
    primary?: LddScope | null;
    extras?: LddScope[] | null;
}): LddScope[];
export type LddAccessRule = {
    type: "owner";
} | {
    type: "sameDivision";
    minRole?: OrgAssignmentRole;
} | {
    type: "sameDepartment";
    minRole?: OrgAssignmentRole;
} | {
    type: "sameLocation";
    minRole?: OrgAssignmentRole;
} | {
    type: "anyLdd";
    minRole?: OrgAssignmentRole;
} | {
    type: "sameLdd";
    minRole?: OrgAssignmentRole;
} | {
    type: "divisionManager";
} | {
    type: "departmentManager";
} | {
    type: "locationManager";
};
export interface LddAccessContext {
    userKey: string;
    orgScope: OrgScope | null;
    assignments: Array<Pick<UserOrgAssignment, "divisionId" | "departmentId" | "locationId" | "role">>;
    roles?: string[];
}
export declare function canAccessByRule(args: {
    entityOwnerUserKey?: string | null;
    entityScopes: LddScope[];
    rule: LddAccessRule;
    ctx: LddAccessContext;
}): boolean;
export declare function canAccessByAnyRule(args: {
    entityOwnerUserKey?: string | null;
    entityScopes: LddScope[];
    rules: LddAccessRule[];
    ctx: LddAccessContext;
}): boolean;
export declare function isLddMutation(args: {
    before: LddScope | null | undefined;
    after: LddScope | null | undefined;
}): boolean;
//# sourceMappingURL=ldd-scoping.d.ts.map
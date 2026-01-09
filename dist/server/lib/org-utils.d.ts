/**
 * Org Dimension Utilities
 *
 * Helpers for checking org scope membership, ownership, and approval routing.
 *
 * These utilities work with the org dimensions schema (divisions, departments)
 * and integrate with the locations feature pack.
 */
import type { OrgScope, OwnershipScope } from "../../schema/org-dimensions";
/**
 * Check if a user is the owner of an entity
 *
 * @param entityOwnerUserKey - The entity's ownerUserId/ownerUserKey field
 * @param userKey - The current user's key (email/sub)
 * @returns true if the user is the owner
 */
export declare function isOwner(entityOwnerUserKey: string | null | undefined, userKey: string | null | undefined): boolean;
/**
 * Check if an entity's division matches any of the user's divisions
 *
 * @param entityDivisionId - The entity's divisionId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's divisions
 */
export declare function isSameDivision(entityDivisionId: string | null | undefined, orgScope: OrgScope | null | undefined): boolean;
/**
 * Check if an entity's division matches the user's primary division
 *
 * @param entityDivisionId - The entity's divisionId field
 * @param primaryDivisionId - The user's primary division ID
 * @returns true if the entity is in the user's primary division
 */
export declare function isPrimaryDivision(entityDivisionId: string | null | undefined, primaryDivisionId: string | null | undefined): boolean;
/**
 * Check if an entity's department matches any of the user's departments
 *
 * @param entityDepartmentId - The entity's departmentId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's departments
 */
export declare function isSameDepartment(entityDepartmentId: string | null | undefined, orgScope: OrgScope | null | undefined): boolean;
/**
 * Check if an entity's location matches any of the user's locations
 *
 * @param entityLocationId - The entity's locationId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's locations
 */
export declare function isSameLocation(entityLocationId: string | null | undefined, orgScope: OrgScope | null | undefined): boolean;
/**
 * Check if any of the entity's org dimensions match the user's scope
 *
 * This is useful for "can see anything in my org" type permissions.
 *
 * @param entityScope - The entity's ownership scope
 * @param userOrgScope - The user's resolved org scope
 * @returns true if any dimension matches
 */
export declare function isInUserOrgScope(entityScope: OwnershipScope | null | undefined, userOrgScope: OrgScope | null | undefined): boolean;
/**
 * Check if ALL of the entity's org dimensions match the user's scope
 *
 * This is useful for strict "must be in same division AND department" type permissions.
 *
 * @param entityScope - The entity's ownership scope
 * @param userOrgScope - The user's resolved org scope
 * @returns true if all set dimensions match
 */
export declare function isFullyInUserOrgScope(entityScope: OwnershipScope | null | undefined, userOrgScope: OrgScope | null | undefined): boolean;
export interface AccessCheckContext {
    userKey: string;
    roles: string[];
    orgScope: OrgScope;
}
export interface EntityWithScope {
    ownerUserKey?: string | null;
    divisionId?: string | null;
    departmentId?: string | null;
    locationId?: string | null;
}
/**
 * Common access patterns for entity visibility
 */
export declare const AccessPatterns: {
    /**
     * Owner-only: Only the entity owner can access
     */
    readonly ownerOnly: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Owner or admin: Owner or any admin role
     */
    readonly ownerOrAdmin: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Same division: Anyone in the same division
     */
    readonly sameDivision: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Same department: Anyone in the same department
     */
    readonly sameDepartment: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Same location: Anyone in the same location
     */
    readonly sameLocation: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Owner or same division: Owner, or anyone in the same division
     */
    readonly ownerOrSameDivision: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Owner or same department: Owner, or anyone in the same department
     */
    readonly ownerOrSameDepartment: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
    /**
     * Any matching org scope: Owner or any matching org dimension
     */
    readonly ownerOrSameOrg: (entity: EntityWithScope, ctx: AccessCheckContext) => boolean;
};
export interface ApproverRoutingConfig {
    /**
     * Route to the entity's division manager
     */
    divisionManager?: boolean;
    /**
     * Route to the entity's department manager
     */
    departmentManager?: boolean;
    /**
     * Route to specific roles (e.g., ["admin", "sales_manager"])
     */
    roles?: string[];
    /**
     * Route to specific group IDs
     */
    groupIds?: string[];
}
/**
 * Principal reference for approval routing
 */
export interface ApproverPrincipal {
    type: "user" | "role" | "group";
    id: string;
    label?: string;
}
/**
 * Get approver principals for an entity based on routing config
 *
 * Note: This function requires additional context (division/department managers)
 * that must be fetched from the database. It returns a list of principal
 * references that can be used for inbox routing.
 *
 * @param config - Routing configuration
 * @param context - Additional context (managers, etc.)
 * @returns Array of approver principals
 */
export declare function getApproverPrincipals(config: ApproverRoutingConfig, context?: {
    divisionManagerUserKey?: string | null;
    departmentManagerUserKey?: string | null;
}): ApproverPrincipal[];
//# sourceMappingURL=org-utils.d.ts.map
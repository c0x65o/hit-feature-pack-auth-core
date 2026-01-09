/**
 * Org Dimension Utilities
 *
 * Helpers for checking org scope membership, ownership, and approval routing.
 *
 * These utilities work with the org dimensions schema (divisions, departments)
 * and integrate with the locations feature pack.
 */

import type { OrgScope, OwnershipScope } from "../../schema/org-dimensions";

// ─────────────────────────────────────────────────────────────────────────────
// OWNERSHIP CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user is the owner of an entity
 *
 * @param entityOwnerUserKey - The entity's ownerUserId/ownerUserKey field
 * @param userKey - The current user's key (email/sub)
 * @returns true if the user is the owner
 */
export function isOwner(
  entityOwnerUserKey: string | null | undefined,
  userKey: string | null | undefined
): boolean {
  if (!entityOwnerUserKey || !userKey) return false;
  return entityOwnerUserKey.toLowerCase() === userKey.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVISION CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an entity's division matches any of the user's divisions
 *
 * @param entityDivisionId - The entity's divisionId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's divisions
 */
export function isSameDivision(
  entityDivisionId: string | null | undefined,
  orgScope: OrgScope | null | undefined
): boolean {
  if (!entityDivisionId || !orgScope) return false;
  return orgScope.divisionIds.includes(entityDivisionId);
}

/**
 * Check if an entity's division matches the user's primary division
 *
 * @param entityDivisionId - The entity's divisionId field
 * @param primaryDivisionId - The user's primary division ID
 * @returns true if the entity is in the user's primary division
 */
export function isPrimaryDivision(
  entityDivisionId: string | null | undefined,
  primaryDivisionId: string | null | undefined
): boolean {
  if (!entityDivisionId || !primaryDivisionId) return false;
  return entityDivisionId === primaryDivisionId;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an entity's department matches any of the user's departments
 *
 * @param entityDepartmentId - The entity's departmentId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's departments
 */
export function isSameDepartment(
  entityDepartmentId: string | null | undefined,
  orgScope: OrgScope | null | undefined
): boolean {
  if (!entityDepartmentId || !orgScope) return false;
  return orgScope.departmentIds.includes(entityDepartmentId);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if an entity's location matches any of the user's locations
 *
 * @param entityLocationId - The entity's locationId field
 * @param orgScope - The user's resolved org scope
 * @returns true if the entity is in one of the user's locations
 */
export function isSameLocation(
  entityLocationId: string | null | undefined,
  orgScope: OrgScope | null | undefined
): boolean {
  if (!entityLocationId || !orgScope) return false;
  return orgScope.locationIds.includes(entityLocationId);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED SCOPE CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if any of the entity's org dimensions match the user's scope
 *
 * This is useful for "can see anything in my org" type permissions.
 *
 * @param entityScope - The entity's ownership scope
 * @param userOrgScope - The user's resolved org scope
 * @returns true if any dimension matches
 */
export function isInUserOrgScope(
  entityScope: OwnershipScope | null | undefined,
  userOrgScope: OrgScope | null | undefined
): boolean {
  if (!entityScope || !userOrgScope) return false;

  // Check division
  if (entityScope.divisionId && userOrgScope.divisionIds.includes(entityScope.divisionId)) {
    return true;
  }

  // Check department
  if (entityScope.departmentId && userOrgScope.departmentIds.includes(entityScope.departmentId)) {
    return true;
  }

  // Check location
  if (entityScope.locationId && userOrgScope.locationIds.includes(entityScope.locationId)) {
    return true;
  }

  return false;
}

/**
 * Check if ALL of the entity's org dimensions match the user's scope
 *
 * This is useful for strict "must be in same division AND department" type permissions.
 *
 * @param entityScope - The entity's ownership scope
 * @param userOrgScope - The user's resolved org scope
 * @returns true if all set dimensions match
 */
export function isFullyInUserOrgScope(
  entityScope: OwnershipScope | null | undefined,
  userOrgScope: OrgScope | null | undefined
): boolean {
  if (!entityScope || !userOrgScope) return false;

  // Check division (if set on entity)
  if (
    entityScope.divisionId &&
    !userOrgScope.divisionIds.includes(entityScope.divisionId)
  ) {
    return false;
  }

  // Check department (if set on entity)
  if (
    entityScope.departmentId &&
    !userOrgScope.departmentIds.includes(entityScope.departmentId)
  ) {
    return false;
  }

  // Check location (if set on entity)
  if (
    entityScope.locationId &&
    !userOrgScope.locationIds.includes(entityScope.locationId)
  ) {
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS CHECK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
export const AccessPatterns = {
  /**
   * Owner-only: Only the entity owner can access
   */
  ownerOnly: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return isOwner(entity.ownerUserKey, ctx.userKey);
  },

  /**
   * Owner or admin: Owner or any admin role
   */
  ownerOrAdmin: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    if (ctx.roles.includes("admin")) return true;
    return isOwner(entity.ownerUserKey, ctx.userKey);
  },

  /**
   * Same division: Anyone in the same division
   */
  sameDivision: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return isSameDivision(entity.divisionId, ctx.orgScope);
  },

  /**
   * Same department: Anyone in the same department
   */
  sameDepartment: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return isSameDepartment(entity.departmentId, ctx.orgScope);
  },

  /**
   * Same location: Anyone in the same location
   */
  sameLocation: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return isSameLocation(entity.locationId, ctx.orgScope);
  },

  /**
   * Owner or same division: Owner, or anyone in the same division
   */
  ownerOrSameDivision: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return (
      isOwner(entity.ownerUserKey, ctx.userKey) ||
      isSameDivision(entity.divisionId, ctx.orgScope)
    );
  },

  /**
   * Owner or same department: Owner, or anyone in the same department
   */
  ownerOrSameDepartment: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    return (
      isOwner(entity.ownerUserKey, ctx.userKey) ||
      isSameDepartment(entity.departmentId, ctx.orgScope)
    );
  },

  /**
   * Any matching org scope: Owner or any matching org dimension
   */
  ownerOrSameOrg: (entity: EntityWithScope, ctx: AccessCheckContext): boolean => {
    if (isOwner(entity.ownerUserKey, ctx.userKey)) return true;
    return isInUserOrgScope(entity, ctx.orgScope);
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL ROUTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
export function getApproverPrincipals(
  config: ApproverRoutingConfig,
  context: {
    divisionManagerUserKey?: string | null;
    departmentManagerUserKey?: string | null;
  } = {}
): ApproverPrincipal[] {
  const principals: ApproverPrincipal[] = [];

  // Add division manager
  if (config.divisionManager && context.divisionManagerUserKey) {
    principals.push({
      type: "user",
      id: context.divisionManagerUserKey,
      label: "Division Manager",
    });
  }

  // Add department manager
  if (config.departmentManager && context.departmentManagerUserKey) {
    principals.push({
      type: "user",
      id: context.departmentManagerUserKey,
      label: "Department Manager",
    });
  }

  // Add roles
  if (config.roles) {
    for (const role of config.roles) {
      principals.push({
        type: "role",
        id: role,
        label: `Role: ${role}`,
      });
    }
  }

  // Add groups
  if (config.groupIds) {
    for (const groupId of config.groupIds) {
      principals.push({
        type: "group",
        id: groupId,
      });
    }
  }

  return principals;
}

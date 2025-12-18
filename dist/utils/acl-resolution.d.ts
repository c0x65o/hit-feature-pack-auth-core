/**
 * ACL Resolution Utilities
 *
 * Utilities for resolving effective permissions from ACL entries.
 * Supports both hierarchical and granular permission modes.
 */
import type { AclEntry, HierarchicalPermission, PrincipalType } from '@hit/ui-kit';
export interface AclResolutionContext {
    userPrincipals: {
        userId: string;
        groupIds: string[];
        roles: string[];
    };
    entries: AclEntry[];
    hierarchicalPermissions?: HierarchicalPermission[];
}
/**
 * Resolve effective permissions for a user given ACL entries.
 * Returns array of permission keys the user has.
 */
export declare function resolveEffectivePermissions(context: AclResolutionContext): string[];
/**
 * Check if user has a specific permission.
 */
export declare function hasPermission(context: AclResolutionContext, permission: string): boolean;
/**
 * For hierarchical mode: get the user's effective permission level.
 * Returns the highest-priority level that matches.
 */
export declare function getEffectiveLevel(context: AclResolutionContext): HierarchicalPermission | null;
/**
 * Check if a principal matches the user's principals.
 */
export declare function principalMatches(principalType: PrincipalType, principalId: string, userPrincipals: AclResolutionContext['userPrincipals']): boolean;
//# sourceMappingURL=acl-resolution.d.ts.map
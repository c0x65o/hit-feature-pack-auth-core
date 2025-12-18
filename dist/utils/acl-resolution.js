/**
 * ACL Resolution Utilities
 *
 * Utilities for resolving effective permissions from ACL entries.
 * Supports both hierarchical and granular permission modes.
 */
/**
 * Resolve effective permissions for a user given ACL entries.
 * Returns array of permission keys the user has.
 */
export function resolveEffectivePermissions(context) {
    const { userPrincipals, entries } = context;
    const permissionSet = new Set();
    // Find all matching ACL entries
    for (const entry of entries) {
        let matches = false;
        // Check if entry matches user directly
        if (entry.principalType === 'user' && entry.principalId === userPrincipals.userId) {
            matches = true;
        }
        // Check if entry matches user's groups
        if (entry.principalType === 'group' && userPrincipals.groupIds.includes(entry.principalId)) {
            matches = true;
        }
        // Check if entry matches user's roles
        if (entry.principalType === 'role' && userPrincipals.roles.includes(entry.principalId)) {
            matches = true;
        }
        // If match, add all permissions from this entry
        if (matches && Array.isArray(entry.permissions)) {
            entry.permissions.forEach((perm) => permissionSet.add(perm));
        }
    }
    return Array.from(permissionSet);
}
/**
 * Check if user has a specific permission.
 */
export function hasPermission(context, permission) {
    const effectivePermissions = resolveEffectivePermissions(context);
    return effectivePermissions.includes(permission);
}
/**
 * For hierarchical mode: get the user's effective permission level.
 * Returns the highest-priority level that matches.
 */
export function getEffectiveLevel(context) {
    const { hierarchicalPermissions } = context;
    if (!hierarchicalPermissions || hierarchicalPermissions.length === 0) {
        return null;
    }
    // Get all effective permissions
    const effectivePermissions = resolveEffectivePermissions(context);
    if (effectivePermissions.length === 0) {
        return null;
    }
    // Sort hierarchical permissions by priority (highest first)
    const sortedPermissions = [...hierarchicalPermissions].sort((a, b) => b.priority - a.priority);
    // Find the highest-priority level where all its included permissions are present
    for (const level of sortedPermissions) {
        if (level.includes && level.includes.length > 0) {
            // Check if user has all permissions included in this level
            const hasAllPermissions = level.includes.every((perm) => effectivePermissions.includes(perm));
            if (hasAllPermissions) {
                return level;
            }
        }
        else {
            // If no includes specified, check if user has the level key itself
            if (effectivePermissions.includes(level.key)) {
                return level;
            }
        }
    }
    // If no exact match, return the lowest priority level that has any matching permissions
    // This handles cases where permissions don't exactly match a level
    const reverseSorted = [...sortedPermissions].reverse();
    for (const level of reverseSorted) {
        if (level.includes && level.includes.some((perm) => effectivePermissions.includes(perm))) {
            return level;
        }
        if (effectivePermissions.includes(level.key)) {
            return level;
        }
    }
    return null;
}
/**
 * Check if a principal matches the user's principals.
 */
export function principalMatches(principalType, principalId, userPrincipals) {
    if (principalType === 'user') {
        return principalId === userPrincipals.userId;
    }
    if (principalType === 'group') {
        return userPrincipals.groupIds.includes(principalId);
    }
    if (principalType === 'role') {
        return userPrincipals.roles.includes(principalId);
    }
    return false;
}
//# sourceMappingURL=acl-resolution.js.map
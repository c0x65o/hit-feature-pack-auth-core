import type { Principal, PrincipalType } from '@hit/ui-kit';
export interface UsePrincipalsOptions {
    users?: boolean;
    groups?: boolean;
    roles?: boolean;
    search?: string;
}
export interface UsePrincipalsResult {
    principals: Principal[];
    loading: boolean;
    error: Error | null;
    refresh: () => void;
}
/**
 * Creates a fetchPrincipals function for use with AclPicker.
 *
 * @param options.isAdmin Whether the current user is an admin (allows seeing all groups/roles)
 * @param options.extraPrincipals Optional callback to provide additional principals (e.g. from local pack db)
 */
export declare function createFetchPrincipals(options?: {
    isAdmin?: boolean;
    extraPrincipals?: (type: PrincipalType, search?: string) => Promise<Principal[]>;
}): (type: PrincipalType, search?: string) => Promise<Principal[]>;
/**
 * Unified hook to fetch principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */
export declare function usePrincipals(options?: UsePrincipalsOptions): UsePrincipalsResult;
//# sourceMappingURL=usePrincipals.d.ts.map
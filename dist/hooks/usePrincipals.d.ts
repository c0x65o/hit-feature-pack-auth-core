import type { Principal } from '@hit/ui-kit';
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
 * Unified hook to fetch principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */
export declare function usePrincipals(options?: UsePrincipalsOptions): UsePrincipalsResult;
//# sourceMappingURL=usePrincipals.d.ts.map
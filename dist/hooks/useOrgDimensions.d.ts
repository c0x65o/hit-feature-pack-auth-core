import type { OrgScope } from '../schema/org-dimensions';
export interface LocationType {
    id: string;
    name: string;
    code: string;
    icon: string;
    color: string;
    description: string | null;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Location {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
    parentId: string | null;
    locationTypeId: string | null;
    locationTypeName?: string | null;
    managerUserKey: string | null;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Division {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    parentId: string | null;
    managerUserKey: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Department {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    divisionId: string | null;
    divisionName?: string | null;
    parentId: string | null;
    managerUserKey: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface UserOrgAssignment {
    id: string;
    userKey: string;
    divisionId: string | null;
    divisionName?: string | null;
    departmentId: string | null;
    departmentName?: string | null;
    locationId: string | null;
    locationName?: string | null;
    isPrimary: boolean;
    role: string | null;
    createdAt: string;
    createdByUserKey: string | null;
}
interface QueryOptions {
    search?: string;
    active?: boolean;
    divisionId?: string;
}
export declare function useLocationTypes(): {
    data: LocationType[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useLocationTypeMutations(): {
    create: (data: Partial<LocationType>) => Promise<LocationType>;
    loading: boolean;
    error: Error | null;
};
interface LocationQueryOptions {
    search?: string;
    active?: boolean;
    locationTypeId?: string;
}
export declare function useLocations(options?: LocationQueryOptions): {
    data: Location[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useLocation(id: string | null): {
    data: Location | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useLocationMutations(): {
    create: (data: Partial<Location>) => Promise<Location>;
    update: (id: string, data: Partial<Location>) => Promise<Location>;
    remove: (id: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export declare function useDivisions(options?: QueryOptions): {
    data: Division[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useDivision(id: string | null): {
    data: Division | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useDivisionMutations(): {
    create: (data: Partial<Division>) => Promise<Division>;
    update: (id: string, data: Partial<Division>) => Promise<Division>;
    remove: (id: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export declare function useDepartments(options?: QueryOptions): {
    data: Department[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useDepartment(id: string | null): {
    data: Department | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useDepartmentMutations(): {
    create: (data: Partial<Department>) => Promise<Department>;
    update: (id: string, data: Partial<Department>) => Promise<Department>;
    remove: (id: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
interface UserAssignmentQueryOptions {
    userKey?: string;
    divisionId?: string;
    departmentId?: string;
    locationId?: string;
}
export declare function useUserOrgAssignments(options?: UserAssignmentQueryOptions): {
    data: UserOrgAssignment[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUserOrgAssignmentMutations(): {
    create: (data: Partial<UserOrgAssignment>) => Promise<UserOrgAssignment>;
    update: (id: string, data: Partial<UserOrgAssignment>) => Promise<UserOrgAssignment>;
    remove: (id: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
/**
 * Get the current user's org scope (their divisions, departments, locations)
 *
 * This is the primary hook for checking org-based access patterns.
 */
export declare function useMyOrgScope(): {
    data: OrgScope | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
/**
 * Get org scope for a specific user (admin use)
 */
export declare function useUserOrgScope(userKey: string | null): {
    data: OrgScope | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export {};
//# sourceMappingURL=useOrgDimensions.d.ts.map
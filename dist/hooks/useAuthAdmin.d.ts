interface User {
    email: string;
    email_verified: boolean;
    two_factor_enabled: boolean;
    role?: string;
    roles?: string[];
    metadata?: {
        role?: string;
        [key: string]: unknown;
    };
    created_at: string;
    updated_at?: string;
    last_login?: string | null;
    oauth_providers?: string[] | null;
    locked?: boolean;
    profile_picture_url?: string | null;
    profile_fields?: Record<string, unknown> | null;
}
interface Session {
    id: string;
    user_email: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    expires_at: string;
    current?: boolean;
}
interface AuditLogEntry {
    id: string;
    user_email: string;
    event_type: string;
    ip_address: string;
    user_agent?: string;
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    created_at: string;
}
interface Invite {
    id: string;
    email: string;
    role?: string;
    roles?: string[];
    invited_by?: string;
    inviter_email?: string;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
}
interface Stats {
    total_users: number;
    active_sessions: number;
    failed_logins_24h: number;
    new_users_7d: number;
    two_factor_adoption: number;
    pending_invites: number;
}
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
export interface AuthFeatures {
    user_groups_enabled?: boolean;
    dynamic_groups_enabled?: boolean;
    [k: string]: unknown;
}
export declare function useAuthFeatures(): {
    data: AuthFeatures | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
interface UseQueryOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
declare class AuthAdminError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string);
    isAuthError(): boolean;
}
export declare function useStats(): {
    stats: Stats | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUsers(options?: UseQueryOptions): {
    data: PaginatedResponse<User> | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUser(email: string): {
    user: User | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useSessions(options?: UseQueryOptions): {
    data: PaginatedResponse<Session> | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUserSessions(email: string, options?: {
    page?: number;
    pageSize?: number;
}): {
    data: PaginatedResponse<Session> | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useAuditLog(options?: UseQueryOptions): {
    data: PaginatedResponse<AuditLogEntry> | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useInvites(options?: UseQueryOptions): {
    data: PaginatedResponse<Invite> | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUserMutations(): {
    createUser: (data: {
        email: string;
        password: string;
        roles?: string[];
    }) => Promise<void>;
    deleteUser: (email: string) => Promise<void>;
    resetPassword: (email: string, sendEmail?: boolean, password?: string) => Promise<{
        status: string;
        message: string;
    }>;
    resendVerification: (email: string) => Promise<void>;
    verifyEmail: (email: string) => Promise<void>;
    updateRoles: (email: string, role: string) => Promise<void>;
    updateUser: (email: string, updates: {
        role?: string;
        profile_fields?: Record<string, unknown>;
        profile_picture_url?: string | null;
    }) => Promise<void>;
    uploadProfilePicture: (email: string, file: File) => Promise<string>;
    uploadProfilePictureBase64: (email: string, base64DataUrl: string) => Promise<string>;
    deleteProfilePicture: (email: string) => Promise<void>;
    lockUser: (email: string) => Promise<void>;
    unlockUser: (email: string) => Promise<void>;
    startImpersonation: (userEmail: string) => Promise<{
        token: string;
        refresh_token?: string;
        impersonated_user?: {
            email?: string;
            email_verified?: boolean;
            roles?: string[];
        };
        admin_email?: string;
    }>;
    loading: boolean;
    error: Error | null;
};
export declare function useSessionMutations(): {
    revokeSession: (sessionId: string) => Promise<void>;
    revokeAllUserSessions: (email: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export declare function useInviteMutations(): {
    createInvite: (data: {
        email: string;
        role?: string;
    }) => Promise<void>;
    resendInvite: (inviteId: string) => Promise<void>;
    revokeInvite: (inviteId: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
interface AuthAdminConfig {
    allow_signup: boolean;
    allow_invited: boolean;
    password_reset: boolean;
    two_factor_auth: boolean;
    audit_log: boolean;
    magic_link_login: boolean;
    email_verification: boolean;
    oauth_providers: string[];
    rate_limiting: boolean;
    two_factor_required: boolean;
    recovery_codes_enabled: boolean;
    remember_device: boolean;
    device_fingerprinting: boolean;
    new_device_alerts: boolean;
    lockout_notify_user: boolean;
    profile_picture?: boolean;
    additional_profile_fields?: Array<{
        field_key: string;
        field_label: string;
        field_type: string;
        required?: boolean;
        display_order?: number;
    }>;
}
/**
 * Hook to get auth admin config.
 *
 * Config is STATIC - generated at build time from hit.yaml and injected
 * into window.__HIT_CONFIG by HitAppProvider. No API calls needed.
 *
 * This hook reads config synchronously from the window global,
 * avoiding any loading states or UI flicker.
 *
 * Uses useEffect to update config when it becomes available (handles SSR/hydration timing).
 */
export declare function useAuthAdminConfig(): {
    config: AuthAdminConfig;
    loading: boolean;
    error: null;
};
export interface ProfileFieldMetadata {
    id: string;
    field_key: string;
    field_label: string;
    field_type: 'string' | 'int';
    required: boolean;
    default_value: string | null;
    validation_rules: Record<string, unknown> | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}
export interface ProfileFieldMetadataCreate {
    field_key: string;
    field_label: string;
    field_type: 'string' | 'int';
    required?: boolean;
    default_value?: string | null;
    validation_rules?: Record<string, unknown> | null;
    display_order?: number;
}
export interface ProfileFieldMetadataUpdate {
    field_label?: string;
    field_type?: 'string' | 'int';
    required?: boolean;
    default_value?: string | null;
    validation_rules?: Record<string, unknown> | null;
    display_order?: number;
}
/**
 * Hook to fetch profile fields metadata
 */
export declare function useProfileFields(): {
    data: ProfileFieldMetadata[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for profile fields mutations
 */
export declare function useProfileFieldMutations(): {
    createField: (field: ProfileFieldMetadataCreate) => Promise<any>;
    updateField: (fieldKey: string, field: ProfileFieldMetadataUpdate) => Promise<any>;
    deleteField: (fieldKey: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export interface RolePagePermission {
    id: string;
    role: string;
    page_path: string;
    enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
}
export interface UserPageOverride {
    id: string;
    user_email: string;
    page_path: string;
    enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
}
export interface UserWithOverrides {
    email: string;
    role: string;
    override_count: number;
}
/**
 * Hook to fetch role page permissions
 */
export declare function useRolePagePermissions(role: string): {
    data: RolePagePermission[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
/**
 * Hook to fetch user page overrides
 */
export declare function useUserPageOverrides(email: string): {
    data: UserPageOverride[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
/**
 * Hook to fetch users with overrides
 */
export declare function useUsersWithOverrides(): {
    data: UserWithOverrides[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for page permissions mutations
 */
export declare function usePagePermissionsMutations(): {
    setRolePagePermission: (role: string, pagePath: string, enabled: boolean) => Promise<void>;
    deleteRolePagePermission: (role: string, pagePath: string) => Promise<void>;
    setUserPageOverride: (email: string, pagePath: string, enabled: boolean) => Promise<void>;
    deleteUserPageOverride: (email: string, pagePath: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
interface GroupPagePermission {
    id: string;
    page_path: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}
export declare function useGroupPagePermissions(groupId: string | null): {
    data: GroupPagePermission[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroupPagePermissionsMutations(): {
    setGroupPagePermission: (groupId: string, pagePath: string, enabled: boolean) => Promise<void>;
    deleteGroupPagePermission: (groupId: string, pagePath: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export interface PermissionActionDefinition {
    key: string;
    pack_name: string | null;
    pack_title: string | null;
    label: string;
    description: string | null;
    default_enabled: boolean;
    scope_modes?: Array<'none' | 'own' | 'ldd' | 'any'> | null;
}
export interface RoleActionPermission {
    id: string;
    action_key: string;
    enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
}
export interface GroupActionPermission {
    id: string;
    action_key: string;
    enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
}
export interface UserActionOverride {
    id: string;
    action_key: string;
    enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
}
export declare function usePermissionActions(): {
    data: PermissionActionDefinition[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useRoleActionPermissions(role: string): {
    data: RoleActionPermission[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUserActionOverrides(email: string): {
    data: UserActionOverride[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroupActionPermissions(groupId: string | null): {
    data: GroupActionPermission[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useActionPermissionsMutations(): {
    setRoleActionPermission: (role: string, actionKey: string, enabled: boolean) => Promise<void>;
    deleteRoleActionPermission: (role: string, actionKey: string) => Promise<void>;
    setUserActionOverride: (email: string, actionKey: string, enabled: boolean) => Promise<void>;
    deleteUserActionOverride: (email: string, actionKey: string) => Promise<void>;
    setGroupActionPermission: (groupId: string, actionKey: string, enabled: boolean) => Promise<void>;
    deleteGroupActionPermission: (groupId: string, actionKey: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
interface Group {
    id: string;
    name: string;
    description: string | null;
    metadata: Record<string, unknown>;
    user_count: number;
    created_at: string;
    updated_at: string;
}
interface UserGroup {
    id: string;
    user_email: string;
    group_id: string;
    group_name: string;
    created_at: string;
    created_by: string | null;
}
export interface SegmentDef {
    key: string;
    label: string;
    description?: string | null;
    entityKind: string;
    isActive: boolean;
}
export declare function useSegments(options?: {
    enabled?: boolean;
    entityKind?: string;
}): {
    data: SegmentDef[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroups(): {
    data: Group[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroup(groupId: string | null): {
    data: Group | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroupUsers(groupId: string | null): {
    data: UserGroup[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useUserGroups(userEmail: string | null): {
    data: UserGroup[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useGroupMutations(): {
    createGroup: (group: {
        name: string;
        description?: string | null;
        metadata?: Record<string, unknown>;
    }) => Promise<Group>;
    updateGroup: (groupId: string, group: {
        name?: string;
        description?: string | null;
        metadata?: Record<string, unknown>;
    }) => Promise<Group>;
    deleteGroup: (groupId: string) => Promise<void>;
    addUserToGroup: (groupId: string, userEmail: string) => Promise<UserGroup>;
    removeUserFromGroup: (groupId: string, userEmail: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export interface PermissionSet {
    id: string;
    name: string;
    description: string | null;
    template_role?: 'admin' | 'user' | null;
    created_at: string;
    updated_at: string;
}
export interface PermissionSetAssignment {
    id: string;
    principal_type: 'user' | 'group' | 'role';
    principal_id: string;
    created_at: string;
}
export interface PermissionSetPageGrant {
    id: string;
    page_path: string;
    created_at: string;
}
export interface PermissionSetActionGrant {
    id: string;
    action_key: string;
    created_at: string;
}
export interface PermissionSetMetricGrant {
    id: string;
    metric_key: string;
    created_at: string;
}
export interface EffectivePrincipalRef {
    principal_type: 'user' | 'group' | 'role';
    principal_id: string;
    label: string;
}
export interface EffectiveUserGroupRef {
    id: string;
    name: string;
    description: string | null;
    kind: string | null;
    segment_key: string | null;
}
export interface UserEffectivePermissions {
    user_email: string;
    role: string;
    is_admin: boolean;
    features: {
        user_groups_enabled: boolean;
        dynamic_groups_enabled: boolean;
    };
    groups: EffectiveUserGroupRef[];
    permission_sets: Array<{
        id: string;
        name: string;
        description: string | null;
        template_role?: string | null;
        assigned_via: EffectivePrincipalRef[];
    }>;
    templates?: {
        has_admin?: boolean;
        has_user?: boolean;
    };
    has_default_access: boolean;
    explicit_grants: {
        pages: string[];
        actions: string[];
        metrics: string[];
    };
    sources?: {
        actions?: Record<string, string[]>;
        metrics?: Record<string, string[]>;
    };
    effective: {
        pages: string[];
        actions: string[];
        metrics: string[];
    };
    counts: Record<string, number>;
}
export declare function useUserEffectivePermissions(userEmail: string | null): {
    data: UserEffectivePermissions | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function usePermissionSets(): {
    data: PermissionSet[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function usePermissionSet(id: string | null): {
    data: {
        permission_set: PermissionSet;
        assignments: PermissionSetAssignment[];
        page_grants: PermissionSetPageGrant[];
        action_grants: PermissionSetActionGrant[];
        metric_grants: PermissionSetMetricGrant[];
    } | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function usePermissionSetMutations(): {
    createPermissionSet: (data: {
        name: string;
        description?: string;
        template_role?: "admin" | "user" | null;
    }) => Promise<PermissionSet>;
    updatePermissionSet: (id: string, data: {
        name?: string;
        description?: string;
        template_role?: "admin" | "user" | null;
    }) => Promise<PermissionSet>;
    deletePermissionSet: (id: string) => Promise<void>;
    addAssignment: (psId: string, principalType: string, principalId: string) => Promise<void>;
    removeAssignment: (psId: string, assignmentId: string) => Promise<void>;
    addPageGrant: (psId: string, pagePath: string) => Promise<void>;
    removePageGrant: (psId: string, grantId: string) => Promise<void>;
    addActionGrant: (psId: string, actionKey: string) => Promise<void>;
    removeActionGrant: (psId: string, grantId: string) => Promise<void>;
    addMetricGrant: (psId: string, metricKey: string) => Promise<void>;
    removeMetricGrant: (psId: string, grantId: string) => Promise<void>;
    loading: boolean;
    error: Error | null;
};
export interface MetricCatalogItem {
    key: string;
    label: string;
    unit: string;
    category?: string;
    description?: string;
    owner?: {
        kind: 'feature_pack' | 'app' | 'user';
        id: string;
    };
    pointsCount: number;
}
/**
 * Fetch the full metrics catalog for admin purposes (permission configuration).
 * Uses ?admin=true to bypass ACL filtering - only admins can use this.
 */
export declare function useMetricsCatalog(): {
    data: MetricCatalogItem[] | null;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export { AuthAdminError };
export type { User, Session, AuditLogEntry, Invite, Stats, PaginatedResponse, AuthAdminConfig, Group, UserGroup, GroupPagePermission, };
//# sourceMappingURL=useAuthAdmin.d.ts.map
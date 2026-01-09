/**
 * Auth Core Hooks
 */
export { useAuthConfig, useLogin, useSignup, useForgotPassword, useResetPassword, useVerifyEmail, useOAuth, clearAuthToken, type AuthConfig, type LoginPayload, type SignupPayload, type AuthResponse, } from './useAuth';
/**
 * Auth Admin Hooks (merged into auth-core)
 *
 * React hooks for data fetching and mutations.
 */
export { useStats, useUsers, useUser, useSessions, useUserSessions, useAuditLog, useInvites, useUsersWithOverrides, useRolePagePermissions, useUserPageOverrides, useGroupPagePermissions, useGroups, useGroup, useGroupUsers, useUserGroups, useUserMutations, useSessionMutations, useInviteMutations, useAuthAdminConfig, useProfileFields, useProfileFieldMutations, usePagePermissionsMutations, useGroupPagePermissionsMutations, useGroupMutations, AuthAdminError, type User, type Session, type AuditLogEntry, type Invite, type Stats, type PaginatedResponse, type AuthAdminConfig, type ProfileFieldMetadata, type ProfileFieldMetadataCreate, type ProfileFieldMetadataUpdate, type RolePagePermission, type UserPageOverride, type UserWithOverrides, type Group, type UserGroup, type GroupPagePermission, } from './useAuthAdmin';
/**
 * ACL Hooks
 */
export { usePrincipals, createFetchPrincipals, type UsePrincipalsOptions, type UsePrincipalsResult, } from './usePrincipals';
/**
 * ACL Resolution Utilities
 */
export { resolveEffectivePermissions, hasPermission, getEffectiveLevel, principalMatches, type AclResolutionContext, } from '../utils/acl-resolution';
/**
 * Org Dimensions Hooks
 *
 * Note: Types (LocationType, Location, Division, Department, UserOrgAssignment)
 * are exported from schema/index.ts to avoid duplication.
 */
export { useLocationTypes, useLocationTypeMutations, useLocations, useLocation, useLocationMutations, useDivisions, useDivision, useDivisionMutations, useDepartments, useDepartment, useDepartmentMutations, useUserOrgAssignments, useUserOrgAssignmentMutations, useMyOrgScope, useUserOrgScope, } from './useOrgDimensions';
//# sourceMappingURL=index.d.ts.map
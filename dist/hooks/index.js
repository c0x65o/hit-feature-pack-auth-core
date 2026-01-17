/**
 * Auth Core Hooks
 */
export { useAuthConfig, useLogin, useSignup, useForgotPassword, useResetPassword, useVerifyEmail, useOAuth, clearAuthToken, } from './useAuth';
/**
 * Auth Admin Hooks (merged into auth-core)
 *
 * React hooks for data fetching and mutations.
 */
export { useStats, useUsers, useUser, useSessions, useUserSessions, useAuditLog, useInvites, useUsersWithOverrides, useRolePagePermissions, useUserPageOverrides, useGroupPagePermissions, useGroups, useGroup, useGroupUsers, useUserGroups, useUserMutations, useSessionMutations, useInviteMutations, useAuthAdminConfig, usePagePermissionsMutations, useGroupPagePermissionsMutations, useGroupMutations, AuthAdminError, } from './useAuthAdmin';
/**
 * ACL Hooks
 */
export { usePrincipals, createFetchPrincipals, } from './usePrincipals';
/**
 * ACL Resolution Utilities
 */
export { resolveEffectivePermissions, hasPermission, getEffectiveLevel, principalMatches, } from '../utils/acl-resolution';
/**
 * Org Dimensions Hooks
 *
 * Note: Types (LocationType, Location, Division, Department, UserOrgAssignment)
 * are exported from schema/index.ts to avoid duplication.
 */
export { 
// Location Types
useLocationTypes, useLocationTypeMutations, 
// Locations
useLocations, useLocation, useLocationMutations, 
// Divisions
useDivisions, useDivision, useDivisionMutations, 
// Departments
useDepartments, useDepartment, useDepartmentMutations, 
// User Org Assignments
useUserOrgAssignments, useUserOrgAssignmentMutations, 
// Org Scope
useMyOrgScope, useUserOrgScope, } from './useOrgDimensions';
//# sourceMappingURL=index.js.map
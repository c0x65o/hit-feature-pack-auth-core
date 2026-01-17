/**
 * @hit/feature-pack-auth-core
 * 
 * Core authentication UI - login, signup, forgot password, email verification.
 * 
 * Components are exported individually for optimal tree-shaking.
 * When used with the route loader system, only the requested component is bundled.
 * 
 * @example
 * ```tsx
 * import { Login, Signup, ForgotPassword, ResetPassword, VerifyEmail } from '@hit/feature-pack-auth-core';
 * 
 * // Use in your app's routes
 * <Route path="/login" element={<Login />} />
 * <Route path="/signup" element={<Signup />} />
 * ```
 */

// Pages - exported individually for tree-shaking
export { Login, default as LoginPage } from './pages/Login';
export { Signup, default as SignupPage } from './pages/Signup';
export { ForgotPassword, default as ForgotPasswordPage } from './pages/ForgotPassword';
export { ResetPassword, default as ResetPasswordPage } from './pages/ResetPassword';
export { VerifyEmail, default as VerifyEmailPage } from './pages/VerifyEmail';
export { EmailNotVerified, default as EmailNotVerifiedPage } from './pages/EmailNotVerified';
export { MagicLink, default as MagicLinkPage } from './pages/MagicLink';
export { InviteAccept, default as InviteAcceptPage } from './pages/InviteAccept';

// Admin pages (merged into auth-core)
export { Dashboard, default as DashboardPage } from './pages/Dashboard';
export { Users, default as UsersPage } from './pages/Users';
export { UserDetail, default as UserDetailPage } from './pages/UserDetail';
export { Sessions, default as SessionsPage } from './pages/Sessions';
export { AuditLog, default as AuditLogPage } from './pages/AuditLog';
export { Invites, default as InvitesPage } from './pages/Invites';
export { Groups, default as GroupsPage } from './pages/Groups';
export { EntityList, default as EntityListPage } from './pages/EntityList';
export { EntityDetail, default as EntityDetailPage } from './pages/EntityDetail';
export { EntityEdit, default as EntityEditPage } from './pages/EntityEdit';

// Security Groups
export { SecurityGroupsList, default as SecurityGroupsListPage } from './pages/SecurityGroupsList';
export { SecurityGroupDetail, default as SecurityGroupDetailPage } from './pages/SecurityGroupDetail';

// Components - exported individually for tree-shaking
export { AuthLayout, AuthCard } from './components/AuthCard';
export { FormInput } from './components/FormInput';
export { OAuthButtons } from './components/OAuthButtons';
export { ProfilePictureCropModal } from './components/ProfilePictureCropModal';

// Hooks - exported individually for tree-shaking
export {
  useAuthConfig,
  useLogin,
  useSignup,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
  useOAuth,
  clearAuthToken,
  type AuthConfig,
  type LoginPayload,
  type SignupPayload,
  type AuthResponse,
} from './hooks/useAuth';

export {
  useStats,
  useUsers,
  useUser,
  useSessions,
  useUserSessions,
  useAuditLog,
  useInvites,
  useUsersWithOverrides,
  useRolePagePermissions,
  useUserPageOverrides,
  useGroupPagePermissions,
  useGroups,
  useGroup,
  useGroupUsers,
  useUserGroups,
  useUserMutations,
  useSessionMutations,
  useInviteMutations,
  useAuthAdminConfig,
  usePagePermissionsMutations,
  useGroupPagePermissionsMutations,
  useGroupMutations,
  AuthAdminError,
  type User,
  type Session,
  type AuditLogEntry,
  type Invite,
  type Stats,
  type PaginatedResponse,
  type AuthAdminConfig,
  type RolePagePermission,
  type UserPageOverride,
  type UserWithOverrides,
  type Group,
  type UserGroup,
  type GroupPagePermission,
} from './hooks/useAuthAdmin';

export {
  usePrincipals,
  createFetchPrincipals,
  type UsePrincipalsOptions,
  type UsePrincipalsResult,
} from './hooks/usePrincipals';

export {
  resolveEffectivePermissions,
  hasPermission,
  getEffectiveLevel,
  principalMatches,
  type AclResolutionContext,
} from './utils/acl-resolution';

export {
  useLocationTypes,
  useLocationTypeMutations,
  useLocations,
  useLocation,
  useLocationMutations,
  useDivisions,
  useDivision,
  useDivisionMutations,
  useDepartments,
  useDepartment,
  useDepartmentMutations,
  useUserOrgAssignments,
  useUserOrgAssignmentMutations,
  useMyOrgScope,
  useUserOrgScope,
} from './hooks/useOrgDimensions';

// Navigation config
export { nav } from './nav';

// Schema (for projects that need to import the tables directly)
export {
  locationTypes,
  locations,
  divisions,
  departments,
  userOrgAssignments,
  orgEntityScopes,
  type LocationType,
  type InsertLocationType,
  type UpdateLocationType,
  type Location,
  type InsertLocation,
  type UpdateLocation,
  type Division,
  type InsertDivision,
  type UpdateDivision,
  type Department,
  type InsertDepartment,
  type UpdateDepartment,
  type UserOrgAssignment,
  type InsertUserOrgAssignment,
  type UpdateUserOrgAssignment,
  type OrgEntityScope,
  type InsertOrgEntityScope,
  type UpdateOrgEntityScope,
  type OrgDimensionKind,
  type OrgScope,
  type OwnershipScope,
  DEFAULT_LOCATION_TYPES,
} from './schema/org-dimensions';

// Note: Server utilities (org-utils, ldd-scoping) are NOT exported here to
// avoid bundling Node.js-only dependencies (like pg/dns) into client code.
// Import them directly:
//   import { ... } from '@hit/feature-pack-auth-core/server/lib/org-utils';
//   import { ... } from '@hit/feature-pack-auth-core/server/lib/ldd-scoping';
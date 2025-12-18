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
export { Login, LoginPage, Signup, SignupPage, ForgotPassword, ForgotPasswordPage, ResetPassword, ResetPasswordPage, VerifyEmail, VerifyEmailPage, EmailNotVerified, EmailNotVerifiedPage, MagicLink, MagicLinkPage, InviteAccept, InviteAcceptPage, Dashboard, DashboardPage, Users, UsersPage, UserDetail, UserDetailPage, Sessions, SessionsPage, AuditLog, AuditLogPage, Invites, InvitesPage, Permissions, PermissionsPage, Groups, GroupsPage, } from './pages/index';
export * from './components/index';
export * from './hooks/index';
export { nav } from './nav';
//# sourceMappingURL=index.d.ts.map
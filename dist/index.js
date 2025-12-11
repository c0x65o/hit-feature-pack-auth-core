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
export { Login, LoginPage, Signup, SignupPage, ForgotPassword, ForgotPasswordPage, ResetPassword, ResetPasswordPage, VerifyEmail, VerifyEmailPage, EmailNotVerified, EmailNotVerifiedPage, MagicLink, MagicLinkPage, } from './pages/index';
// Components - exported individually for tree-shaking
export * from './components/index';
// Hooks - exported individually for tree-shaking
export * from './hooks/index';
// Navigation config
export { nav } from './nav';
//# sourceMappingURL=index.js.map
/**
 * @hit/feature-pack-auth-core
 * 
 * Core authentication UI - login, signup, forgot password, email verification.
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

// Pages
export * from './pages/index';

// Components
export * from './components/index';

// Hooks
export * from './hooks/index';

// Navigation config
export { nav } from './nav';

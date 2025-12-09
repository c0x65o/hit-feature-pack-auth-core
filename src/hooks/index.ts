/**
 * Auth Core Hooks
 */

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
} from './useAuth';

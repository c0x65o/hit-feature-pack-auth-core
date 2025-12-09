/**
 * Auth hooks for authentication operations
 */
interface AuthConfig {
    allow_signup: boolean;
    oauth_providers: string[];
    password_login: boolean;
    password_reset?: boolean;
    magic_link_login: boolean;
    email_verification?: boolean;
    two_factor_auth?: boolean;
}
interface LoginPayload {
    email: string;
    password: string;
    remember_me?: boolean;
}
interface SignupPayload {
    email: string;
    password: string;
    name?: string;
}
interface AuthResponse {
    token?: string;
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
    message?: string;
}
/**
 * Hook to get auth config.
 *
 * IMPORTANT: This hook uses PERMISSIVE defaults to prevent UI flicker.
 * The backend enforces actual restrictions - if a feature is disabled,
 * the API will return 403. This is the correct pattern because:
 *
 * 1. No loading states needed - UI renders immediately
 * 2. No flip-flopping between "disabled" and "enabled"
 * 3. Backend is the source of truth for security
 * 4. Config only affects UI hints (hiding links/buttons)
 */
export declare function useAuthConfig(): {
    config: AuthConfig;
    loading: boolean;
    error: null;
};
/**
 * Helper to clear auth tokens
 */
declare function clearAuthToken(): void;
export declare function useLogin(): {
    login: (payload: LoginPayload) => Promise<AuthResponse>;
    loading: boolean;
    error: string | null;
    clearError: () => void;
};
export declare function useSignup(): {
    signup: (payload: SignupPayload) => Promise<AuthResponse>;
    loading: boolean;
    error: string | null;
    clearError: () => void;
};
export declare function useForgotPassword(): {
    sendResetEmail: (email: string) => Promise<void>;
    loading: boolean;
    error: string | null;
    success: boolean;
    clearError: () => void;
};
export declare function useResetPassword(): {
    resetPassword: (token: string, password: string) => Promise<void>;
    loading: boolean;
    error: string | null;
    success: boolean;
    clearError: () => void;
};
export declare function useVerifyEmail(): {
    verifyEmail: (token: string) => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
    loading: boolean;
    error: string | null;
    success: boolean;
    clearError: () => void;
};
export declare function useOAuth(): {
    initiateOAuth: (provider: string) => void;
};
export { clearAuthToken };
export type { AuthConfig, LoginPayload, SignupPayload, AuthResponse };
//# sourceMappingURL=useAuth.d.ts.map
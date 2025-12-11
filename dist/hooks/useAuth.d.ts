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
 * Config is STATIC - generated at build time from hit.yaml and injected
 * into window.__HIT_CONFIG by HitAppProvider. No API calls needed.
 *
 * This hook reads config synchronously from the window global,
 * avoiding any loading states or UI flicker.
 *
 * Uses useEffect to update config when it becomes available (handles SSR/hydration timing).
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
    verifyEmail: (tokenOrCode: string, email?: string) => Promise<void>;
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
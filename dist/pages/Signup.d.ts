interface SignupProps {
    onSuccess?: () => void;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
    tagline?: string;
    signupRedirect?: string;
    passwordMinLength?: number;
}
/**
 * Signup page.
 *
 * Always renders the form - backend enforces whether signup is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export declare function Signup({ onSuccess, onNavigate, logoUrl, appName, tagline, signupRedirect, passwordMinLength, }: SignupProps): import("react/jsx-runtime").JSX.Element;
export default Signup;
//# sourceMappingURL=Signup.d.ts.map
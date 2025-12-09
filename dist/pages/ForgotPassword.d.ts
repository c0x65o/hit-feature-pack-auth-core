interface ForgotPasswordProps {
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
}
/**
 * Forgot Password page.
 *
 * Always renders the form - backend enforces whether password reset is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export declare function ForgotPassword({ onNavigate, logoUrl, appName, }: ForgotPasswordProps): import("react/jsx-runtime").JSX.Element;
export default ForgotPassword;
//# sourceMappingURL=ForgotPassword.d.ts.map
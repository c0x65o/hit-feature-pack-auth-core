interface ResetPasswordProps {
    token?: string;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
    passwordMinLength?: number;
}
/**
 * Reset Password page.
 *
 * Always renders the form - backend enforces whether password reset is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export declare function ResetPassword({ token: propToken, onNavigate, logoUrl, appName, passwordMinLength, }: ResetPasswordProps): import("react/jsx-runtime").JSX.Element;
export default ResetPassword;
//# sourceMappingURL=ResetPassword.d.ts.map
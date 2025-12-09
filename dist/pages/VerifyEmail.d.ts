interface VerifyEmailProps {
    token?: string;
    email?: string;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
}
/**
 * Verify Email page.
 *
 * Always renders - backend enforces whether email verification is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export declare function VerifyEmail({ token: propToken, email: propEmail, onNavigate, logoUrl, appName, }: VerifyEmailProps): import("react/jsx-runtime").JSX.Element;
export default VerifyEmail;
//# sourceMappingURL=VerifyEmail.d.ts.map
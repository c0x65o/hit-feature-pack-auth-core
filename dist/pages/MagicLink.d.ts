interface MagicLinkProps {
    token?: string;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
}
/**
 * Magic Link page.
 *
 * Always renders - backend enforces whether magic link login is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export declare function MagicLink({ token: propToken, onNavigate, logoUrl, appName, }: MagicLinkProps): import("react/jsx-runtime").JSX.Element;
export default MagicLink;
//# sourceMappingURL=MagicLink.d.ts.map
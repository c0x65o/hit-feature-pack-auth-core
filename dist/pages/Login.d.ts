interface LoginProps {
    onSuccess?: () => void;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
    tagline?: string;
    showRememberMe?: boolean;
    loginRedirect?: string;
}
export declare function Login({ onSuccess, onNavigate, logoUrl, appName, tagline, showRememberMe, loginRedirect, }: LoginProps): import("react/jsx-runtime").JSX.Element;
export default Login;
//# sourceMappingURL=Login.d.ts.map
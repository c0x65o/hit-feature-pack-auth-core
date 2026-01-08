interface SignupProps {
    onSuccess?: () => void;
    onNavigate?: (path: string) => void;
    logoUrl?: string;
    appName?: string;
    tagline?: string;
    signupRedirect?: string;
    passwordMinLength?: number;
}
export declare function Signup(props: SignupProps): import("react/jsx-runtime").JSX.Element;
export default Signup;
//# sourceMappingURL=Signup.d.ts.map
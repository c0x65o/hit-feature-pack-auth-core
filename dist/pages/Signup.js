'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { ThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles } from '@hit/ui-kit';
import { OAuthButtons } from '../components/OAuthButtons';
import { useSignup, useAuthConfig } from '../hooks/useAuth';
function SignupContent({ onSuccess, onNavigate, logoUrl = '/icon.png', appName = 'HIT', tagline = 'Create your account to get started', signupRedirect = '/', passwordMinLength = 8, }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const { signup, loading, error, clearError } = useSignup();
    const { config: authConfig } = useAuthConfig();
    const { colors, textStyles: ts, spacing, radius } = useThemeTokens();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    const validateForm = () => {
        const errors = {};
        if (!email) {
            errors.email = 'Email is required';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Please enter a valid email';
        }
        if (!password) {
            errors.password = 'Password is required';
        }
        else if (password.length < passwordMinLength) {
            errors.password = `Password must be at least ${passwordMinLength} characters`;
        }
        if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        if (!validateForm())
            return;
        try {
            await signup({ email, password, name: name || undefined });
            setSuccess(true);
            if (onSuccess) {
                onSuccess();
            }
        }
        catch {
            // Error is handled by the hook
        }
    };
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Check Your Email" }), _jsxs("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: ["We've sent a verification email to ", _jsx("strong", { style: { color: colors.text.primary }, children: email }), ". Please click the link to verify your account."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.primary.default,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Back to Login" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsx("h1", { style: styles({
                        fontSize: ts.heading2.fontSize,
                        fontWeight: ts.heading2.fontWeight,
                        textAlign: 'center',
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing.xs,
                    }), children: "Create Account" }), _jsx("p", { style: styles({
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing.lg,
                    }), children: tagline }), error && (_jsx("div", { style: styles({
                        marginBottom: spacing.md,
                        padding: `${spacing.sm} ${spacing.md}`,
                        backgroundColor: `${colors.error.default}15`,
                        border: `1px solid ${colors.error.default}30`,
                        borderRadius: radius.md,
                    }), children: _jsx("p", { style: styles({
                            fontSize: ts.bodySmall.fontSize,
                            fontWeight: ts.label.fontWeight,
                            color: colors.error.default,
                            margin: 0,
                        }), children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Name (optional)", type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "John Doe", autoComplete: "name" }), _jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsx(FormInput, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "new-password" }), _jsx(FormInput, { label: "Confirm Password", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.confirmPassword, autoComplete: "new-password" }), _jsxs("button", { type: "submit", disabled: loading, style: styles({
                                width: '100%',
                                height: '2.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: spacing.sm,
                                backgroundColor: colors.primary.default,
                                color: colors.text.inverse,
                                fontSize: ts.body.fontSize,
                                fontWeight: ts.label.fontWeight,
                                borderRadius: radius.md,
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                marginTop: spacing.xs,
                            }), children: [loading && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), loading ? 'Creating account...' : 'Create Account'] })] }), authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (_jsx(OAuthButtons, { providers: authConfig.oauth_providers })), _jsxs("p", { style: styles({
                        marginTop: spacing.lg,
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                    }), children: ["Already have an account?", ' ', _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                                fontWeight: ts.label.fontWeight,
                                color: colors.primary.default,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Sign in" })] })] }) }));
}
// Get default theme from config (set by HitAppProvider)
function getDefaultTheme() {
    if (typeof window === 'undefined')
        return 'light';
    const win = window;
    const theme = win.__HIT_CONFIG?.branding?.defaultTheme;
    if (theme === 'dark')
        return 'dark';
    if (theme === 'light')
        return 'light';
    // 'system' - check OS preference
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}
export function Signup(props) {
    return (_jsx(ThemeProvider, { defaultTheme: getDefaultTheme(), children: _jsx(SignupContent, { ...props }) }));
}
export default Signup;
//# sourceMappingURL=Signup.js.map
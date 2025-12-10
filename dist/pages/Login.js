'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles } from '@hit/ui-kit';
import { OAuthButtons } from '../components/OAuthButtons';
import { useLogin, useAuthConfig } from '../hooks/useAuth';
function LoginContent({ onSuccess, onNavigate, logoUrl = '/icon.png', appName = 'HIT', tagline = 'Sign in to continue your journey', showRememberMe = true, loginRedirect = '/', }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const { login, loading, error, clearError } = useLogin();
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
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        if (!validateForm())
            return;
        try {
            await login({ email, password, remember_me: rememberMe });
            if (onSuccess) {
                onSuccess();
            }
            else {
                navigate(loginRedirect);
            }
        }
        catch (err) {
            // Check if error is email verification required
            const errorMessage = err instanceof Error ? err.message : error || '';
            if (errorMessage.toLowerCase().includes('email verification required') ||
                errorMessage.toLowerCase().includes('verification required')) {
                // Redirect to email not verified page with email parameter
                navigate(`/email-not-verified?email=${encodeURIComponent(email)}`);
                return;
            }
            // Other errors are handled by the hook and displayed
        }
    };
    // Also check error state after it's set (in case error is set asynchronously)
    useEffect(() => {
        if (error && email) {
            const errorMessage = error.toLowerCase();
            if (errorMessage.includes('email verification required') ||
                errorMessage.includes('verification required')) {
                navigate(`/email-not-verified?email=${encodeURIComponent(email)}`);
            }
        }
    }, [error, email, navigate]);
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsx("h1", { style: styles({
                        fontSize: ts.heading2.fontSize,
                        fontWeight: ts.heading2.fontWeight,
                        textAlign: 'center',
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing.xs,
                    }), children: "Welcome Back" }), _jsx("p", { style: styles({
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
                        }), children: error }) })), authConfig?.password_login ? (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsx(FormInput, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "current-password" }), _jsxs("div", { style: styles({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: spacing.md,
                            }), children: [showRememberMe && (_jsxs("label", { style: styles({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: spacing.xs,
                                        cursor: 'pointer',
                                    }), children: [_jsx("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), style: { width: '0.75rem', height: '0.75rem' } }), _jsx("span", { style: styles({
                                                fontSize: ts.bodySmall.fontSize,
                                                color: colors.text.primary,
                                            }), children: "Remember me" })] })), authConfig?.password_reset !== false && (_jsx("button", { type: "button", onClick: () => navigate('/forgot-password'), style: styles({
                                        fontSize: ts.bodySmall.fontSize,
                                        fontWeight: ts.label.fontWeight,
                                        color: colors.primary.default,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }), children: "Forgot password?" }))] }), _jsxs("button", { type: "submit", disabled: loading, style: styles({
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
                            }), children: [loading && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), loading ? 'Signing in...' : 'Sign In'] })] })) : (_jsx("div", { style: styles({
                        marginBottom: spacing.lg,
                        padding: spacing.md,
                        backgroundColor: colors.bg.muted,
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: radius.md,
                    }), children: _jsx("p", { style: styles({
                            fontSize: ts.bodySmall.fontSize,
                            color: colors.text.secondary,
                            textAlign: 'center',
                            margin: 0,
                        }), children: "Password login is disabled. Please use one of the authentication methods below." }) })), authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (_jsx(OAuthButtons, { providers: authConfig.oauth_providers })), authConfig?.allow_signup && (_jsxs("p", { style: styles({
                        marginTop: spacing.lg,
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                    }), children: ["Don't have an account?", ' ', _jsx("button", { type: "button", onClick: () => navigate('/signup'), style: styles({
                                fontWeight: ts.label.fontWeight,
                                color: colors.primary.default,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Sign up" })] }))] }) }));
}
export function Login(props) {
    return (_jsx(ThemeProvider, { defaultTheme: "dark", children: _jsx(LoginContent, { ...props }) }));
}
export default Login;
//# sourceMappingURL=Login.js.map
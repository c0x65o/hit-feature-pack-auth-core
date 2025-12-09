'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { OAuthButtons } from '../components/OAuthButtons';
import { useLogin, useAuthConfig } from '../hooks/useAuth';
export function Login({ onSuccess, onNavigate, logoUrl = '/icon.png', appName = 'HIT', tagline = 'Sign in to continue your journey', showRememberMe = true, loginRedirect = '/', }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const { login, loading, error, clearError } = useLogin();
    const { config: authConfig } = useAuthConfig();
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
        catch {
            // Error is handled by the hook
        }
    };
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-8 w-auto" }) }), _jsx("h1", { className: "text-xl font-bold text-center text-[var(--hit-foreground)] mb-1", children: "Welcome Back" }), _jsx("p", { className: "text-center text-sm text-[var(--hit-muted-foreground)] mb-6", children: tagline }), error && (_jsx("div", { style: {
                        marginBottom: '1rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.375rem',
                    }, children: _jsx("p", { style: {
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: '#f87171',
                            margin: 0,
                        }, children: error }) })), authConfig?.password_login ? (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsx(FormInput, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "current-password" }), _jsxs("div", { className: "flex items-center justify-between mb-4", children: [showRememberMe && (_jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), className: "w-3.5 h-3.5 rounded border-[var(--hit-border)] bg-[var(--hit-input-bg)] text-[var(--hit-primary)] focus:ring-[var(--hit-primary)] focus:ring-offset-[var(--hit-background)]" }), _jsx("span", { className: "text-xs text-[var(--hit-foreground)]", children: "Remember me" })] })), authConfig?.password_reset !== false && (_jsx("button", { type: "button", onClick: () => navigate('/forgot-password'), className: "text-xs font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]", children: "Forgot password?" }))] }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full h-10 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors", children: [loading && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), loading ? 'Signing in...' : 'Sign In'] })] })) : (_jsx("div", { className: "mb-6 p-4 bg-[var(--hit-muted)] border border-[var(--hit-border)] rounded-lg", children: _jsx("p", { className: "text-sm text-[var(--hit-muted-foreground)] text-center", children: "Password login is disabled. Please use one of the authentication methods below." }) })), authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (_jsx(OAuthButtons, { providers: authConfig.oauth_providers })), authConfig?.allow_signup && (_jsxs("p", { className: "mt-5 text-center text-xs text-[var(--hit-muted-foreground)]", children: ["Don't have an account?", ' ', _jsx("button", { type: "button", onClick: () => navigate('/signup'), className: "font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]", children: "Sign up" })] }))] }) }));
}
export default Login;
//# sourceMappingURL=Login.js.map
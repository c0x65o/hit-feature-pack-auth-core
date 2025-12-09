'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { OAuthButtons } from '../components/OAuthButtons';
import { useSignup, useAuthConfig } from '../hooks/useAuth';
export function Signup({ onSuccess, onNavigate, logoUrl = '/icon.png', appName = 'HIT', tagline = 'Create your account to get started', signupRedirect = '/', passwordMinLength = 8, }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const { signup, loading, error, clearError } = useSignup();
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
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Check Your Email" }), _jsxs("p", { className: "text-xs text-[var(--hit-muted-foreground)] mb-4", children: ["We've sent a verification email to ", _jsx("strong", { className: "text-[var(--hit-foreground)]", children: email }), ". Please click the link to verify your account."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Back to Login" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { className: "flex justify-center mb-3", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-8 w-auto" }) }), _jsx("h1", { className: "text-lg font-bold text-center text-[var(--hit-foreground)] mb-0.5", children: "Create Account" }), _jsx("p", { className: "text-center text-xs text-[var(--hit-muted-foreground)] mb-4", children: tagline }), error && (_jsx("div", { className: "mb-3 px-3 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md", children: _jsx("p", { className: "text-xs font-medium text-red-400 m-0", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Name (optional)", type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "John Doe", autoComplete: "name" }), _jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsx(FormInput, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "new-password" }), _jsx(FormInput, { label: "Confirm Password", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.confirmPassword, autoComplete: "new-password" }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full h-9 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mt-1", children: [loading && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), loading ? 'Creating account...' : 'Create Account'] })] }), authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (_jsx(OAuthButtons, { providers: authConfig.oauth_providers })), _jsxs("p", { className: "mt-4 text-center text-xs text-[var(--hit-muted-foreground)]", children: ["Already have an account?", ' ', _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]", children: "Sign in" })] })] }) }));
}
export default Signup;
//# sourceMappingURL=Signup.js.map
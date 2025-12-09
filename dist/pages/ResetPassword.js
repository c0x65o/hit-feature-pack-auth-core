'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { useResetPassword } from '../hooks/useAuth';
export function ResetPassword({ token: propToken, onNavigate, logoUrl = '/icon.png', appName = 'HIT', passwordMinLength = 8, }) {
    const [token, setToken] = useState(propToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const { resetPassword, loading, error, success, clearError } = useResetPassword();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    // Extract token from URL if not provided as prop
    useEffect(() => {
        if (!propToken && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlToken = params.get('token');
            if (urlToken)
                setToken(urlToken);
        }
    }, [propToken]);
    const validateForm = () => {
        const errors = {};
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
            await resetPassword(token, password);
        }
        catch {
            // Error is handled by the hook
        }
    };
    if (!token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(XCircle, { className: "w-12 h-12 text-[var(--hit-error)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Invalid Link" }), _jsx("p", { className: "text-xs text-[var(--hit-muted-foreground)] mb-4", children: "This password reset link is invalid or has expired." }), _jsx("button", { type: "button", onClick: () => navigate('/forgot-password'), className: "text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Request New Link" })] }) }) }));
    }
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Password Reset!" }), _jsx("p", { className: "text-xs text-[var(--hit-muted-foreground)] mb-4", children: "Your password has been successfully reset. You can now sign in with your new password." }), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "w-full h-9 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] text-white text-sm font-semibold rounded-md transition-colors", children: "Sign In" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { className: "flex justify-center mb-3", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-8 w-auto" }) }), _jsx("h1", { className: "text-lg font-bold text-center text-[var(--hit-foreground)] mb-0.5", children: "Reset Password" }), _jsx("p", { className: "text-center text-xs text-[var(--hit-muted-foreground)] mb-4", children: "Enter your new password below." }), error && (_jsx("div", { className: "mb-3 px-3 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md", children: _jsx("p", { className: "text-xs font-medium text-red-400 m-0", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "New Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "new-password" }), _jsx(FormInput, { label: "Confirm Password", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.confirmPassword, autoComplete: "new-password" }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full h-9 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mt-1", children: [loading && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), loading ? 'Resetting...' : 'Reset Password'] })] })] }) }));
}
export default ResetPassword;
//# sourceMappingURL=ResetPassword.js.map
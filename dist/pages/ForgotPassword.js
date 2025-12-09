'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { useForgotPassword } from '../hooks/useAuth';
/**
 * Forgot Password page.
 *
 * Always renders the form - backend enforces whether password reset is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export function ForgotPassword({ onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [email, setEmail] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const { sendResetEmail, loading, error, success, clearError } = useForgotPassword();
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
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        if (!validateForm())
            return;
        try {
            await sendResetEmail(email);
        }
        catch {
            // Error is handled by the hook (including "password reset disabled" from backend)
        }
    };
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-16 h-16 text-[var(--hit-success)] mx-auto mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-[var(--hit-foreground)] mb-2", children: "Check Your Email" }), _jsxs("p", { className: "text-[var(--hit-muted-foreground)] mb-6", children: ["If an account exists with ", _jsx("strong", { className: "text-[var(--hit-foreground)]", children: email }), ", you will receive a password reset link shortly."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Back to Login" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsxs("button", { type: "button", onClick: () => navigate('/login'), className: "flex items-center gap-2 text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] mb-6", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), "Back to Login"] }), _jsx("div", { className: "flex justify-center mb-6", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-16 w-auto" }) }), _jsx("h1", { className: "text-2xl font-bold text-center text-[var(--hit-foreground)] mb-2", children: "Forgot Password?" }), _jsx("p", { className: "text-center text-[var(--hit-muted-foreground)] mb-8", children: "No worries, we'll send you reset instructions." }), error && (_jsx("div", { className: "mb-4 p-3 bg-[var(--hit-error-light)] border border-[var(--hit-error)] rounded-lg", children: _jsx("p", { className: "text-sm text-[var(--hit-error)]", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full h-12 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors mt-2", children: [loading && _jsx(Loader2, { className: "w-5 h-5 animate-spin" }), loading ? 'Sending...' : 'Send Reset Link'] })] })] }) }));
}
export default ForgotPassword;
//# sourceMappingURL=ForgotPassword.js.map
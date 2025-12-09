'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { useVerifyEmail } from '../hooks/useAuth';
/**
 * Verify Email page.
 *
 * Always renders - backend enforces whether email verification is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export function VerifyEmail({ token: propToken, email: propEmail, onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [token, setToken] = useState(propToken || '');
    const [email, setEmail] = useState(propEmail || '');
    const [autoVerified, setAutoVerified] = useState(false);
    const { verifyEmail, resendVerification, loading, error, success, clearError } = useVerifyEmail();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    // Extract token and email from URL if not provided as props
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (!propToken) {
                const urlToken = params.get('token');
                if (urlToken)
                    setToken(urlToken);
            }
            if (!propEmail) {
                const urlEmail = params.get('email');
                if (urlEmail)
                    setEmail(urlEmail);
            }
        }
    }, [propToken, propEmail]);
    // Auto-verify if token is present
    useEffect(() => {
        if (token && !autoVerified && !success && !error) {
            setAutoVerified(true);
            verifyEmail(token).catch(() => {
                // Error handled by hook (including "email verification disabled" from backend)
            });
        }
    }, [token, autoVerified, success, error, verifyEmail]);
    const handleResend = async () => {
        if (!email)
            return;
        clearError();
        try {
            await resendVerification(email);
            alert('Verification email resent!');
        }
        catch {
            // Error handled by hook
        }
    };
    // Loading state during auto-verification
    if (token && loading && !success && !error) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(Loader2, { className: "w-16 h-16 text-[var(--hit-primary)] mx-auto mb-4 animate-spin" }), _jsx("h1", { className: "text-2xl font-bold text-[var(--hit-foreground)] mb-2", children: "Verifying Email" }), _jsx("p", { className: "text-[var(--hit-muted-foreground)]", children: "Please wait while we verify your email..." })] }) }) }));
    }
    // Success state
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-16 h-16 text-[var(--hit-success)] mx-auto mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-[var(--hit-foreground)] mb-2", children: "Email Verified!" }), _jsx("p", { className: "text-[var(--hit-muted-foreground)] mb-6", children: "Your email has been successfully verified. You can now sign in to your account." }), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "w-full h-12 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] text-white font-semibold rounded-lg transition-colors", children: "Sign In" })] }) }) }));
    }
    // Error state (invalid/expired token)
    if (error && token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(XCircle, { className: "w-16 h-16 text-[var(--hit-error)] mx-auto mb-4" }), _jsx("h1", { className: "text-2xl font-bold text-[var(--hit-foreground)] mb-2", children: "Verification Failed" }), _jsx("p", { className: "text-[var(--hit-muted-foreground)] mb-6", children: error || 'This verification link is invalid or has expired.' }), email && (_jsx("button", { type: "button", onClick: handleResend, disabled: loading, className: "w-full h-12 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors mb-4", children: loading ? 'Sending...' : 'Resend Verification Email' })), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Back to Login" })] }) }) }));
    }
    // Waiting for verification (no token, just informational)
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { className: "flex justify-center mb-6", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-16 w-auto" }) }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 bg-[var(--hit-primary-light)] rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx(Mail, { className: "w-8 h-8 text-[var(--hit-primary)]" }) }), _jsx("h1", { className: "text-2xl font-bold text-[var(--hit-foreground)] mb-2", children: "Check Your Email" }), _jsx("p", { className: "text-[var(--hit-muted-foreground)] mb-6", children: email ? (_jsxs(_Fragment, { children: ["We've sent a verification link to", ' ', _jsx("strong", { className: "text-[var(--hit-foreground)]", children: email }), ". Click the link in the email to verify your account."] })) : ('Please check your email for a verification link.') }), email && (_jsx("button", { type: "button", onClick: handleResend, disabled: loading, className: "text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium disabled:opacity-50", children: loading ? 'Sending...' : "Didn't receive the email? Resend" })), _jsx("div", { className: "mt-8 pt-6 border-t border-[var(--hit-border)]", children: _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)]", children: "Back to Login" }) })] })] }) }));
}
export default VerifyEmail;
//# sourceMappingURL=VerifyEmail.js.map
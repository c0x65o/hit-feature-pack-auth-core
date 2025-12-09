'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
// Get the auth module URL
function getAuthUrl() {
    if (typeof window !== 'undefined') {
        const win = window;
        return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
    }
    return '/api/proxy/auth';
}
async function fetchAuth(endpoint, options) {
    const authUrl = getAuthUrl();
    const url = `${authUrl}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || data.detail || `Request failed: ${res.status}`);
    }
    return data;
}
export function MagicLink({ token: propToken, onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState(propToken || '');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
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
            if (urlToken) {
                setToken(urlToken);
                handleVerifyToken(urlToken);
            }
        }
    }, [propToken]);
    const handleVerifyToken = async (tokenToVerify) => {
        setVerifying(true);
        setError(null);
        try {
            const response = await fetchAuth('/magic-link/verify', {
                method: 'POST',
                body: JSON.stringify({ token: tokenToVerify }),
            });
            if (response.token && typeof window !== 'undefined') {
                localStorage.setItem('hit_token', response.token);
            }
            setVerified(true);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to verify magic link';
            setError(message);
        }
        finally {
            setVerifying(false);
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
        setError(null);
        setSuccess(false);
        if (!validateForm())
            return;
        setLoading(true);
        try {
            await fetchAuth('/magic-link/request', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setSuccess(true);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to send magic link';
            setError(message);
        }
        finally {
            setLoading(false);
        }
    };
    // Verifying token state
    if (verifying || (token && !verified && !error)) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(Loader2, { className: "w-12 h-12 text-[var(--hit-primary)] mx-auto mb-3 animate-spin" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Verifying Magic Link" }), _jsx("p", { className: "text-xs text-[var(--hit-muted-foreground)]", children: "Please wait..." })] }) }) }));
    }
    // Verified successfully state
    if (verified) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Login Successful!" }), _jsx("p", { className: "text-xs text-[var(--hit-muted-foreground)]", children: "Redirecting..." })] }) }) }));
    }
    // Success state (email sent)
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Check Your Email" }), _jsxs("p", { className: "text-xs text-[var(--hit-muted-foreground)] mb-4", children: ["We've sent a magic link to ", _jsx("strong", { className: "text-[var(--hit-foreground)]", children: email }), "."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), className: "text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Back to Login" })] }) }) }));
    }
    // Error state (invalid/expired token)
    if (error && token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { className: "text-center", children: [_jsx(Mail, { className: "w-12 h-12 text-[var(--hit-error)] mx-auto mb-3" }), _jsx("h1", { className: "text-lg font-bold text-[var(--hit-foreground)] mb-1", children: "Invalid Magic Link" }), _jsx("p", { className: "text-xs text-[var(--hit-muted-foreground)] mb-4", children: error || 'This magic link is invalid or has expired.' }), _jsx("button", { type: "button", onClick: () => {
                                setToken('');
                                setError(null);
                                navigate('/magic-link');
                            }, className: "text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium", children: "Request New Link" })] }) }) }));
    }
    // Request magic link form
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsxs("button", { type: "button", onClick: () => navigate('/login'), className: "flex items-center gap-1.5 text-xs text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] mb-4", children: [_jsx(ArrowLeft, { className: "w-3.5 h-3.5" }), "Back to Login"] }), _jsx("div", { className: "flex justify-center mb-3", children: _jsx("img", { src: logoUrl, alt: appName, className: "h-8 w-auto" }) }), _jsx("h1", { className: "text-lg font-bold text-center text-[var(--hit-foreground)] mb-0.5", children: "Sign in with Magic Link" }), _jsx("p", { className: "text-center text-xs text-[var(--hit-muted-foreground)] mb-4", children: "Enter your email and we'll send you a magic link." }), error && (_jsx("div", { className: "mb-3 px-3 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md", children: _jsx("p", { className: "text-xs font-medium text-red-400 m-0", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsxs("button", { type: "submit", disabled: loading, className: "w-full h-9 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mt-1", children: [loading && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), loading ? 'Sending...' : 'Send Magic Link'] })] })] }) }));
}
export default MagicLink;
//# sourceMappingURL=MagicLink.js.map
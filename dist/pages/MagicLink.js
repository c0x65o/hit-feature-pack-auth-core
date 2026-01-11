'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { ConditionalThemeProvider, useThemeTokens } from '@hit/ui-kit/theme';
import { AuthCard, AuthLayout, FormInput, styles } from '@hit/ui-kit';
import { useFormSubmit } from '@hit/ui-kit/hooks/useFormSubmit';
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
function MagicLinkContent({ token: propToken, onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState(propToken || '');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const { submitting, error, submit, clearError, setError } = useFormSubmit();
    const { colors, textStyles: ts, spacing, radius } = useThemeTokens();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
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
        try {
            const response = await fetchAuth('/magic-link/verify', {
                method: 'POST',
                body: JSON.stringify({ token: tokenToVerify }),
            });
            if (response.token && typeof window !== 'undefined') {
                localStorage.setItem('hit_token', response.token);
            }
            setVerified(true);
            setTimeout(() => navigate('/'), 2000);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to verify magic link');
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
        if (!validateForm())
            return;
        const result = await submit(async () => {
            await fetchAuth('/magic-link/request', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            return { success: true };
        });
        if (result) {
            setSuccess(true);
        }
    };
    // Verifying state
    if (verifying || (token && !verified && !error)) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(Loader2, { size: 48, style: { color: colors.primary.default, margin: '0 auto', marginBottom: spacing.md, animation: 'spin 1s linear infinite' } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Verifying Magic Link" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary }), children: "Please wait..." })] }) }) }));
    }
    // Verified state
    if (verified) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Login Successful!" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary }), children: "Redirecting..." })] }) }) }));
    }
    // Success state (email sent)
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Check Your Email" }), _jsxs("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg }), children: ["We've sent a magic link to ", _jsx("strong", { style: { color: colors.text.primary }, children: email }), "."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' }), children: "Back to Login" })] }) }) }));
    }
    // Error state (invalid token)
    if (error && token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(Mail, { size: 48, style: { color: colors.error.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Invalid Magic Link" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg }), children: error.message }), _jsx("button", { type: "button", onClick: () => { setToken(''); clearError(); navigate('/magic-link'); }, style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' }), children: "Request New Link" })] }) }) }));
    }
    // Request form
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsxs("button", { type: "button", onClick: () => navigate('/login'), style: styles({ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, background: 'none', border: 'none', cursor: 'pointer', marginBottom: spacing.lg }), children: [_jsx(ArrowLeft, { size: 14 }), "Back to Login"] }), _jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, textAlign: 'center', color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Sign in with Magic Link" }), _jsx("p", { style: styles({ textAlign: 'center', fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, margin: 0, marginBottom: spacing.lg }), children: "Enter your email and we'll send you a magic link." }), error && (_jsxs("div", { style: styles({ marginBottom: spacing.md, padding: `${spacing.sm} ${spacing.md}`, backgroundColor: `${colors.error.default}15`, border: `1px solid ${colors.error.default}30`, borderRadius: radius.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }), children: [_jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, fontWeight: ts.label.fontWeight, color: colors.error.default, margin: 0 }), children: error.message }), _jsx("button", { onClick: clearError, style: styles({
                                background: 'none',
                                border: 'none',
                                color: colors.error.default,
                                cursor: 'pointer',
                                fontSize: ts.bodySmall.fontSize,
                                padding: spacing.xs,
                            }), children: "\u00D7" })] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsxs("button", { type: "submit", disabled: submitting, style: styles({ width: '100%', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, marginTop: spacing.xs }), children: [submitting && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), submitting ? 'Sending...' : 'Send Magic Link'] })] })] }) }));
}
export function MagicLink(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(MagicLinkContent, { ...props }) }));
}
export default MagicLink;
//# sourceMappingURL=MagicLink.js.map
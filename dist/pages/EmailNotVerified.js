'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { ConditionalThemeProvider, useThemeTokens } from '@hit/ui-kit/theme';
import { styles } from '@hit/ui-kit/components/utils';
import { AuthCard } from '@hit/ui-kit/components/AuthCard';
import { AuthLayout } from '@hit/ui-kit/components/AuthLayout';
import { useVerifyEmail } from '../hooks/useAuth';
// Get the auth module URL
function getAuthUrl() {
    if (typeof window !== 'undefined') {
        const win = window;
        return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
    }
    return '/api/proxy/auth';
}
function EmailNotVerifiedContent({ email: propEmail, onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [email, setEmail] = useState(propEmail || '');
    const [verificationSentAt, setVerificationSentAt] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [resendSuccess, setResendSuccess] = useState(false);
    const { resendVerification, loading, error, clearError } = useVerifyEmail();
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
        // Get email from URL params if not provided
        if (typeof window !== 'undefined' && !propEmail) {
            const params = new URLSearchParams(window.location.search);
            const urlEmail = params.get('email');
            if (urlEmail)
                setEmail(urlEmail);
        }
    }, [propEmail]);
    useEffect(() => {
        // Fetch verification status
        if (email) {
            fetchVerificationStatus(email);
        }
    }, [email]);
    const fetchVerificationStatus = async (userEmail) => {
        setLoadingStatus(true);
        try {
            const authUrl = getAuthUrl();
            const res = await fetch(`${authUrl}/verification-status?email=${encodeURIComponent(userEmail)}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.ok) {
                const data = await res.json();
                setVerificationSentAt(data.verification_sent_at || null);
            }
        }
        catch (err) {
            // Silently fail - we'll just not show the timestamp
            console.error('Failed to fetch verification status:', err);
        }
        finally {
            setLoadingStatus(false);
        }
    };
    const handleResend = async () => {
        if (!email)
            return;
        clearError();
        setResendSuccess(false);
        try {
            await resendVerification(email);
            setResendSuccess(true);
            // Refresh verification status after resending
            await fetchVerificationStatus(email);
        }
        catch {
            // Error handled by hook
        }
    };
    const formatDate = (isoString) => {
        if (!isoString)
            return null;
        try {
            const date = new Date(isoString);
            return date.toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        catch {
            return null;
        }
    };
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsxs("div", { style: styles({ textAlign: 'center', marginBottom: spacing.md }), children: [_jsx("div", { style: styles({
                                width: '3rem',
                                height: '3rem',
                                backgroundColor: `${colors.error.default}15`,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                marginBottom: spacing.md,
                            }), children: _jsx(AlertCircle, { size: 24, style: { color: colors.error.default } }) }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Email Not Verified" }), _jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.md,
                            }), children: email ? (_jsxs(_Fragment, { children: ["Your email ", _jsx("strong", { style: { color: colors.text.primary }, children: email }), " has not been verified yet."] })) : ('Your email has not been verified yet.') }), loadingStatus ? (_jsxs("div", { style: styles({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: spacing.xs,
                                marginBottom: spacing.lg,
                            }), children: [_jsx(Loader2, { size: 16, style: { color: colors.text.secondary, animation: 'spin 1s linear infinite' } }), _jsx("span", { style: styles({
                                        fontSize: ts.bodySmall.fontSize,
                                        color: colors.text.secondary,
                                    }), children: "Loading..." })] })) : verificationSentAt ? (_jsx("div", { style: styles({
                                marginBottom: spacing.lg,
                                padding: `${spacing.sm} ${spacing.md}`,
                                backgroundColor: colors.bg.muted,
                                border: `1px solid ${colors.border.default}`,
                                borderRadius: radius.md,
                            }), children: _jsxs("p", { style: styles({
                                    fontSize: ts.bodySmall.fontSize,
                                    color: colors.text.secondary,
                                    margin: 0,
                                }), children: ["Verification email sent: ", _jsx("strong", { style: { color: colors.text.primary }, children: formatDate(verificationSentAt) })] }) })) : (_jsx("div", { style: styles({
                                marginBottom: spacing.lg,
                                padding: `${spacing.sm} ${spacing.md}`,
                                backgroundColor: colors.bg.muted,
                                border: `1px solid ${colors.border.default}`,
                                borderRadius: radius.md,
                            }), children: _jsx("p", { style: styles({
                                    fontSize: ts.bodySmall.fontSize,
                                    color: colors.text.secondary,
                                    margin: 0,
                                }), children: "No verification email found. Please request a new one." }) })), resendSuccess && (_jsx("div", { style: styles({
                                marginBottom: spacing.md,
                                padding: `${spacing.sm} ${spacing.md}`,
                                backgroundColor: `${colors.success.default}15`,
                                border: `1px solid ${colors.success.default}30`,
                                borderRadius: radius.md,
                            }), children: _jsx("p", { style: styles({
                                    fontSize: ts.bodySmall.fontSize,
                                    color: colors.success.default,
                                    margin: 0,
                                }), children: "Verification email sent successfully!" }) })), error && (_jsx("div", { style: styles({
                                marginBottom: spacing.md,
                                padding: `${spacing.sm} ${spacing.md}`,
                                backgroundColor: `${colors.error.default}15`,
                                border: `1px solid ${colors.error.default}30`,
                                borderRadius: radius.md,
                            }), children: _jsx("p", { style: styles({
                                    fontSize: ts.bodySmall.fontSize,
                                    color: colors.error.default,
                                    margin: 0,
                                }), children: error }) })), email && (_jsxs("button", { type: "button", onClick: handleResend, disabled: loading, style: styles({
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
                                marginBottom: spacing.md,
                            }), children: [loading && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), loading ? 'Sending...' : 'Resend Verification Email'] })), _jsx("div", { style: styles({
                                marginTop: spacing.lg,
                                paddingTop: spacing.lg,
                                borderTop: `1px solid ${colors.border.subtle}`,
                            }), children: _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                                    fontSize: ts.bodySmall.fontSize,
                                    color: colors.text.secondary,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }), children: "Back to Login" }) })] })] }) }));
}
export function EmailNotVerified(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(EmailNotVerifiedContent, { ...props }) }));
}
export default EmailNotVerified;
//# sourceMappingURL=EmailNotVerified.js.map
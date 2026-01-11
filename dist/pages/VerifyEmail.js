'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { ConditionalThemeProvider, useThemeTokens } from '@hit/ui-kit/theme';
import { AlertDialog, AuthCard, AuthLayout, styles } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useVerifyEmail } from '../hooks/useAuth';
function VerifyEmailContent({ token: propToken, email: propEmail, onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [token, setToken] = useState(propToken || '');
    const [email, setEmail] = useState(propEmail || '');
    const [autoVerified, setAutoVerified] = useState(false);
    const { verifyEmail, resendVerification, loading, error, success, clearError } = useVerifyEmail();
    const { colors, textStyles: ts, spacing, radius } = useThemeTokens();
    const alertDialog = useAlertDialog();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
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
    useEffect(() => {
        // Auto-verify if token is present (token-based verification)
        if (token && !email && !autoVerified && !success && !error) {
            setAutoVerified(true);
            verifyEmail(token).catch(() => { });
        }
    }, [token, email, autoVerified, success, error, verifyEmail]);
    const handleResend = async () => {
        if (!email)
            return;
        clearError();
        try {
            await resendVerification(email);
            await alertDialog.showAlert('Verification email resent!', {
                variant: 'success',
                title: 'Email Sent',
            });
        }
        catch {
            // Error handled by hook
        }
    };
    // Loading state
    if (token && loading && !success && !error) {
        return (_jsxs(_Fragment, { children: [_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(Loader2, { size: 48, style: { color: colors.primary.default, margin: '0 auto', marginBottom: spacing.md, animation: 'spin 1s linear infinite' } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Verifying Email" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary }), children: "Please wait..." })] }) }) }), _jsx(AlertDialog, { ...alertDialog.props })] }));
    }
    // Success state
    if (success) {
        return (_jsxs(_Fragment, { children: [_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Email Verified!" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg }), children: "You can now sign in to your account." }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({ width: '100%', height: '2.25rem', backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: 'pointer' }), children: "Sign In" })] }) }) }), _jsx(AlertDialog, { ...alertDialog.props })] }));
    }
    // Error state
    if (error && token) {
        return (_jsxs(_Fragment, { children: [_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(XCircle, { size: 48, style: { color: colors.error.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Verification Failed" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg }), children: error }), email && (_jsx("button", { type: "button", onClick: handleResend, disabled: loading, style: styles({ width: '100%', height: '2.25rem', backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, marginBottom: spacing.md }), children: loading ? 'Sending...' : 'Resend Verification Email' })), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' }), children: "Back to Login" })] }) }) }), _jsx(AlertDialog, { ...alertDialog.props })] }));
    }
    // Waiting state (no token)
    return (_jsxs(_Fragment, { children: [_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx("div", { style: styles({ width: '3rem', height: '3rem', backgroundColor: colors.primary.light, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.md }), children: _jsx(Mail, { size: 24, style: { color: colors.primary.default } }) }), _jsx("h1", { style: styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs }), children: "Check Your Email" }), _jsx("p", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg }), children: email ? (_jsxs(_Fragment, { children: ["We've sent a verification link to ", _jsx("strong", { style: { color: colors.text.primary }, children: email }), "."] })) : ('Please check your email for a verification link.') }), email && (_jsx("button", { type: "button", onClick: handleResend, disabled: loading, style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }), children: loading ? 'Sending...' : "Didn't receive it? Resend" })), _jsx("div", { style: styles({ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border.subtle}` }), children: _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, background: 'none', border: 'none', cursor: 'pointer' }), children: "Back to Login" }) })] })] }) }), _jsx(AlertDialog, { ...alertDialog.props })] }));
}
export function VerifyEmail(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(VerifyEmailContent, { ...props }) }));
}
export default VerifyEmail;
//# sourceMappingURL=VerifyEmail.js.map
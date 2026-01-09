'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ConditionalThemeProvider, styles, useThemeTokens } from '@hit/ui-kit';
import { AuthCard } from '@hit/ui-kit/components/AuthCard';
import { AuthLayout } from '@hit/ui-kit/components/AuthLayout';
import { FormInput } from '@hit/ui-kit/components/FormInput';
import { useFormSubmit } from '@hit/ui-kit/hooks/useFormSubmit';
import { useAcceptInvite, useAuthConfig } from '../hooks/useAuth';
function InviteAcceptContent({ token: propToken, onNavigate, logoUrl = '/icon.png', appName = 'HIT', welcomeMessage, passwordMinLength = 8, }) {
    const [token, setToken] = useState(propToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const { acceptInvite } = useAcceptInvite();
    const { submitting, error, submit, clearError } = useFormSubmit();
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
    useEffect(() => {
        if (!propToken && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlToken = params.get('token');
            if (urlToken)
                setToken(urlToken);
        }
    }, [propToken]);
    // Check if password is required
    const passwordRequired = authConfig.password_login === true;
    const hasOAuthProviders = authConfig.oauth_providers && authConfig.oauth_providers.length > 0;
    const validateForm = () => {
        const errors = {};
        if (passwordRequired) {
            if (!password) {
                errors.password = 'Password is required';
            }
            else if (password.length < passwordMinLength) {
                errors.password = `Password must be at least ${passwordMinLength} characters`;
            }
            if (password !== confirmPassword) {
                errors.confirmPassword = 'Passwords do not match';
            }
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm())
            return;
        const result = await submit(async () => {
            await acceptInvite(token, passwordRequired ? password : undefined);
            return { success: true };
        });
        if (result) {
            setSuccess(true);
            // Redirect after successful acceptance
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    };
    if (!token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(XCircle, { size: 48, style: { color: colors.error.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Invalid Invite Link" }), _jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: "This invitation link is invalid or has expired." })] }) }) }));
    }
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsxs("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: ["Welcome to ", appName, "!"] }), _jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: "Your account has been created successfully. Redirecting you now..." })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsxs("h1", { style: styles({
                        fontSize: ts.heading2.fontSize,
                        fontWeight: ts.heading2.fontWeight,
                        textAlign: 'center',
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing.xs,
                    }), children: ["Welcome to ", appName, "!"] }), _jsx("p", { style: styles({
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing.lg,
                    }), children: welcomeMessage || `You've been invited to join ${appName}. Please set up your account to continue.` }), error && (_jsxs("div", { style: styles({
                        marginBottom: spacing.md,
                        padding: `${spacing.sm} ${spacing.md}`,
                        backgroundColor: `${colors.error.default}15`,
                        border: `1px solid ${colors.error.default}30`,
                        borderRadius: radius.md,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }), children: [_jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                fontWeight: ts.label.fontWeight,
                                color: colors.error.default,
                                margin: 0,
                            }), children: error.message }), _jsx("button", { onClick: clearError, style: styles({
                                background: 'none',
                                border: 'none',
                                color: colors.error.default,
                                cursor: 'pointer',
                                fontSize: ts.bodySmall.fontSize,
                                padding: spacing.xs,
                            }), children: "\u00D7" })] })), passwordRequired && (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "new-password" }), _jsx(FormInput, { label: "Confirm Password", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.confirmPassword, autoComplete: "new-password" }), _jsxs("button", { type: "submit", disabled: submitting, style: styles({
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
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.5 : 1,
                                marginTop: spacing.xs,
                            }), children: [submitting && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), submitting ? 'Setting up account...' : 'Accept Invitation'] })] })), !passwordRequired && !hasOAuthProviders && (_jsxs("button", { type: "button", onClick: handleSubmit, disabled: submitting, style: styles({
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
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.5 : 1,
                    }), children: [submitting && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), submitting ? 'Accepting...' : 'Accept Invitation'] }))] }) }));
}
export function InviteAccept(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(InviteAcceptContent, { ...props }) }));
}
export default InviteAccept;
//# sourceMappingURL=InviteAccept.js.map
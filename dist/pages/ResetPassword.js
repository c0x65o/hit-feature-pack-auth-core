'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles, useFormSubmit } from '@hit/ui-kit';
import { useResetPassword } from '../hooks/useAuth';
function ResetPasswordContent({ token: propToken, onNavigate, logoUrl = '/icon.png', appName = 'HIT', passwordMinLength = 8, }) {
    const [token, setToken] = useState(propToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const { resetPassword } = useResetPassword();
    const { submitting, error, submit, clearError } = useFormSubmit();
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
        if (!validateForm())
            return;
        const result = await submit(async () => {
            await resetPassword(token, password);
            return { success: true };
        });
        if (result) {
            setSuccess(true);
        }
    };
    if (!token) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(XCircle, { size: 48, style: { color: colors.error.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Invalid Link" }), _jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: "This password reset link is invalid or has expired." }), _jsx("button", { type: "button", onClick: () => navigate('/forgot-password'), style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.primary.default,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Request New Link" })] }) }) }));
    }
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Password Reset!" }), _jsx("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: "Your password has been successfully reset. You can now sign in with your new password." }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                                width: '100%',
                                height: '2.25rem',
                                backgroundColor: colors.primary.default,
                                color: colors.text.inverse,
                                fontSize: ts.body.fontSize,
                                fontWeight: ts.label.fontWeight,
                                borderRadius: radius.md,
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Sign In" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsx("h1", { style: styles({
                        fontSize: ts.heading2.fontSize,
                        fontWeight: ts.heading2.fontWeight,
                        textAlign: 'center',
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing.xs,
                    }), children: "Reset Password" }), _jsx("p", { style: styles({
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing.lg,
                    }), children: "Enter your new password below." }), error && (_jsxs("div", { style: styles({
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
                            }), children: "\u00D7" })] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "New Password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.password, autoComplete: "new-password" }), _jsx(FormInput, { label: "Confirm Password", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", error: fieldErrors.confirmPassword, autoComplete: "new-password" }), _jsxs("button", { type: "submit", disabled: submitting, style: styles({
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
                            }), children: [submitting && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), submitting ? 'Resetting...' : 'Reset Password'] })] })] }) }));
}
export function ResetPassword(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(ResetPasswordContent, { ...props }) }));
}
export default ResetPassword;
//# sourceMappingURL=ResetPassword.js.map
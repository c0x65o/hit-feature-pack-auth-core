'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles } from '@hit/ui-kit';
import { useForgotPassword } from '../hooks/useAuth';
function ForgotPasswordContent({ onNavigate, logoUrl = '/icon.png', appName = 'HIT', }) {
    const [email, setEmail] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const { sendResetEmail, loading, error, success, clearError } = useForgotPassword();
    const { colors, textStyles: ts, spacing, radius } = useThemeTokens();
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
            // Error is handled by the hook
        }
    };
    if (success) {
        return (_jsx(AuthLayout, { children: _jsx(AuthCard, { children: _jsxs("div", { style: styles({ textAlign: 'center' }), children: [_jsx(CheckCircle, { size: 48, style: { color: colors.success.default, margin: '0 auto', marginBottom: spacing.md } }), _jsx("h1", { style: styles({
                                fontSize: ts.heading2.fontSize,
                                fontWeight: ts.heading2.fontWeight,
                                color: colors.text.primary,
                                margin: 0,
                                marginBottom: spacing.xs,
                            }), children: "Check Your Email" }), _jsxs("p", { style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.text.secondary,
                                marginBottom: spacing.lg,
                            }), children: ["If an account exists with ", _jsx("strong", { style: { color: colors.text.primary }, children: email }), ", you will receive a password reset link shortly."] }), _jsx("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                                fontSize: ts.bodySmall.fontSize,
                                color: colors.primary.default,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }), children: "Back to Login" })] }) }) }));
    }
    return (_jsx(AuthLayout, { children: _jsxs(AuthCard, { children: [_jsxs("button", { type: "button", onClick: () => navigate('/login'), style: styles({
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: spacing.lg,
                    }), children: [_jsx(ArrowLeft, { size: 14 }), "Back to Login"] }), _jsx("div", { style: styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }), children: _jsx("img", { src: logoUrl, alt: appName, style: { height: '2rem', width: 'auto' } }) }), _jsx("h1", { style: styles({
                        fontSize: ts.heading2.fontSize,
                        fontWeight: ts.heading2.fontWeight,
                        textAlign: 'center',
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing.xs,
                    }), children: "Forgot Password?" }), _jsx("p", { style: styles({
                        textAlign: 'center',
                        fontSize: ts.bodySmall.fontSize,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing.lg,
                    }), children: "No worries, we'll send you reset instructions." }), error && (_jsx("div", { style: styles({
                        marginBottom: spacing.md,
                        padding: `${spacing.sm} ${spacing.md}`,
                        backgroundColor: `${colors.error.default}15`,
                        border: `1px solid ${colors.error.default}30`,
                        borderRadius: radius.md,
                    }), children: _jsx("p", { style: styles({
                            fontSize: ts.bodySmall.fontSize,
                            fontWeight: ts.label.fontWeight,
                            color: colors.error.default,
                            margin: 0,
                        }), children: error }) })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(FormInput, { label: "Email address", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", error: fieldErrors.email, autoComplete: "email" }), _jsxs("button", { type: "submit", disabled: loading, style: styles({
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
                                marginTop: spacing.xs,
                            }), children: [loading && _jsx(Loader2, { size: 16, style: { animation: 'spin 1s linear infinite' } }), loading ? 'Sending...' : 'Send Reset Link'] })] })] }) }));
}
export function ForgotPassword(props) {
    return (_jsx(ConditionalThemeProvider, { children: _jsx(ForgotPasswordContent, { ...props }) }));
}
export default ForgotPassword;
//# sourceMappingURL=ForgotPassword.js.map
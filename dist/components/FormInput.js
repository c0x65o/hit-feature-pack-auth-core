'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export function FormInput({ label, error, type = 'text', className = '', ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    return (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: {
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: '0.375rem',
                    color: 'var(--hit-foreground)'
                }, children: label }), _jsxs("div", { style: { position: 'relative', width: '100%' }, children: [_jsx("input", { type: isPassword && showPassword ? 'text' : type, style: {
                            width: '100%',
                            height: '2.5rem',
                            paddingLeft: '0.75rem',
                            paddingRight: isPassword ? '2.5rem' : '0.75rem',
                            backgroundColor: 'var(--hit-input-bg)',
                            border: `1px solid ${error ? 'var(--hit-error)' : 'var(--hit-border)'}`,
                            borderRadius: '0.5rem',
                            color: 'var(--hit-foreground)',
                            fontSize: '0.875rem',
                            outline: 'none',
                        }, className: className, ...props }), isPassword && (_jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), "aria-label": showPassword ? 'Hide password' : 'Show password', style: {
                            position: 'absolute',
                            right: '0.5rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '1.75rem',
                            height: '1.75rem',
                            padding: 0,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            color: 'var(--hit-muted-foreground)',
                            cursor: 'pointer',
                        }, children: showPassword ? _jsx(EyeOff, { style: { width: '1rem', height: '1rem' } }) : _jsx(Eye, { style: { width: '1rem', height: '1rem' } }) }))] }), error && (_jsx("p", { style: {
                    marginTop: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--hit-error)'
                }, children: error }))] }));
}
//# sourceMappingURL=FormInput.js.map
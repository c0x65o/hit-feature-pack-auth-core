'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export function FormInput({ label, error, type = 'text', className = '', ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    return (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "block text-xs font-medium mb-1 text-[var(--hit-foreground)]", children: label }), _jsxs("div", { className: "relative w-full", children: [_jsx("input", { type: isPassword && showPassword ? 'text' : type, className: `w-full h-9 px-3 bg-[var(--hit-input-bg)] border rounded-md text-sm text-[var(--hit-foreground)] outline-none focus:ring-1 focus:ring-[var(--hit-primary)] ${error ? 'border-[var(--hit-error)]' : 'border-[var(--hit-border)]'} ${isPassword ? 'pr-10' : ''} ${className}`, ...props }), isPassword && (_jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), "aria-label": showPassword ? 'Hide password' : 'Show password', className: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] cursor-pointer", children: showPassword ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) }))] }), error && (_jsx("p", { className: "mt-1 text-xs font-medium text-[var(--hit-error)]", children: error }))] }));
}
//# sourceMappingURL=FormInput.js.map
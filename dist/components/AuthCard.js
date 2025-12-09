'use client';
import { jsx as _jsx } from "react/jsx-runtime";
export function AuthCard({ children, className = '' }) {
    return (_jsx("div", { className: `w-full max-w-[380px] p-6 bg-[var(--hit-surface)] border border-[var(--hit-border)] rounded-xl shadow-lg ${className}`, children: children }));
}
export function AuthLayout({ children }) {
    return (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-[var(--hit-background)] p-4 overflow-auto", children: children }));
}
//# sourceMappingURL=AuthCard.js.map
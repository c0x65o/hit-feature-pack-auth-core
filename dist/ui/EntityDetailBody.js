'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Mail } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
function asRecord(v) {
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}
function formatLocalDateTime(value) {
    if (value == null || value === '')
        return null;
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime()))
        return null;
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }
    catch {
        return d.toLocaleString();
    }
}
function DetailField({ uiSpec, record, fieldKey }) {
    const fieldsMap = asRecord(uiSpec?.fields) || {};
    const spec = asRecord(fieldsMap[fieldKey]) || {};
    const type = String(spec.type || 'text');
    const label = String(spec.label || fieldKey);
    const raw = record?.[fieldKey];
    if (type === 'email') {
        if (!raw)
            return null;
        return (_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-400 mb-1", children: label }), _jsxs("a", { href: `mailto:${String(raw)}`, className: "text-blue-400 hover:underline flex items-center gap-1", children: [_jsx(Mail, { size: 14 }), String(raw)] })] }, fieldKey));
    }
    if (type === 'datetime' || type === 'date') {
        const formatted = formatLocalDateTime(raw);
        if (!formatted)
            return null;
        return (_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-400 mb-1", children: label }), _jsx("div", { children: formatted })] }, fieldKey));
    }
    if (raw == null || raw === '')
        return null;
    return (_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-400 mb-1", children: label }), _jsx("div", { children: String(raw) })] }, fieldKey));
}
export function EntityDetailBody({ entityKey, uiSpec, record, }) {
    const { Card } = useUi();
    const detail = asRecord(uiSpec?.detail) || {};
    const summaryFieldsAny = detail.summaryFields;
    const summaryFields = Array.isArray(summaryFieldsAny)
        ? summaryFieldsAny.map((x) => String(x).trim()).filter(Boolean)
        : [];
    const fieldsMap = asRecord(uiSpec?.fields) || {};
    const fallback = Object.keys(fieldsMap).filter((k) => k && k !== 'id').slice(0, 8);
    const keysToRender = summaryFields.length ? summaryFields : fallback;
    return (_jsxs(Card, { children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: keysToRender.map((k) => (_jsx(DetailField, { uiSpec: uiSpec, record: record, fieldKey: k }, k))) }), !keysToRender.length ? (_jsxs("div", { className: "text-sm text-gray-500", children: ["No detail fields configured for ", entityKey, "."] })) : null] }));
}
//# sourceMappingURL=EntityDetailBody.js.map
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime } from '@hit/sdk';
import { useAuditLog, useAuthAdminConfig } from '../hooks/useAuthAdmin';
export function AuditLog({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner } = useUi();
    const [page, setPage] = useState(1);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const { data, loading, error, refresh } = useAuditLog({
        page,
        pageSize: 50,
    });
    const { config: adminConfig, loading: configLoading } = useAuthAdminConfig();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    // Redirect if audit log is disabled
    useEffect(() => {
        if (!configLoading && adminConfig && adminConfig.audit_log === false) {
            navigate('/admin');
        }
    }, [adminConfig, configLoading]);
    const getEventBadgeVariant = (eventType) => {
        const type = eventType.toLowerCase();
        if (type.includes('success') || type.includes('created') || type.includes('enabled'))
            return 'success';
        if (type.includes('failed') || type.includes('error') || type.includes('deleted'))
            return 'error';
        if (type.includes('attempt') || type.includes('reset') || type.includes('disabled'))
            return 'warning';
        if (type.includes('updated') || type.includes('changed'))
            return 'info';
        return 'default';
    };
    const formatEventType = (eventType) => {
        return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const getFailureReason = (eventType, metadata) => {
        if (eventType !== 'login_failure' || !metadata)
            return null;
        const reason = metadata.reason;
        if (!reason)
            return null;
        // Format the reason for display
        const reasonMap = {
            'email_not_verified': 'Email not verified',
            'invalid_password': 'Invalid password',
            'user_not_found': 'User not found',
            'password_required': 'Password required',
            'two_factor_code_required': '2FA code required',
            'invalid_two_factor_code': 'Invalid 2FA code',
            'rate_limit_exceeded': 'Rate limit exceeded',
        };
        return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };
    // Show loading while checking config
    if (configLoading) {
        return (_jsx(Page, { title: "Audit Log", description: "Security events and user activity", children: _jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }));
    }
    // Don't render if audit log is disabled (will redirect)
    if (!adminConfig?.audit_log) {
        return null;
    }
    return (_jsxs(Page, { title: "Audit Log", description: "Security events and user activity", actions: _jsxs(Button, { variant: "secondary", onClick: () => refresh(), children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading audit log", children: error.message })), _jsx(Card, { children: _jsx(DataTable, { columns: [
                        {
                            key: 'created_at',
                            label: 'Time',
                            sortable: true,
                            render: (value) => _jsx("span", { className: "text-sm", children: formatDateTime(value) }),
                        },
                        {
                            key: 'user_email',
                            label: 'User',
                            sortable: true,
                            render: (value) => (_jsx("button", { className: "text-blue-500 hover:text-blue-400", onClick: () => navigate(`/admin/users/${encodeURIComponent(value)}`), children: value })),
                        },
                        {
                            key: 'event_type',
                            label: 'Event',
                            sortable: true,
                            render: (value, row) => {
                                const eventType = value;
                                const metadata = row.metadata || row.details;
                                const failureReason = getFailureReason(eventType, metadata);
                                return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Badge, { variant: getEventBadgeVariant(eventType), children: formatEventType(eventType) }), failureReason && (_jsx("span", { className: "text-xs text-gray-400 italic", children: failureReason }))] }));
                            },
                        },
                        {
                            key: 'ip_address',
                            label: 'IP Address',
                            sortable: true,
                            render: (value) => _jsx("span", { className: "font-mono text-sm", children: value }),
                        },
                        {
                            key: 'actions',
                            label: '',
                            align: 'right',
                            sortable: false,
                            hideable: false,
                            render: (_, row) => (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setSelectedEntry(row), children: [_jsx(Eye, { size: 16, className: "mr-1" }), "Details"] })),
                        },
                    ], data: (data?.items || []).map((entry) => ({
                        id: entry.id,
                        created_at: entry.created_at,
                        user_email: entry.user_email,
                        event_type: entry.event_type,
                        ip_address: entry.ip_address,
                        user_agent: entry.user_agent,
                        details: entry.details,
                        metadata: entry.metadata || entry.details,
                    })), emptyMessage: "No audit log entries found", loading: loading, searchable: true, exportable: true, showColumnVisibility: true, pageSize: 50 }) }), _jsx(Modal, { open: !!selectedEntry, onClose: () => setSelectedEntry(null), title: "Audit Log Entry", size: "lg", children: selectedEntry && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400", children: "Time" }), _jsx("p", { className: "text-gray-900 dark:text-gray-100", children: formatDateTime(selectedEntry.created_at) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400", children: "User" }), _jsx("p", { className: "text-gray-900 dark:text-gray-100", children: selectedEntry.user_email })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400", children: "Event" }), _jsx(Badge, { variant: getEventBadgeVariant(selectedEntry.event_type), children: formatEventType(selectedEntry.event_type) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400", children: "IP Address" }), _jsx("p", { className: "font-mono text-gray-900 dark:text-gray-100", children: selectedEntry.ip_address })] })] }), selectedEntry.user_agent && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: "User Agent" }), _jsx("p", { className: "text-sm text-gray-400 break-all", children: selectedEntry.user_agent })] })), selectedEntry.details && Object.keys(selectedEntry.details).length > 0 && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: "Additional Details" }), _jsx("pre", { className: "bg-gray-800 rounded-lg p-3 text-sm overflow-auto", children: JSON.stringify(selectedEntry.details, null, 2) })] })), _jsx("div", { className: "flex justify-end gap-3 pt-4", children: _jsx(Button, { variant: "ghost", onClick: () => setSelectedEntry(null), children: "Close" }) })] })) })] }));
}
export default AuditLog;
//# sourceMappingURL=AuditLog.js.map
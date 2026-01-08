'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Users, Key, Shield, AlertTriangle, UserPlus, Activity, Clock, TrendingUp, TrendingDown, } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatRelativeTime } from '@hit/sdk';
import { useStats, useAuditLog, useAuthAdminConfig } from '../hooks/useAuthAdmin';
export function Dashboard({ onNavigate }) {
    const { Page, Card, Button, Badge, Spinner, EmptyState, Alert } = useUi();
    const { stats, loading: statsLoading, error: statsError } = useStats();
    const { data: auditData, loading: auditLoading, error: auditError } = useAuditLog({ pageSize: 5 });
    const { config: authConfig, loading: configLoading } = useAuthAdminConfig();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    const getEventBadgeVariant = (eventType) => {
        if (eventType.includes('login_success'))
            return 'success';
        if (eventType.includes('login_failed'))
            return 'error';
        if (eventType.includes('password'))
            return 'warning';
        if (eventType.includes('created') || eventType.includes('registered'))
            return 'info';
        return 'default';
    };
    // Stats Card Component (inline for simplicity)
    const StatsCard = ({ title, value, icon: Icon, iconColor, subtitle, trend, }) => (_jsx(Card, { children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: title }), _jsx("p", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1", children: value }), subtitle && _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-500 mt-1", children: subtitle }), trend && (_jsxs("div", { className: "flex items-center gap-2 mt-2", children: [trend.direction === 'up' ? (_jsx(TrendingUp, { size: 14, className: "text-green-500" })) : (_jsx(TrendingDown, { size: 14, className: "text-red-500" })), _jsx("span", { className: `text-sm ${trend.direction === 'up' ? 'text-green-500' : 'text-red-500'}`, children: trend.value })] }))] }), _jsx("div", { className: iconColor, children: _jsx(Icon, { size: 24 }) })] }) }));
    // Check for auth errors
    const authError = statsError || auditError;
    const isAuthError = authError && 'status' in authError &&
        (authError.status === 401 || authError.status === 403);
    // Calculate number of visible stat cards
    const visibleCardsCount = 2 + // Total Users + Active Sessions (always visible)
        (!configLoading && authConfig?.two_factor_auth ? 1 : 0) + // 2FA Adoption
        (!configLoading && authConfig?.rate_limiting ? 1 : 0); // Failed Logins
    // Determine grid columns based on visible cards
    const getGridCols = () => {
        if (visibleCardsCount === 2)
            return 'lg:grid-cols-2';
        if (visibleCardsCount === 3)
            return 'lg:grid-cols-3';
        return 'lg:grid-cols-4';
    };
    return (_jsxs(Page, { title: "Admin Dashboard", description: "Overview of user activity and system status", actions: _jsxs(Button, { variant: "primary", onClick: () => navigate('/admin/users?action=create'), children: [_jsx(UserPlus, { size: 16, className: "mr-2" }), "Add User"] }), children: [isAuthError && (_jsxs(Alert, { variant: "warning", title: "Access Denied", children: [_jsx("p", { children: authError.status === 403
                            ? 'You do not have admin privileges to view this data. Please contact an administrator.'
                            : 'Your session has expired. Please log in again.' }), _jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-2", children: ["Error: ", authError.message] })] })), _jsxs("div", { className: `grid grid-cols-1 md:grid-cols-2 ${getGridCols()} gap-6`, children: [_jsx(StatsCard, { title: "Total Users", value: statsLoading ? '...' : (stats?.total_users ?? 0), icon: Users, iconColor: "text-blue-500", trend: stats?.new_users_7d
                            ? { value: `${stats.new_users_7d} new this week`, direction: 'up' }
                            : undefined }), _jsx(StatsCard, { title: "Active Sessions", value: statsLoading ? '...' : (stats?.active_sessions ?? 0), icon: Key, iconColor: "text-green-500", subtitle: "Currently logged in" }), !configLoading && authConfig?.two_factor_auth && (_jsx(StatsCard, { title: "2FA Adoption", value: statsLoading ? '...' : `${stats?.two_factor_adoption ?? 0}%`, icon: Shield, iconColor: "text-purple-500", trend: stats?.two_factor_adoption && stats.two_factor_adoption > 50
                            ? { value: 'Above target', direction: 'up' }
                            : { value: 'Below target', direction: 'down' } })), !configLoading && authConfig?.rate_limiting && (_jsx(StatsCard, { title: "Failed Logins (24h)", value: statsLoading ? '...' : (stats?.failed_logins_24h ?? 0), icon: AlertTriangle, iconColor: (stats?.failed_logins_24h ?? 0) > 10 ? 'text-red-500' : 'text-yellow-500', subtitle: "Potential security concern" }))] }), _jsx(Card, { title: "Quick Actions", children: _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/users'), children: [_jsx(Users, { size: 16, className: "mr-2" }), "View All Users"] }), _jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/sessions'), children: [_jsx(Key, { size: 16, className: "mr-2" }), "Active Sessions"] }), !configLoading && authConfig?.audit_log && (_jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/audit-log'), children: [_jsx(Activity, { size: 16, className: "mr-2" }), "Audit Log"] })), _jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/invites'), children: [_jsx(TrendingUp, { size: 16, className: "mr-2" }), "Invites", stats?.pending_invites ? (_jsx(Badge, { variant: "info", children: stats.pending_invites })) : null] })] }) }), !configLoading && authConfig?.audit_log && (_jsx(Card, { title: "Recent Activity", children: auditLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) })) : auditData?.items.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Clock, { size: 48 }), title: "No recent activity", description: "Activity will appear here when users interact with the system" })) : (_jsxs("div", { className: "space-y-4", children: [auditData?.items.map((entry, i) => (_jsxs("div", { className: "flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0", children: [_jsx("div", { className: "w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Badge, { variant: getEventBadgeVariant(entry.event_type), children: entry.event_type.replace(/_/g, ' ') }), _jsx("span", { className: "text-sm text-gray-700 dark:text-gray-100 truncate", children: entry.user_email })] }), _jsxs("div", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2", children: [_jsx("span", { children: entry.ip_address }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: formatRelativeTime(entry.created_at) })] })] })] }, entry.id || i))), _jsx("div", { className: "pt-2", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate('/admin/audit-log'), children: "View All Activity" }) })] })) }))] }));
}
export default Dashboard;
//# sourceMappingURL=Dashboard.js.map
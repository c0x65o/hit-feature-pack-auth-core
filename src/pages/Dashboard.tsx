'use client';

import React from 'react';
import {
  Users,
  Key,
  Shield,
  AlertTriangle,
  UserPlus,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatRelativeTime } from '@hit/sdk';
import { useStats, useAuditLog, useAuthAdminConfig } from '../hooks/useAuthAdmin';

interface DashboardProps {
  onNavigate?: (path: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { Page, Card, Button, Badge, Spinner, EmptyState, Alert } = useUi();
  
  const { stats, loading: statsLoading, error: statsError } = useStats();
  const { data: auditData, loading: auditLoading, error: auditError } = useAuditLog({ pageSize: 5 });
  const { config: authConfig, loading: configLoading } = useAuthAdminConfig();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };


  const getEventBadgeVariant = (eventType: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    if (eventType.includes('login_success')) return 'success';
    if (eventType.includes('login_failed')) return 'error';
    if (eventType.includes('password')) return 'warning';
    if (eventType.includes('created') || eventType.includes('registered')) return 'info';
    return 'default';
  };

  // Stats Card Component (inline for simplicity)
  const StatsCard = ({
    title,
    value,
    icon: Icon,
    iconColor,
    subtitle,
    trend,
  }: {
    title: string;
    value: string | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    iconColor: string;
    subtitle?: string;
    trend?: { value: string; direction: 'up' | 'down' };
  }) => (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-2 mt-2">
              {trend.direction === 'up' ? (
                <TrendingUp size={14} className="text-green-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span
                className={`text-sm ${
                  trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={iconColor}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );

  // Check for auth errors
  const authError = statsError || auditError;
  const isAuthError = authError && 'status' in authError && 
    ((authError as { status: number }).status === 401 || (authError as { status: number }).status === 403);

  // Calculate number of visible stat cards
  const visibleCardsCount = 2 + // Total Users + Active Sessions (always visible)
    (!configLoading && authConfig?.two_factor_auth ? 1 : 0) + // 2FA Adoption
    (!configLoading && authConfig?.rate_limiting ? 1 : 0); // Failed Logins

  // Determine grid columns based on visible cards
  const getGridCols = () => {
    if (visibleCardsCount === 2) return 'lg:grid-cols-2';
    if (visibleCardsCount === 3) return 'lg:grid-cols-3';
    return 'lg:grid-cols-4';
  };

  return (
    <Page
      title="Admin Dashboard"
      description="Overview of user activity and system status"
      actions={
        <Button variant="primary" onClick={() => navigate('/admin/users?action=create')}>
          <UserPlus size={16} className="mr-2" />
          Add User
        </Button>
      }
    >
      {/* Auth Error Alert */}
      {isAuthError && (
        <Alert variant="warning" title="Access Denied">
          <p>
            {(authError as { status: number }).status === 403 
              ? 'You do not have admin privileges to view this data. Please contact an administrator.'
              : 'Your session has expired. Please log in again.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Error: {authError.message}
          </p>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${getGridCols()} gap-6`}>
        <StatsCard
          title="Total Users"
          value={statsLoading ? '...' : (stats?.total_users ?? 0)}
          icon={Users}
          iconColor="text-blue-500"
          trend={
            stats?.new_users_7d
              ? { value: `${stats.new_users_7d} new this week`, direction: 'up' }
              : undefined
          }
        />
        <StatsCard
          title="Active Sessions"
          value={statsLoading ? '...' : (stats?.active_sessions ?? 0)}
          icon={Key}
          iconColor="text-green-500"
          subtitle="Currently logged in"
        />
        {/* Only show 2FA Adoption if two_factor_auth is enabled */}
        {!configLoading && authConfig?.two_factor_auth && (
          <StatsCard
            title="2FA Adoption"
            value={statsLoading ? '...' : `${stats?.two_factor_adoption ?? 0}%`}
            icon={Shield}
            iconColor="text-purple-500"
            trend={
              stats?.two_factor_adoption && stats.two_factor_adoption > 50
                ? { value: 'Above target', direction: 'up' }
                : { value: 'Below target', direction: 'down' }
            }
          />
        )}
        {/* Only show Failed Logins if rate_limiting is enabled */}
        {!configLoading && authConfig?.rate_limiting && (
          <StatsCard
            title="Failed Logins (24h)"
            value={statsLoading ? '...' : (stats?.failed_logins_24h ?? 0)}
            icon={AlertTriangle}
            iconColor={
              (stats?.failed_logins_24h ?? 0) > 10 ? 'text-red-500' : 'text-yellow-500'
            }
            subtitle="Potential security concern"
          />
        )}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            <Users size={16} className="mr-2" />
            View All Users
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/sessions')}>
            <Key size={16} className="mr-2" />
            Active Sessions
          </Button>
          {!configLoading && authConfig?.audit_log && (
            <Button variant="secondary" onClick={() => navigate('/admin/audit-log')}>
              <Activity size={16} className="mr-2" />
              Audit Log
            </Button>
          )}
          {!configLoading && authConfig?.allow_invited && (
            <Button variant="secondary" onClick={() => navigate('/admin/invites')}>
              <TrendingUp size={16} className="mr-2" />
              Invites
              {stats?.pending_invites ? (
                <Badge variant="info">{stats.pending_invites}</Badge>
              ) : null}
            </Button>
          )}
        </div>
      </Card>

      {/* Recent Activity - Only show if audit_log is enabled */}
      {!configLoading && authConfig?.audit_log && (
        <Card title="Recent Activity">
          {auditLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : auditData?.items.length === 0 ? (
            <EmptyState
              icon={<Clock size={48} />}
              title="No recent activity"
              description="Activity will appear here when users interact with the system"
            />
          ) : (
            <div className="space-y-4">
              {auditData?.items.map((entry, i) => (
                <div
                  key={entry.id || i}
                  className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-800 last:border-0 last:pb-0"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getEventBadgeVariant(entry.event_type)}>
                        {entry.event_type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-gray-700 dark:text-gray-100 truncate">
                        {entry.user_email}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{entry.ip_address}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/audit-log')}>
                  View All Activity
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}

export default Dashboard;



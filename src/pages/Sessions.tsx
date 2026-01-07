'use client';

import React from 'react';
import { Trash2, RefreshCw, Monitor, Smartphone, Globe } from 'lucide-react';
import { useUi, useAlertDialog } from '@hit/ui-kit';
import { useServerDataTableState } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { useSessions, useSessionMutations, type Session } from '../hooks/useAuthAdmin';

interface SessionsProps {
  onNavigate?: (path: string) => void;
}

export function Sessions({ onNavigate }: SessionsProps) {
  const { Page, Card, Button, Badge, DataTable, Alert, Spinner, AlertDialog } = useUi();
  const alertDialog = useAlertDialog();

  const serverTable = useServerDataTableState({
    tableId: 'admin.sessions',
    pageSize: 50,
    initialSort: { sortBy: 'created_at', sortOrder: 'desc' },
    sortWhitelist: ['user_email', 'ip_address', 'created_at', 'expires_at'],
  });

  const { data, loading, error, refresh } = useSessions({
    page: serverTable.query.page,
    pageSize: serverTable.query.pageSize,
    search: serverTable.query.search,
  });

  const { revokeSession, loading: mutating } = useSessionMutations();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    const confirmed = await alertDialog.showConfirm('Are you sure you want to revoke this session?', {
      title: 'Revoke Session',
      variant: 'warning',
    });
    if (confirmed) {
      try {
        await revokeSession(sessionId);
        refresh();
      } catch {
        // Error handled by hook
      }
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent?.toLowerCase() || '';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone size={16} className="text-gray-400" />;
    }
    return <Monitor size={16} className="text-gray-400" />;
  };

  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return userAgent.split(' ')[0] || 'Unknown';
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Page
      title="Active Sessions"
      description="Monitor and manage user sessions"
      actions={
        <Button variant="secondary" onClick={() => refresh()}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading sessions">
          {error.message}
        </Alert>
      )}

      <Card>
        <DataTable
          columns={[
            {
              key: 'user_email',
              label: 'User',
              sortable: true,
              render: (value: unknown) => (
                <button
                  className="text-blue-500 hover:text-blue-400"
                  onClick={() => navigate(`/admin/users/${encodeURIComponent(value as string)}`)}
                >
                  {value as string}
                </button>
              ),
            },
            {
              key: 'device',
              label: 'Device',
              render: (_: unknown, row: Record<string, unknown>) => (
                <div className="flex items-center gap-2">
                  {getDeviceIcon(row.user_agent as string)}
                  <span>{getDeviceName(row.user_agent as string)}</span>
                </div>
              ),
            },
            {
              key: 'ip_address',
              label: 'IP Address',
              sortable: true,
              render: (value: unknown) => (
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-400" />
                  <span className="font-mono text-sm">{value as string}</span>
                </div>
              ),
            },
            {
              key: 'created_at',
              label: 'Started',
              sortable: true,
              render: (value: unknown) => formatDateTime(value as string),
            },
            {
              key: 'expires_at',
              label: 'Expires',
              sortable: true,
              render: (value: unknown) => {
                const expiresAt = value as string;
                if (!expiresAt) return '—';
                const expired = isExpired(expiresAt);
                return (
                  <div className="flex flex-col">
                    <span className={expired ? 'text-gray-500 line-through' : ''}>
                      {formatDateTime(expiresAt)}
                    </span>
                    {!expired && (
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(expiresAt)}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (_: unknown, row: Record<string, unknown>) => {
                const current = row.current as boolean;
                const expired = isExpired(row.expires_at as string);
                return (
                  <Badge variant={current ? 'success' : expired ? 'error' : 'default'}>
                    {current ? 'Current' : expired ? 'Expired' : 'Active'}
                  </Badge>
                );
              },
            },
            {
              key: 'actions',
              label: '',
              align: 'right' as const,
              sortable: false,
              hideable: false,
              render: (_: unknown, row: Record<string, unknown>) => {
                if (row.current) return null;
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(row.id as string)}
                    disabled={mutating}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                );
              },
            },
          ]}
          data={(data?.items || []).map((session) => ({
            id: session.id,
            user_email: session.user_email,
            user_agent: session.user_agent,
            ip_address: session.ip_address,
            created_at: session.created_at,
            expires_at: session.expires_at,
            current: session.current,
          }))}
          emptyMessage="No active sessions"
          loading={loading}
          searchable
          exportable
          showColumnVisibility
          total={data?.total}
          {...serverTable.dataTable}
          searchDebounceMs={400}
          onRefresh={refresh}
          refreshing={loading}
          tableId="admin.sessions"
        />
      </Card>

      {/* Alert Dialog */}
      <AlertDialog {...alertDialog.props} />
    </Page>
  );
}

export default Sessions;



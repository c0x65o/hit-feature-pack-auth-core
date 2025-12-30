'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime } from '@hit/sdk';
import { useAuditLog, useAuthAdminConfig, type AuditLogEntry } from '../hooks/useAuthAdmin';

interface AuditLogProps {
  onNavigate?: (path: string) => void;
}

export function AuditLog({ onNavigate }: AuditLogProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner } = useUi();
  
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { data, loading, error, refresh } = useAuditLog({
    page,
    pageSize: 50,
  });

  const { config: adminConfig, loading: configLoading } = useAuthAdminConfig();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // Redirect if audit log is disabled
  useEffect(() => {
    if (!configLoading && adminConfig && adminConfig.audit_log === false) {
      navigate('/admin');
    }
  }, [adminConfig, configLoading]);


  const getEventBadgeVariant = (eventType: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    const type = eventType.toLowerCase();
    if (type.includes('success') || type.includes('created') || type.includes('enabled')) return 'success';
    if (type.includes('failed') || type.includes('error') || type.includes('deleted')) return 'error';
    if (type.includes('attempt') || type.includes('reset') || type.includes('disabled')) return 'warning';
    if (type.includes('updated') || type.includes('changed')) return 'info';
    return 'default';
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getFailureReason = (eventType: string, metadata?: Record<string, unknown>): string | null => {
    if (eventType !== 'login_failure' || !metadata) return null;
    const reason = metadata.reason as string | undefined;
    if (!reason) return null;
    
    // Format the reason for display
    const reasonMap: Record<string, string> = {
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
    return (
      <Page title="Audit Log" description="Security events and user activity">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Page>
    );
  }

  // Don't render if audit log is disabled (will redirect)
  if (!adminConfig?.audit_log) {
    return null;
  }

  return (
    <Page
      title="Audit Log"
      description="Security events and user activity"
      actions={
        <Button variant="secondary" onClick={() => refresh()}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading audit log">
          {error.message}
        </Alert>
      )}

      <Card>
        <DataTable
          columns={[
            {
              key: 'created_at',
              label: 'Time',
              sortable: true,
              render: (value: unknown) => <span className="text-sm">{formatDateTime(value as string)}</span>,
            },
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
              key: 'event_type',
              label: 'Event',
              sortable: true,
              render: (value: unknown, row: Record<string, unknown>) => {
                const eventType = value as string;
                const metadata = (row as Record<string, unknown>).metadata || (row as Record<string, unknown>).details;
                const failureReason = getFailureReason(eventType, metadata as Record<string, unknown> | undefined);
                
                return (
                  <div className="flex flex-col gap-1">
                    <Badge variant={getEventBadgeVariant(eventType)}>
                      {formatEventType(eventType)}
                    </Badge>
                    {failureReason && (
                      <span className="text-xs text-gray-400 italic">
                        {failureReason}
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'ip_address',
              label: 'IP Address',
              sortable: true,
              render: (value: unknown) => <span className="font-mono text-sm">{value as string}</span>,
            },
            {
              key: 'actions',
              label: '',
              align: 'right' as const,
              sortable: false,
              hideable: false,
              render: (_: unknown, row: Record<string, unknown>) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEntry(row as unknown as AuditLogEntry)}
                >
                  <Eye size={16} className="mr-1" />
                  Details
                </Button>
              ),
            },
          ]}
          data={(data?.items || []).map((entry) => ({
            id: entry.id,
            created_at: entry.created_at,
            user_email: entry.user_email,
            event_type: entry.event_type,
            ip_address: entry.ip_address,
            user_agent: entry.user_agent,
            details: entry.details,
            metadata: entry.metadata || entry.details,
          }))}
          emptyMessage="No audit log entries found"
          loading={loading}
          searchable
          exportable
          showColumnVisibility
          pageSize={50}
          onRefresh={refresh}
          refreshing={loading}
          tableId="admin.audit-log"
        />
      </Card>

      {/* Entry Details Modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Audit Log Entry"
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400">Time</label>
                <p className="text-gray-900 dark:text-gray-100">{formatDateTime(selectedEntry.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">User</label>
                <p className="text-gray-900 dark:text-gray-100">{selectedEntry.user_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Event</label>
                <Badge variant={getEventBadgeVariant(selectedEntry.event_type)}>
                  {formatEventType(selectedEntry.event_type)}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">IP Address</label>
                <p className="font-mono text-gray-900 dark:text-gray-100">{selectedEntry.ip_address}</p>
              </div>
            </div>

            {selectedEntry.user_agent && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">User Agent</label>
                <p className="text-sm text-gray-400 break-all">{selectedEntry.user_agent}</p>
              </div>
            )}

            {selectedEntry.details && Object.keys(selectedEntry.details).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Additional Details</label>
                <pre className="bg-gray-800 rounded-lg p-3 text-sm overflow-auto">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

export default AuditLog;



'use client';

import React, { useState } from 'react';
import { RefreshCw, Trash2, Send, UserPlus, Clock } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useServerDataTableState } from '@hit/ui-kit';
import { formatDateShort } from '@hit/sdk';
import { useInvites, useInviteMutations } from '../hooks/useAuthAdmin';

interface InvitesProps {
  onNavigate?: (path: string) => void;
}

export function Invites({ onNavigate }: InvitesProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Select, Alert, Spinner, EmptyState, AlertDialog } = useUi();
  const alertDialog = useAlertDialog();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');

  const serverTable = useServerDataTableState({
    tableId: 'admin.invites',
    pageSize: 25,
    initialSort: { sortBy: 'expires_at', sortOrder: 'asc' },
    sortWhitelist: ['email', 'expires_at'],
  });

  const { data, loading, error, refresh } = useInvites({
    page: serverTable.query.page,
    pageSize: serverTable.query.pageSize,
  });
  const { createInvite, resendInvite, revokeInvite, loading: mutating, error: mutationError } = useInviteMutations();

  const handleCreateInvite = async () => {
    try {
      await createInvite({ email: newEmail, role: newRole });
      setCreateModalOpen(false);
      setNewEmail('');
      setNewRole('user');
      refresh();
    } catch (e) {
      // Error is stored in mutationError and will be displayed in the modal
      // Don't close modal on error so user can see the error and retry
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    const confirmed = await alertDialog.showConfirm('Resend this invitation?', {
      variant: 'info',
      title: 'Resend Invitation',
      confirmText: 'Resend',
      cancelText: 'Cancel',
    });
    
    if (confirmed) {
      try {
        await resendInvite(inviteId);
        await alertDialog.showAlert('Invitation resent!', {
          variant: 'success',
          title: 'Success',
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to resend invitation';
        await alertDialog.showAlert(errorMessage, {
          variant: 'error',
          title: 'Error',
        });
      }
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const confirmed = await alertDialog.showConfirm('Are you sure you want to revoke this invitation?', {
      variant: 'warning',
      title: 'Revoke Invitation',
      confirmText: 'Revoke',
      cancelText: 'Cancel',
    });
    
    if (confirmed) {
      try {
        await revokeInvite(inviteId);
        refresh();
      } catch {
        // Error handled by hook
      }
    }
  };


  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <Page
      title="Invitations"
      description="Manage user invitations"
      actions={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => refresh()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={16} className="mr-2" />
            Send Invite
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading invites">
          {error.message}
        </Alert>
      )}

      {mutationError && (
        <Alert variant="error" title="Error">
          {mutationError.message}
        </Alert>
      )}

      <Card>
        {!data?.items?.length && !loading ? (
          <EmptyState
            icon={<Clock size={48} />}
            title="No pending invitations"
            description="Send an invitation to add new users"
            action={
              <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                <UserPlus size={16} className="mr-2" />
                Send Invite
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={[
              {
                key: 'email',
                label: 'Email',
                sortable: true,
                render: (value: unknown) => <span className="font-medium">{value as string}</span>,
              },
              {
                key: 'roles',
                label: 'Roles',
                render: (value: unknown) => (
                  <div className="flex gap-1">
                    {(value as string[])?.map((role) => (
                      <Badge key={role} variant={role === 'admin' ? 'info' : 'default'}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (_: unknown, row: Record<string, unknown>) => {
                  const expired = isExpired(row.expires_at as string);
                  const accepted = !!row.accepted_at;
                  return (
                    <Badge variant={accepted ? 'success' : expired ? 'error' : 'warning'}>
                      {accepted ? 'Accepted' : expired ? 'Expired' : 'Pending'}
                    </Badge>
                  );
                },
              },
              {
                key: 'expires_at',
                label: 'Expires',
                sortable: true,
                render: (value: unknown) => formatDateShort(value as string),
              },
              {
                key: 'actions',
                label: '',
                align: 'right' as const,
                sortable: false,
                hideable: false,
                render: (_: unknown, row: Record<string, unknown>) => {
                  if (row.accepted_at) return null;
                  return (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendInvite(row.id as string)}
                        disabled={mutating}
                      >
                        <Send size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvite(row.id as string)}
                        disabled={mutating}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={(data?.items || []).map((invite) => ({
              id: invite.id,
              email: invite.email,
              roles: invite.roles,
              expires_at: invite.expires_at,
              accepted_at: invite.accepted_at,
            }))}
            emptyMessage="No invitations found"
            loading={loading}
            searchable
            exportable
            showColumnVisibility
            total={data?.total}
            {...serverTable.dataTable}
            searchDebounceMs={400}
            onRefresh={refresh}
            refreshing={loading}
            tableId="admin.invites"
          />
        )}
      </Card>

      {/* Create Invite Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          // Clear error when closing modal
          if (mutationError) {
            // The hook should clear error, but we can also clear it here if needed
          }
        }}
        title="Send Invitation"
        description="Invite a new user to join"
      >
        <div className="space-y-4">
          {mutationError && (
            <Alert variant="error" title="Failed to send invitation">
              {mutationError.message}
            </Alert>
          )}
          <Input
            label="Email"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="user@example.com"
            required
          />
          <Select
            label="Role"
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={newRole}
            onChange={setNewRole}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateInvite}
              loading={mutating}
              disabled={!newEmail}
            >
              Send Invite
            </Button>
          </div>
          </div>
        </Modal>

      {/* Alert Dialog */}
      <AlertDialog {...alertDialog.props} />
    </Page>
  );
}

export default Invites;



'use client';

import React, { useState } from 'react';
import { Trash2, UserPlus, Lock } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useUsers, useUserMutations, useAuthAdminConfig, useProfileFields, type User } from '../hooks/useAuthAdmin';

interface UsersProps {
  onNavigate?: (path: string) => void;
}

export function Users({ onNavigate }: UsersProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner } = useUi();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data, loading, error, refresh } = useUsers({
    page,
    pageSize: 25,
    search,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const { createUser, deleteUser, loading: mutating } = useUserMutations();
  const { config: adminConfig } = useAuthAdminConfig();
  const { data: profileFieldMetadata } = useProfileFields();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUser({ email: newEmail, password: newPassword });
      setCreateModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.email);
      setDeleteModalOpen(false);
      setSelectedUser(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };


  const formatDateOrNever = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return formatDate(dateStr);
  };

  return (
    <Page
      title="Users"
      description="Manage user accounts"
      actions={
        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          <UserPlus size={16} className="mr-2" />
          Add User
        </Button>
      }
    >
      {/* Error */}
      {error && (
        <Alert variant="error" title="Error loading users">
          {error.message}
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <DataTable
          columns={[
            {
              key: 'email',
              label: 'Email',
              sortable: true,
              render: (_, row) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{String(row.email)}</span>
                      {row.locked ? <Lock size={14} className="text-red-500" /> : null}
                    </div>
                  ),
                },
                // Add profile fields columns (first 2 fields)
                ...(profileFieldMetadata && profileFieldMetadata.length > 0
                  ? profileFieldMetadata
                      .filter((field: any) => field.field_key !== 'email') // Exclude email as it's already shown
                      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                      .slice(0, 2) // Show first 2 additional fields
                      .map((field: any) => ({
                        key: `profile_fields.${field.field_key}`,
                        label: field.field_label,
                        render: (_: unknown, row: any) => {
                          const value = row.profile_fields?.[field.field_key];
                          return (
                            <span className="text-gray-900 dark:text-gray-100">
                              {value !== undefined && value !== null ? String(value) : '—'}
                            </span>
                          );
                        },
                      }))
                  : []),
                {
                  key: 'email_verified',
                  label: 'Verified',
                  render: (value: unknown) => (
                    <Badge variant={value ? 'success' : 'warning'}>
                      {value ? 'Verified' : 'Pending'}
                    </Badge>
                  ),
                },
                ...(adminConfig?.two_factor_auth !== false
                  ? [
                      {
                        key: 'two_factor_enabled',
                        label: '2FA',
                        render: (value: unknown) => (
                          <Badge variant={value ? 'success' : 'default'}>
                            {value ? 'Enabled' : 'Disabled'}
                          </Badge>
                        ),
                      },
                    ]
                  : []),
                {
                  key: 'role',
                  label: 'Role',
                  render: (value) => {
                    // Value is already a string from the API (user.get_role())
                    const userRole = (typeof value === 'string' ? value : 'user') || 'user';
                    return (
                      <Badge variant={userRole === 'admin' ? 'info' : 'default'}>
                        {userRole}
                      </Badge>
                    );
                  },
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (_, row) => {
                    const user = row as unknown as User;
                    const isLocked = user.locked || false;
                    return (
                      <Badge variant={isLocked ? 'warning' : 'success'}>
                        {isLocked ? 'Locked' : 'Active'}
                      </Badge>
                    );
                  },
                },
            {
              key: 'created_at',
              label: 'Created',
              sortable: true,
              render: (value) => formatDateOrNever(value as string | null),
            },
            {
              key: 'last_login',
              label: 'Last Login',
              sortable: true,
              render: (value) => formatDateOrNever(value as string | null),
            },
            {
              key: 'actions',
              label: '',
              align: 'right' as const,
              sortable: false,
              hideable: false,
              render: (_, row) => {
                    const user = row as unknown as User;
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              data={(data?.items || []).map((user) => ({
              email: user.email,
              email_verified: user.email_verified,
              ...(adminConfig?.two_factor_auth !== false
                ? { two_factor_enabled: user.two_factor_enabled }
                : {}),
              role: user.role || 'user', // API already returns correct role via user.get_role()
              roles: user.roles, // Keep for backwards compatibility
              created_at: user.created_at,
              last_login: user.last_login,
              locked: user.locked,
              profile_fields: user.profile_fields || {}, // Include profile_fields for table rendering
          }))}
          onRowClick={(row) => navigate(`/admin/users/${encodeURIComponent(row.email as string)}`)}
          emptyMessage="No users found"
          loading={loading}
          searchable
          exportable
          showColumnVisibility
          pageSize={25}
          manualPagination={true}
          total={data?.total}
          page={page}
          onPageChange={setPage}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User"
        description="Add a new user to the system"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="user@example.com"
            required
          />
          <Input
            label="Initial Password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Minimum 8 characters"
            required
          />
          <p className="text-xs text-gray-400">
            User can change this after first login
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              loading={mutating}
              disabled={!newEmail || !newPassword}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900 dark:text-gray-100">{selectedUser?.email}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} loading={mutating}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

export default Users;



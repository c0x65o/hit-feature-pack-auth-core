'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Lock, Shield } from 'lucide-react';
import { useUi, type BreadcrumbItem } from '@hit/ui-kit';
import { usePermissionSets, usePermissionSetMutations } from '../hooks/useAuthAdmin';

interface SecurityGroupsListProps {
  onNavigate?: (path: string) => void;
}

export default function SecurityGroupsListPage(props: SecurityGroupsListProps) {
  return <SecurityGroupsList {...props} />;
}

export function SecurityGroupsList({ onNavigate }: SecurityGroupsListProps) {
  const { Page, Card, Button, DataTable, Modal, Input, Alert, Spinner } = useUi();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: sets, loading, error, refresh } = usePermissionSets();
  const mutations = usePermissionSetMutations();

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const rows = useMemo(() => {
    return sets || [];
  }, [sets]);

  const canCreate = newName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      const created = await mutations.createPermissionSet({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewName('');
      setNewDescription('');
      setCreateOpen(false);
      refresh();
      // Navigate to the new group
      if (created?.id) {
        navigate(`/admin/security-groups/${created.id}`);
      }
    } catch (e) {
      console.error('Failed to create security group:', e);
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Admin', href: '/admin', icon: <Shield size={14} /> },
    { label: 'Security Groups' },
  ];

  return (
    <Page
      title="Security Groups"
      description="Permission Sets control access to pages, actions, and metrics. Assign them to users, groups, or roles."
      breadcrumbs={breadcrumbs}
      onNavigate={navigate}
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          New Security Group
        </Button>
      }
    >
      {error && <Alert variant="error">{error.message}</Alert>}

      <Card>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Security Group',
              sortable: true,
              render: (_: unknown, row: Record<string, unknown>) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/security-groups/${row.id as string}`)}
                >
                  <Lock size={14} className="mr-2" />
                  {String(row.name || '')}
                </Button>
              ),
            },
            {
              key: 'description',
              label: 'Description',
              sortable: false,
              render: (value: unknown) => (
                <span className="text-gray-500 dark:text-gray-400">
                  {value ? String(value) : '—'}
                </span>
              ),
            },
            {
              key: 'updated_at',
              label: 'Updated',
              sortable: true,
              render: (value: unknown) => (
                <span className="text-gray-500 dark:text-gray-400">
                  {value ? String(value) : '—'}
                </span>
              ),
            },
          ]}
          data={rows}
          emptyMessage="No security groups found. Create your first security group to get started."
          loading={loading}
          searchable
          exportable
          showColumnVisibility
          pageSize={25}
        />
      </Card>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Security Group">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={newName}
              onChange={setNewName}
              placeholder="e.g. Finance Managers"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={newDescription}
              onChange={setNewDescription}
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreate().catch(() => void 0)}
              disabled={!canCreate || mutations.loading}
              loading={mutations.loading}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Lock, Shield, Users, FileText, BarChart3, ChevronRight, Search } from 'lucide-react';
import { useUi, type BreadcrumbItem } from '@hit/ui-kit';
import { usePermissionSets, usePermissionSetMutations } from '../hooks/useAuthAdmin';

interface SecurityGroupsListProps {
  onNavigate?: (path: string) => void;
}

export default function SecurityGroupsListPage(props: SecurityGroupsListProps) {
  return <SecurityGroupsList {...props} />;
}

export function SecurityGroupsList({ onNavigate }: SecurityGroupsListProps) {
  const { Page, Card, Button, Badge, Modal, Input, Alert, Spinner } = useUi();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [search, setSearch] = useState('');

  const { data: sets, loading, error, refresh } = usePermissionSets();
  const mutations = usePermissionSetMutations();

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const filteredSets = useMemo(() => {
    if (!sets) return [];
    const q = search.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [sets, search]);

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
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search security groups..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : filteredSets.length === 0 ? (
        <Card className="py-16 text-center">
          <Lock size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">
            {search ? 'No matching security groups' : 'No security groups yet'}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Security Groups bundle permissions for pages, actions, and metrics.
            Create one to start managing access control.
          </p>
          {!search && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create your first Security Group
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((set) => (
            <button
              key={set.id}
              onClick={() => navigate(`/admin/security-groups/${set.id}`)}
              className="group text-left p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Lock size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {set.name}
                    </h3>
                    {set.description && (
                      <p className="text-sm text-gray-500 truncate">{set.description}</p>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
                />
              </div>

              {/* Stats preview - placeholder for now */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>Assignments</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  <span>Pages</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 size={14} />
                  <span>Actions</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

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

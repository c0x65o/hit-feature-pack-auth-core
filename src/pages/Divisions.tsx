'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Edit2, Building2 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import {
  useDivisions,
  useDivisionMutations,
  type Division,
} from '../hooks/useOrgDimensions';

interface DivisionsProps {
  onNavigate?: (path: string) => void;
}

export function Divisions({ onNavigate }: DivisionsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select, Autocomplete } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [managerUserKey, setManagerUserKey] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: divisions, loading, error, refresh } = useDivisions();
  const { create, update, remove, loading: mutating, error: mutationError } = useDivisionMutations();

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setParentId('');
    setManagerUserKey('');
    setIsActive(true);
  };

  const handleCreate = async () => {
    try {
      await create({
        name,
        code: code || null,
        description: description || null,
        parentId: parentId || null,
        managerUserKey: managerUserKey || null,
        isActive,
      });
      setCreateModalOpen(false);
      resetForm();
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleUpdate = async () => {
    if (!selectedDivision) return;
    try {
      await update(selectedDivision.id, {
        name,
        code: code || null,
        description: description || null,
        parentId: parentId || null,
        managerUserKey: managerUserKey || null,
        isActive,
      });
      setEditModalOpen(false);
      setSelectedDivision(null);
      resetForm();
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedDivision) return;
    try {
      await remove(selectedDivision.id);
      setDeleteModalOpen(false);
      setSelectedDivision(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const openEditModal = (division: Division) => {
    setSelectedDivision(division);
    setName(division.name);
    setCode(division.code || '');
    setDescription(division.description || '');
    setParentId(division.parentId || '');
    setManagerUserKey(division.managerUserKey || '');
    setIsActive(division.isActive);
    setEditModalOpen(true);
  };

  const openDeleteModal = (division: Division) => {
    setSelectedDivision(division);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <Page title="Divisions">
        <Card>
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Divisions">
        <Alert variant="error" title="Error">
          Failed to load divisions: {error.message}
        </Alert>
      </Page>
    );
  }

  // Build parent options (exclude current division if editing)
  const parentOptions = [
    { value: '', label: '(No parent)' },
    ...divisions
      .filter((d) => !selectedDivision || d.id !== selectedDivision.id)
      .map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <Page
      title="Divisions"
      actions={
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Division
        </Button>
      }
    >
      {mutationError && (
        <Alert variant="error" title="Error" className="mb-4">
          {mutationError.message}
        </Alert>
      )}

      <Card>
        <DataTable
          data={divisions}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (_value: unknown, row: Division) => (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{row.name}</span>
                </div>
              ),
            },
            {
              key: 'code',
              label: 'Code',
              render: (_value: unknown, row: Division) => row.code || '-',
            },
            {
              key: 'managerUserKey',
              label: 'Manager',
              render: (_value: unknown, row: Division) => row.managerUserKey || '-',
            },
            {
              key: 'isActive',
              label: 'Status',
              render: (_value: unknown, row: Division) => (
                <Badge variant={row.isActive ? 'success' : 'secondary'}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (_value: unknown, row: Division) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              label: '',
              render: (_value: unknown, row: Division) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(row)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(row)}
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              ),
            },
          ]}
          emptyMessage="No divisions found. Create your first division to get started."
        />
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Create Division"
        description="Create a new organizational division"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., North America"
            required
          />
          <Input
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="e.g., NA"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={3}
          />
          <Select
            label="Parent Division"
            value={parentId}
            onChange={setParentId}
            options={parentOptions}
          />
          <Autocomplete
            label="Manager"
            placeholder="Search users…"
            value={managerUserKey}
            onChange={setManagerUserKey}
            minQueryLength={2}
            debounceMs={200}
            limit={10}
            emptyMessage="No users found"
            searchingMessage="Searching…"
            clearable
            onSearch={async (query: string, lim: number) => {
              const params = new URLSearchParams();
              params.set('search', query);
              params.set('pageSize', String(lim));
              const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
              if (!res.ok) return [];
              const json = await res.json().catch(() => ({}));
              const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
              return items.slice(0, lim).map((u: any) => ({
                value: String(u.email || ''),
                label: String(u.name || u.email || ''),
                description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
              }));
            }}
            resolveValue={async (email: string) => {
              if (!email) return null;
              const params = new URLSearchParams();
              params.set('id', email);
              params.set('pageSize', '1');
              const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
              if (!res.ok) return null;
              const json = await res.json().catch(() => ({}));
              const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
              const u = items[0];
              if (!u) return null;
              return {
                value: String(u.email || ''),
                label: String(u.name || u.email || ''),
                description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
              };
            }}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name || mutating}>
              {mutating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedDivision(null);
          resetForm();
        }}
        title="Edit Division"
        description="Update division details"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., North America"
            required
          />
          <Input
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="e.g., NA"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={3}
          />
          <Select
            label="Parent Division"
            value={parentId}
            onChange={setParentId}
            options={parentOptions}
          />
          <Autocomplete
            label="Manager"
            placeholder="Search users…"
            value={managerUserKey}
            onChange={setManagerUserKey}
            minQueryLength={2}
            debounceMs={200}
            limit={10}
            emptyMessage="No users found"
            searchingMessage="Searching…"
            clearable
            onSearch={async (query: string, lim: number) => {
              const params = new URLSearchParams();
              params.set('search', query);
              params.set('pageSize', String(lim));
              const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
              if (!res.ok) return [];
              const json = await res.json().catch(() => ({}));
              const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
              return items.slice(0, lim).map((u: any) => ({
                value: String(u.email || ''),
                label: String(u.name || u.email || ''),
                description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
              }));
            }}
            resolveValue={async (email: string) => {
              if (!email) return null;
              const params = new URLSearchParams();
              params.set('id', email);
              params.set('pageSize', '1');
              const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
              if (!res.ok) return null;
              const json = await res.json().catch(() => ({}));
              const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
              const u = items[0];
              if (!u) return null;
              return {
                value: String(u.email || ''),
                label: String(u.name || u.email || ''),
                description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
              };
            }}
          />
          <Select
            label="Status"
            value={isActive ? 'true' : 'false'}
            onChange={(v: string) => setIsActive(v === 'true')}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedDivision(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!name || mutating}>
              {mutating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedDivision(null);
        }}
        title="Delete Division"
        description={`Are you sure you want to delete "${selectedDivision?.name}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setSelectedDivision(null); }}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={mutating}>
            {mutating ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </Page>
  );
}

export default Divisions;

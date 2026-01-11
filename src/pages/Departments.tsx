'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Edit2, Network } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import {
  useDepartments,
  useDepartmentMutations,
  type Department,
} from '../hooks/useOrgDimensions';

interface DepartmentsProps {
  onNavigate?: (path: string) => void;
}

export function Departments({ onNavigate }: DepartmentsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select, Autocomplete } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [managerUserKey, setManagerUserKey] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: departments, loading, error, refresh } = useDepartments();
  const { create, update, remove, loading: mutating, error: mutationError } = useDepartmentMutations();

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
    if (!selectedDepartment) return;
    try {
      await update(selectedDepartment.id, {
        name,
        code: code || null,
        description: description || null,
        parentId: parentId || null,
        managerUserKey: managerUserKey || null,
        isActive,
      });
      setEditModalOpen(false);
      setSelectedDepartment(null);
      resetForm();
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    try {
      await remove(selectedDepartment.id);
      setDeleteModalOpen(false);
      setSelectedDepartment(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setName(department.name);
    setCode(department.code || '');
    setDescription(department.description || '');
    setParentId(department.parentId || '');
    setManagerUserKey(department.managerUserKey || '');
    setIsActive(department.isActive);
    setEditModalOpen(true);
  };

  const openDeleteModal = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <Page title="Departments">
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
      <Page title="Departments">
        <Alert variant="error" title="Error">
          Failed to load departments: {error.message}
        </Alert>
      </Page>
    );
  }

  // Build parent department options (exclude current department if editing)
  const parentOptions = [
    { value: '', label: '(No parent)' },
    ...departments
      .filter((d) => !selectedDepartment || d.id !== selectedDepartment.id)
      .map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <Page
      title="Departments"
      actions={
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Department
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
          data={departments}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (_value: unknown, row: Department) => (
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{row.name}</span>
                </div>
              ),
            },
            {
              key: 'code',
              label: 'Code',
              render: (_value: unknown, row: Department) => row.code || '-',
            },
            {
              key: 'managerUserKey',
              label: 'Manager',
              render: (_value: unknown, row: Department) => row.managerUserKey || '-',
            },
            {
              key: 'isActive',
              label: 'Status',
              render: (_value: unknown, row: Department) => (
                <Badge variant={row.isActive ? 'success' : 'secondary'}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (_value: unknown, row: Department) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              label: '',
              render: (_value: unknown, row: Department) => (
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
          emptyMessage="No departments found. Create your first department to get started."
        />
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Create Department"
        description="Create a new organizational department"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., Engineering"
            required
          />
          <Input
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="e.g., ENG"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={3}
          />
          <Select
            label="Parent Department"
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
          setSelectedDepartment(null);
          resetForm();
        }}
        title="Edit Department"
        description="Update department details"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., Engineering"
            required
          />
          <Input
            label="Code"
            value={code}
            onChange={setCode}
            placeholder="e.g., ENG"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={3}
          />
          <Select
            label="Parent Department"
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
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedDepartment(null); resetForm(); }}>
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
          setSelectedDepartment(null);
        }}
        title="Delete Department"
        description={`Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setSelectedDepartment(null); }}>
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

export default Departments;

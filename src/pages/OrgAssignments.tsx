'use client';

import React, { useState } from 'react';
import { Trash2, Plus, UserCog } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import {
  useUserOrgAssignments,
  useUserOrgAssignmentMutations,
  useDivisions,
  useDepartments,
  useLocations,
  type UserOrgAssignment,
} from '../hooks/useOrgDimensions';
import { useUsers } from '../hooks/useAuthAdmin';

interface OrgAssignmentsProps {
  onNavigate?: (path: string) => void;
}

export function OrgAssignments({ onNavigate }: OrgAssignmentsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner, Select } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<UserOrgAssignment | null>(null);

  // Filters
  const [filterUserKey, setFilterUserKey] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('');

  // Form state
  const [userKey, setUserKey] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [role, setRole] = useState('');

  const { data: assignments, loading, error, refresh } = useUserOrgAssignments({
    userKey: filterUserKey || undefined,
    divisionId: filterDivisionId || undefined,
  });
  const { data: divisions } = useDivisions();
  const { data: departments } = useDepartments();
  const { data: locations } = useLocations();
  const { create, remove, loading: mutating, error: mutationError } = useUserOrgAssignmentMutations();
  const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });

  const resetForm = () => {
    setUserKey('');
    setDivisionId('');
    setDepartmentId('');
    setLocationId('');
    setIsPrimary(false);
    setRole('');
  };

  const handleCreate = async () => {
    try {
      await create({
        userKey,
        divisionId: divisionId || null,
        departmentId: departmentId || null,
        locationId: locationId || null,
        isPrimary,
        role: role || null,
      });
      setCreateModalOpen(false);
      resetForm();
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    try {
      await remove(selectedAssignment.id);
      setDeleteModalOpen(false);
      setSelectedAssignment(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const openDeleteModal = (assignment: UserOrgAssignment) => {
    setSelectedAssignment(assignment);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <Page title="Org Assignments">
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
      <Page title="Org Assignments">
        <Alert variant="error" title="Error">
          Failed to load assignments: {error.message}
        </Alert>
      </Page>
    );
  }

  // Build user options
  const userOptions = [
    { value: '', label: 'Select a user' },
    ...(allUsers?.items || []).map((u) => ({
      value: u.email,
      label: u.email,
    })),
  ];

  // Build division options
  const divisionOptions = [
    { value: '', label: '(No division)' },
    ...divisions.map((d) => ({ value: d.id, label: d.name })),
  ];

  // Build department options (standalone - no division filtering)
  const departmentOptions = [
    { value: '', label: '(No department)' },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  // Build location options (standalone - same as divisions)
  const locationOptions = [
    { value: '', label: '(No location)' },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  // Role options
  const roleOptions = [
    { value: '', label: '(No role)' },
    { value: 'member', label: 'Member' },
    { value: 'lead', label: 'Lead' },
    { value: 'manager', label: 'Manager' },
  ];

  return (
    <Page
      title="Org Assignments"
      actions={
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      }
    >
      {mutationError && (
        <Alert variant="error" title="Error" className="mb-4">
          {mutationError.message}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Select
              label="Filter by User"
              value={filterUserKey}
              onChange={(v) => {
                setFilterUserKey(v);
                refresh();
              }}
              options={[{ value: '', label: 'All users' }, ...userOptions.slice(1)]}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Filter by Division"
              value={filterDivisionId}
              onChange={(v) => {
                setFilterDivisionId(v);
                refresh();
              }}
              options={[{ value: '', label: 'All divisions' }, ...divisionOptions.slice(1)]}
            />
          </div>
        </div>
      </Card>

      <Card>
        <DataTable
          data={assignments}
          columns={[
            {
              key: 'userKey',
              label: 'User',
              render: (_value, row: UserOrgAssignment) => (
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{row.userKey}</span>
                </div>
              ),
            },
            {
              key: 'divisionName',
              label: 'Division',
              render: (_value, row: UserOrgAssignment) => row.divisionName || '-',
            },
            {
              key: 'departmentName',
              label: 'Department',
              render: (_value, row: UserOrgAssignment) => row.departmentName || '-',
            },
            {
              key: 'locationName',
              label: 'Location',
              render: (_value, row: UserOrgAssignment) => row.locationName || (row.locationId ? row.locationId.slice(0, 8) + '...' : '-'),
            },
            {
              key: 'role',
              label: 'Role',
              render: (_value, row: UserOrgAssignment) => row.role || '-',
            },
            {
              key: 'isPrimary',
              label: 'Primary',
              render: (_value, row: UserOrgAssignment) => (
                <Badge variant={row.isPrimary ? 'success' : 'secondary'}>
                  {row.isPrimary ? 'Yes' : 'No'}
                </Badge>
              ),
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (_value, row: UserOrgAssignment) => formatDate(row.createdAt),
            },
            {
              key: 'actions',
              label: '',
              render: (_value, row: UserOrgAssignment) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteModal(row)}
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              ),
            },
          ]}
          emptyMessage="No assignments found. Create your first org assignment to get started."
        />
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Create Org Assignment"
        description="Assign a user to organizational units"
      >
        <div className="space-y-4">
          <Select
            label="User"
            value={userKey}
            onChange={setUserKey}
            options={userOptions}
            required
          />
          <Select
            label="Division"
            value={divisionId}
            onChange={setDivisionId}
            options={divisionOptions}
          />
          <Select
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={departmentOptions}
          />
          <Select
            label="Location"
            value={locationId}
            onChange={setLocationId}
            options={locationOptions}
          />
          <Select
            label="Role"
            value={role}
            onChange={setRole}
            options={roleOptions}
          />
          <Select
            label="Primary Assignment"
            value={isPrimary ? 'true' : 'false'}
            onChange={(v) => setIsPrimary(v === 'true')}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes (replaces existing primary if any)' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setCreateModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!userKey || (!divisionId && !departmentId && !locationId) || mutating}
            >
              {mutating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedAssignment(null);
        }}
        title="Delete Assignment"
        description={`Are you sure you want to remove this org assignment for "${selectedAssignment?.userKey}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setSelectedAssignment(null); }}>
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

export default OrgAssignments;

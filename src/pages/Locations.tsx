'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Edit2, MapPin } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import {
  useLocations,
  useLocationMutations,
  useLocationTypes,
  type Location,
} from '../hooks/useOrgDimensions';

interface LocationsProps {
  onNavigate?: (path: string) => void;
}

export function Locations({ onNavigate }: LocationsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select, Autocomplete } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [parentId, setParentId] = useState('');
  const [locationTypeId, setLocationTypeId] = useState('');
  const [managerUserKey, setManagerUserKey] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const { data: locations, loading, error, refresh } = useLocations();
  const { data: locationTypes } = useLocationTypes();
  const { create, update, remove, loading: mutating, error: mutationError } = useLocationMutations();

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setAddress('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
    setParentId('');
    setLocationTypeId('');
    setManagerUserKey('');
    setIsPrimary(false);
    setIsActive(true);
  };

  const handleCreate = async () => {
    try {
      await create({
        name,
        code: code || null,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        parentId: parentId || null,
        locationTypeId: locationTypeId || null,
        managerUserKey: managerUserKey || null,
        isPrimary,
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
    if (!selectedLocation) return;
    try {
      await update(selectedLocation.id, {
        name,
        code: code || null,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        parentId: parentId || null,
        locationTypeId: locationTypeId || null,
        managerUserKey: managerUserKey || null,
        isPrimary,
        isActive,
      });
      setEditModalOpen(false);
      setSelectedLocation(null);
      resetForm();
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;
    try {
      await remove(selectedLocation.id);
      setDeleteModalOpen(false);
      setSelectedLocation(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const openEditModal = (location: Location) => {
    setSelectedLocation(location);
    setName(location.name);
    setCode(location.code || '');
    setDescription(location.description || '');
    setAddress(location.address || '');
    setCity(location.city || '');
    setState(location.state || '');
    setPostalCode(location.postalCode || '');
    setCountry(location.country || '');
    setParentId(location.parentId || '');
    setLocationTypeId(location.locationTypeId || '');
    setManagerUserKey(location.managerUserKey || '');
    setIsPrimary(location.isPrimary);
    setIsActive(location.isActive);
    setEditModalOpen(true);
  };

  const openDeleteModal = (location: Location) => {
    setSelectedLocation(location);
    setDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <Page title="Locations">
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
      <Page title="Locations">
        <Alert variant="error" title="Error">
          Failed to load locations: {error.message}
        </Alert>
      </Page>
    );
  }

  // Build parent options (exclude current location if editing)
  const parentOptions = [
    { value: '', label: '(No parent)' },
    ...locations
      .filter((l) => !selectedLocation || l.id !== selectedLocation.id)
      .map((l) => ({ value: l.id, label: l.name })),
  ];

  // Build type options
  const typeOptions = [
    { value: '', label: '(No type)' },
    ...locationTypes.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <Page
      title="Locations"
      actions={
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Location
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
          data={locations}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (_value: unknown, row: Location) => (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{row.name}</span>
                  {row.isPrimary && (
                    <Badge variant="success" className="ml-1">HQ</Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'code',
              label: 'Code',
              render: (_value: unknown, row: Location) => row.code || '-',
            },
            {
              key: 'locationTypeName',
              label: 'Type',
              render: (_value: unknown, row: Location) => row.locationTypeName || '-',
            },
            {
              key: 'city',
              label: 'City',
              render: (_value: unknown, row: Location) => row.city || '-',
            },
            {
              key: 'managerUserKey',
              label: 'Manager',
              render: (_value: unknown, row: Location) => row.managerUserKey || '-',
            },
            {
              key: 'isActive',
              label: 'Status',
              render: (_value: unknown, row: Location) => (
                <Badge variant={row.isActive ? 'success' : 'secondary'}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (_value: unknown, row: Location) => (
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
          emptyMessage="No locations found. Create your first location to get started."
        />
      </Card>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetForm();
        }}
        title="Create Location"
        description="Create a new physical or virtual location"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., NYC Office"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              value={code}
              onChange={setCode}
              placeholder="e.g., NYC"
            />
            <Select
              label="Type"
              value={locationTypeId}
              onChange={setLocationTypeId}
              options={typeOptions}
            />
          </div>
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={2}
          />
          <Input
            label="Address"
            value={address}
            onChange={setAddress}
            placeholder="Street address"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={city} onChange={setCity} />
            <Input label="State" value={state} onChange={setState} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Postal Code" value={postalCode} onChange={setPostalCode} />
            <Input label="Country" value={country} onChange={setCountry} />
          </div>
          <Select
            label="Parent Location"
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
            label="Primary/HQ"
            value={isPrimary ? 'true' : 'false'}
            onChange={(v: string) => setIsPrimary(v === 'true')}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes (Headquarters)' },
            ]}
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
          setSelectedLocation(null);
          resetForm();
        }}
        title="Edit Location"
        description="Update location details"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <Input
            label="Name"
            value={name}
            onChange={setName}
            placeholder="e.g., NYC Office"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              value={code}
              onChange={setCode}
              placeholder="e.g., NYC"
            />
            <Select
              label="Type"
              value={locationTypeId}
              onChange={setLocationTypeId}
              options={typeOptions}
            />
          </div>
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            rows={2}
          />
          <Input
            label="Address"
            value={address}
            onChange={setAddress}
            placeholder="Street address"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={city} onChange={setCity} />
            <Input label="State" value={state} onChange={setState} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Postal Code" value={postalCode} onChange={setPostalCode} />
            <Input label="Country" value={country} onChange={setCountry} />
          </div>
          <Select
            label="Parent Location"
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
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Primary/HQ"
              value={isPrimary ? 'true' : 'false'}
              onChange={(v: string) => setIsPrimary(v === 'true')}
              options={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes (Headquarters)' },
              ]}
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
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedLocation(null); resetForm(); }}>
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
          setSelectedLocation(null);
        }}
        title="Delete Location"
        description={`Are you sure you want to delete "${selectedLocation?.name}"? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setSelectedLocation(null); }}>
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

export default Locations;

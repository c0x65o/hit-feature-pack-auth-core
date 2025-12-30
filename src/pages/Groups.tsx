'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Users, UserPlus, UserMinus, Edit2 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import {
  useGroups,
  useGroupUsers,
  useGroupMutations,
  useUsers,
  useAuthFeatures,
  useSegments,
  type Group,
  type UserGroup,
} from '../hooks/useAuthAdmin';

interface GroupsProps {
  onNavigate?: (path: string) => void;
}

export function Groups({ onNavigate }: GroupsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [manageUsersModalOpen, setManageUsersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupKind, setGroupKind] = useState<'static' | 'dynamic'>('static');
  const [segmentKey, setSegmentKey] = useState<string>('');

  const { data: groups, loading, error, refresh } = useGroups();
  const { createGroup, updateGroup, deleteGroup, addUserToGroup, removeUserFromGroup, loading: mutating } =
    useGroupMutations();
  const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
  const { data: groupUsers, refresh: refreshGroupUsers } = useGroupUsers(selectedGroup?.id || null);
  const { data: authFeatures } = useAuthFeatures();
  const dynamicGroupsEnabled = authFeatures?.dynamic_groups_enabled === true;
  const { data: userSegments, loading: loadingUserSegments } = useSegments({ enabled: dynamicGroupsEnabled, entityKind: 'user' });

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleCreateGroup = async () => {
    try {
      const metadata: Record<string, unknown> | undefined = dynamicGroupsEnabled
        ? {
            kind: groupKind,
            ...(groupKind === 'dynamic' ? { segment_key: segmentKey } : {}),
          }
        : undefined;
      await createGroup({
        name: groupName,
        description: groupDescription || null,
        ...(metadata ? { metadata } : {}),
      });
      setCreateModalOpen(false);
      setGroupName('');
      setGroupDescription('');
      setGroupKind('static');
      setSegmentKey('');
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;
    try {
      const baseMeta = selectedGroup.metadata && typeof selectedGroup.metadata === 'object' ? selectedGroup.metadata : {};
      const nextMeta: Record<string, unknown> = { ...(baseMeta as any) };
      if (dynamicGroupsEnabled) {
        nextMeta.kind = groupKind;
        if (groupKind === 'dynamic') {
          nextMeta.segment_key = segmentKey;
        } else {
          delete nextMeta.segment_key;
        }
      }
      await updateGroup(selectedGroup.id, {
        name: groupName,
        description: groupDescription || null,
        ...(dynamicGroupsEnabled ? { metadata: nextMeta } : {}),
      });
      setEditModalOpen(false);
      setSelectedGroup(null);
      setGroupName('');
      setGroupDescription('');
      setGroupKind('static');
      setSegmentKey('');
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    try {
      await deleteGroup(selectedGroup.id);
      setDeleteModalOpen(false);
      setSelectedGroup(null);
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleAddUser = async (userEmail: string) => {
    if (!selectedGroup) return;
    try {
      await addUserToGroup(selectedGroup.id, userEmail);
      await refreshGroupUsers();
    } catch {
      // Error handled by hook
    }
  };

  const handleRemoveUser = async (userEmail: string) => {
    if (!selectedGroup) return;
    try {
      await removeUserFromGroup(selectedGroup.id, userEmail);
      await refreshGroupUsers();
    } catch {
      // Error handled by hook
    }
  };

  const openEditModal = (group: Group) => {
    const meta = (group.metadata && typeof group.metadata === 'object') ? (group.metadata as any) : {};
    const kind = typeof meta?.kind === 'string' ? String(meta.kind).toLowerCase() : 'static';
    const sk = typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '';
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupKind(dynamicGroupsEnabled && kind === 'dynamic' ? 'dynamic' : 'static');
    setSegmentKey(sk);
    setEditModalOpen(true);
  };

  const openManageUsersModal = (group: Group) => {
    setSelectedGroup(group);
    setManageUsersModalOpen(true);
  };

  const openDeleteModal = (group: Group) => {
    setSelectedGroup(group);
    setDeleteModalOpen(true);
  };

  // Get users not in the selected group
  const availableUsers = allUsers?.items?.filter(
    (user) => !groupUsers?.some((ug) => ug.user_email === user.email)
  ) || [];

  const selectedGroupMeta = selectedGroup?.metadata && typeof selectedGroup.metadata === 'object'
    ? (selectedGroup.metadata as any)
    : {};
  const selectedGroupIsDynamic = dynamicGroupsEnabled && String(selectedGroupMeta?.kind || '').toLowerCase() === 'dynamic';
  const selectedGroupSegmentKey = selectedGroupIsDynamic && typeof selectedGroupMeta?.segment_key === 'string'
    ? String(selectedGroupMeta.segment_key)
    : '';
  const selectedGroupSegmentLabel = selectedGroupSegmentKey
    ? (userSegments || [])?.find((s) => s.key === selectedGroupSegmentKey)?.label || selectedGroupSegmentKey
    : '';

  return (
    <Page
      title="Groups"
      description="Manage user groups and memberships"
      actions={
        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Group
        </Button>
      }
    >
      {/* Error */}
      {error && (
        <Alert variant="error" title="Error loading groups">
          {error.message}
        </Alert>
      )}

      {/* Groups Table */}
      <Card>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Group Name',
              sortable: true,
              render: (_: unknown, row: Record<string, unknown>) => (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="font-medium">{String(row.name)}</span>
                </div>
              ),
            },
            ...(dynamicGroupsEnabled ? ([
              {
                key: 'kind',
                label: 'Type',
                sortable: false,
                render: (_value: unknown, row: Record<string, unknown>) => {
                  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
                  const k = String((meta as Record<string, unknown>)?.kind || 'static').toLowerCase();
                  const isDyn = k === 'dynamic';
                  return (
                    <Badge variant={isDyn ? 'info' : 'default'}>
                      {isDyn ? 'Dynamic' : 'Static'}
                    </Badge>
                  );
                },
              },
            ] as any) : []),
            {
              key: 'description',
              label: 'Description',
              render: (value: unknown) => (
                <span className="text-gray-500 dark:text-gray-400">
                  {value ? String(value) : '—'}
                </span>
              ),
            },
            {
              key: 'user_count',
              label: 'Members',
              sortable: true,
              render: (value: unknown) => (
                <Badge variant="default">
                  <Users size={12} className="mr-1" />
                  {String(value)} {Number(value) === 1 ? 'user' : 'users'}
                </Badge>
              ),
            },
            {
              key: 'created_at',
              label: 'Created',
              sortable: true,
              render: (value: unknown) => formatDate(value as string),
            },
            {
              key: 'actions',
              label: '',
              align: 'right' as const,
              sortable: false,
              hideable: false,
              render: (_: unknown, row: Record<string, unknown>) => {
                const group = row as unknown as Group;
                const meta = group?.metadata && typeof group.metadata === 'object' ? (group.metadata as any) : {};
                const isDynamic = dynamicGroupsEnabled && String(meta?.kind || '').toLowerCase() === 'dynamic';
                return (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openManageUsersModal(group)}
                      title="Manage users"
                      disabled={isDynamic}
                    >
                      <UserPlus size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(group)}
                      title="Edit group"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(group)}
                      title="Delete group"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                );
              },
            },
          ]}
          data={groups || []}
          emptyMessage="No groups found. Create your first group to get started."
          loading={loading}
          searchable
          exportable
          showColumnVisibility
          onRefresh={refresh}
          refreshing={loading}
          tableId="admin.groups"
        />
      </Card>

      {/* Create Group Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Group"
        description={dynamicGroupsEnabled ? "Create a new group (static or dynamic)" : "Create a new user group"}
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={groupName}
            onChange={setGroupName}
            placeholder="e.g., Marketing Team"
            required
          />
          <TextArea
            label="Description"
            value={groupDescription}
            onChange={setGroupDescription}
            placeholder="Optional description for this group"
            rows={3}
          />
          {dynamicGroupsEnabled && (
            <>
              <Select
                label="Group Type"
                value={groupKind}
                onChange={(v: string) => setGroupKind(v === 'dynamic' ? 'dynamic' : 'static')}
                options={[
                  { value: 'static', label: 'Static (manual members)' },
                  { value: 'dynamic', label: 'Dynamic (computed by segment)' },
                ]}
              />
              {groupKind === 'dynamic' && (
                <Select
                  label="Segment"
                  value={segmentKey}
                  onChange={(v: string) => setSegmentKey(v)}
                  placeholder={loadingUserSegments ? 'Loading segments...' : 'Select a segment'}
                  options={(userSegments || []).filter((s) => s.isActive).map((s) => ({
                    value: s.key,
                    label: s.label,
                  }))}
                />
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              loading={mutating}
              disabled={!groupName.trim() || (dynamicGroupsEnabled && groupKind === 'dynamic' && !segmentKey)}
            >
              Create Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedGroup(null);
          setGroupName('');
          setGroupDescription('');
          setGroupKind('static');
          setSegmentKey('');
        }}
        title="Edit Group"
        description="Update group details"
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={groupName}
            onChange={setGroupName}
            placeholder="e.g., Marketing Team"
            required
          />
          <TextArea
            label="Description"
            value={groupDescription}
            onChange={setGroupDescription}
            placeholder="Optional description for this group"
            rows={3}
          />
          {dynamicGroupsEnabled && (
            <>
              <Select
                label="Group Type"
                value={groupKind}
                onChange={(v: string) => setGroupKind(v === 'dynamic' ? 'dynamic' : 'static')}
                options={[
                  { value: 'static', label: 'Static (manual members)' },
                  { value: 'dynamic', label: 'Dynamic (computed by segment)' },
                ]}
              />
              {groupKind === 'dynamic' && (
                <Select
                  label="Segment"
                  value={segmentKey}
                  onChange={(v: string) => setSegmentKey(v)}
                  placeholder={loadingUserSegments ? 'Loading segments...' : 'Select a segment'}
                  options={(userSegments || []).filter((s) => s.isActive).map((s) => ({
                    value: s.key,
                    label: s.label,
                  }))}
                />
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedGroup(null);
                setGroupName('');
                setGroupDescription('');
                setGroupKind('static');
                setSegmentKey('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditGroup}
              loading={mutating}
              disabled={!groupName.trim() || (dynamicGroupsEnabled && groupKind === 'dynamic' && !segmentKey)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedGroup(null);
        }}
        title="Delete Group"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete the group{' '}
            <strong className="text-gray-900 dark:text-gray-100">{selectedGroup?.name}</strong>?
            {selectedGroup && selectedGroup.user_count > 0 && (
              <span className="block mt-2 text-sm text-yellow-500">
                This group has {selectedGroup.user_count} member{selectedGroup.user_count === 1 ? '' : 's'}.
                They will be removed from this group.
              </span>
            )}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedGroup(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteGroup} loading={mutating}>
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Users Modal */}
      <Modal
        open={manageUsersModalOpen}
        onClose={() => {
          setManageUsersModalOpen(false);
          setSelectedGroup(null);
        }}
        title={`Manage Users - ${selectedGroup?.name}`}
        description={selectedGroupIsDynamic ? "This is a dynamic group; membership is computed by a segment." : "Add or remove users from this group"}
        size="lg"
      >
        <div className="space-y-6">
          {selectedGroupIsDynamic && (
            <Alert
              variant="info"
              title="Dynamic Group"
            >
              Membership is computed from <strong>{selectedGroupSegmentLabel}</strong>. You can’t add or remove users manually.
            </Alert>
          )}
          {/* Current Members */}
          <div>
            <h3 className="text-sm font-medium mb-3">Current Members ({groupUsers?.length || 0})</h3>
            {groupUsers && groupUsers.length > 0 ? (
              <div className="space-y-2">
                {groupUsers.map((ug: UserGroup) => (
                  <div
                    key={ug.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm">{ug.user_email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(ug.user_email)}
                      loading={mutating}
                      disabled={selectedGroupIsDynamic}
                    >
                      <UserMinus size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No members in this group</p>
            )}
          </div>

          {/* Add Users */}
          {!selectedGroupIsDynamic && availableUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Add Users</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddUser(user.email)}
                      loading={mutating}
                    >
                      <UserPlus size={14} className="text-green-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedGroupIsDynamic && availableUsers.length === 0 && groupUsers && groupUsers.length > 0 && (
            <p className="text-sm text-gray-500">All users are already in this group</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setManageUsersModalOpen(false);
                setSelectedGroup(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

export default Groups;



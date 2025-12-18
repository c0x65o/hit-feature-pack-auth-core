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
  type Group,
  type UserGroup,
} from '../hooks/useAuthAdmin';

interface GroupsProps {
  onNavigate?: (path: string) => void;
}

export function Groups({ onNavigate }: GroupsProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner } = useUi();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [manageUsersModalOpen, setManageUsersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const { data: groups, loading, error, refresh } = useGroups();
  const { createGroup, updateGroup, deleteGroup, addUserToGroup, removeUserFromGroup, loading: mutating } =
    useGroupMutations();
  const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
  const { data: groupUsers, refresh: refreshGroupUsers } = useGroupUsers(selectedGroup?.id || null);

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleCreateGroup = async () => {
    try {
      await createGroup({
        name: groupName,
        description: groupDescription || null,
      });
      setCreateModalOpen(false);
      setGroupName('');
      setGroupDescription('');
      refresh();
    } catch {
      // Error handled by hook
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;
    try {
      await updateGroup(selectedGroup.id, {
        name: groupName,
        description: groupDescription || null,
      });
      setEditModalOpen(false);
      setSelectedGroup(null);
      setGroupName('');
      setGroupDescription('');
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
      refreshGroupUsers();
    } catch {
      // Error handled by hook
    }
  };

  const handleRemoveUser = async (userEmail: string) => {
    if (!selectedGroup) return;
    try {
      await removeUserFromGroup(selectedGroup.id, userEmail);
      refreshGroupUsers();
    } catch {
      // Error handled by hook
    }
  };

  const openEditModal = (group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
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
              render: (_, row) => (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="font-medium">{String(row.name)}</span>
                </div>
              ),
            },
            {
              key: 'description',
              label: 'Description',
              render: (value) => (
                <span className="text-gray-500 dark:text-gray-400">
                  {value ? String(value) : '—'}
                </span>
              ),
            },
            {
              key: 'user_count',
              label: 'Members',
              sortable: true,
              render: (value) => (
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
              render: (value) => formatDate(value as string),
            },
            {
              key: 'actions',
              label: '',
              align: 'right' as const,
              sortable: false,
              hideable: false,
              render: (_, row) => {
                const group = row as unknown as Group;
                return (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openManageUsersModal(group)}
                      title="Manage users"
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
        />
      </Card>

      {/* Create Group Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Group"
        description="Create a new user group"
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
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              loading={mutating}
              disabled={!groupName.trim()}
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
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedGroup(null);
                setGroupName('');
                setGroupDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleEditGroup}
              loading={mutating}
              disabled={!groupName.trim()}
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
        description="Add or remove users from this group"
        size="lg"
      >
        <div className="space-y-6">
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
          {availableUsers.length > 0 && (
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

          {availableUsers.length === 0 && groupUsers && groupUsers.length > 0 && (
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



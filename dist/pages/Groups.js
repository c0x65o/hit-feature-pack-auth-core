'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, Users, UserPlus, UserMinus, Edit2 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useGroups, useGroupUsers, useGroupMutations, useUsers, useAuthFeatures, useSegments, } from '../hooks/useAuthAdmin';
export function Groups({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select } = useUi();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [manageUsersModalOpen, setManageUsersModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    // Form state
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupKind, setGroupKind] = useState('static');
    const [segmentKey, setSegmentKey] = useState('');
    const { data: groups, loading, error, refresh } = useGroups();
    const { createGroup, updateGroup, deleteGroup, addUserToGroup, removeUserFromGroup, loading: mutating } = useGroupMutations();
    const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
    const { data: groupUsers, refresh: refreshGroupUsers } = useGroupUsers(selectedGroup?.id || null);
    const { data: authFeatures } = useAuthFeatures();
    const dynamicGroupsEnabled = authFeatures?.dynamic_groups_enabled === true;
    const { data: userSegments, loading: loadingUserSegments } = useSegments({ enabled: dynamicGroupsEnabled, entityKind: 'user' });
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    const handleCreateGroup = async () => {
        try {
            const metadata = dynamicGroupsEnabled
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
        }
        catch {
            // Error handled by hook
        }
    };
    const handleEditGroup = async () => {
        if (!selectedGroup)
            return;
        try {
            const baseMeta = selectedGroup.metadata && typeof selectedGroup.metadata === 'object' ? selectedGroup.metadata : {};
            const nextMeta = { ...baseMeta };
            if (dynamicGroupsEnabled) {
                nextMeta.kind = groupKind;
                if (groupKind === 'dynamic') {
                    nextMeta.segment_key = segmentKey;
                }
                else {
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
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDeleteGroup = async () => {
        if (!selectedGroup)
            return;
        try {
            await deleteGroup(selectedGroup.id);
            setDeleteModalOpen(false);
            setSelectedGroup(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleAddUser = async (userEmail) => {
        if (!selectedGroup)
            return;
        try {
            await addUserToGroup(selectedGroup.id, userEmail);
            await refreshGroupUsers();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleRemoveUser = async (userEmail) => {
        if (!selectedGroup)
            return;
        try {
            await removeUserFromGroup(selectedGroup.id, userEmail);
            await refreshGroupUsers();
        }
        catch {
            // Error handled by hook
        }
    };
    const openEditModal = (group) => {
        const meta = (group.metadata && typeof group.metadata === 'object') ? group.metadata : {};
        const kind = typeof meta?.kind === 'string' ? String(meta.kind).toLowerCase() : 'static';
        const sk = typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '';
        setSelectedGroup(group);
        setGroupName(group.name);
        setGroupDescription(group.description || '');
        setGroupKind(dynamicGroupsEnabled && kind === 'dynamic' ? 'dynamic' : 'static');
        setSegmentKey(sk);
        setEditModalOpen(true);
    };
    const openManageUsersModal = (group) => {
        setSelectedGroup(group);
        setManageUsersModalOpen(true);
    };
    const openDeleteModal = (group) => {
        setSelectedGroup(group);
        setDeleteModalOpen(true);
    };
    // Get users not in the selected group
    const availableUsers = allUsers?.items?.filter((user) => !groupUsers?.some((ug) => ug.user_email === user.email)) || [];
    const selectedGroupMeta = selectedGroup?.metadata && typeof selectedGroup.metadata === 'object'
        ? selectedGroup.metadata
        : {};
    const selectedGroupIsDynamic = dynamicGroupsEnabled && String(selectedGroupMeta?.kind || '').toLowerCase() === 'dynamic';
    const selectedGroupSegmentKey = selectedGroupIsDynamic && typeof selectedGroupMeta?.segment_key === 'string'
        ? String(selectedGroupMeta.segment_key)
        : '';
    const selectedGroupSegmentLabel = selectedGroupSegmentKey
        ? (userSegments || [])?.find((s) => s.key === selectedGroupSegmentKey)?.label || selectedGroupSegmentKey
        : '';
    return (_jsxs(Page, { title: "Groups", description: "Manage user groups and memberships", actions: _jsxs(Button, { variant: "primary", onClick: () => setCreateModalOpen(true), children: [_jsx(Plus, { size: 16, className: "mr-2" }), "Create Group"] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading groups", children: error.message })), _jsx(Card, { children: _jsx(DataTable, { columns: [
                        {
                            key: 'name',
                            label: 'Group Name',
                            sortable: true,
                            render: (_, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { size: 16, className: "text-gray-400" }), _jsx("span", { className: "font-medium", children: String(row.name) })] })),
                        },
                        ...(dynamicGroupsEnabled ? [
                            {
                                key: 'kind',
                                label: 'Type',
                                sortable: false,
                                render: (_value, row) => {
                                    const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
                                    const k = String(meta?.kind || 'static').toLowerCase();
                                    const isDyn = k === 'dynamic';
                                    return (_jsx(Badge, { variant: isDyn ? 'info' : 'default', children: isDyn ? 'Dynamic' : 'Static' }));
                                },
                            },
                        ] : []),
                        {
                            key: 'description',
                            label: 'Description',
                            render: (value) => (_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: value ? String(value) : '—' })),
                        },
                        {
                            key: 'user_count',
                            label: 'Members',
                            sortable: true,
                            render: (value) => (_jsxs(Badge, { variant: "default", children: [_jsx(Users, { size: 12, className: "mr-1" }), String(value), " ", Number(value) === 1 ? 'user' : 'users'] })),
                        },
                        {
                            key: 'created_at',
                            label: 'Created',
                            sortable: true,
                            render: (value) => formatDate(value),
                        },
                        {
                            key: 'actions',
                            label: '',
                            align: 'right',
                            sortable: false,
                            hideable: false,
                            render: (_, row) => {
                                const group = row;
                                const meta = group?.metadata && typeof group.metadata === 'object' ? group.metadata : {};
                                const isDynamic = dynamicGroupsEnabled && String(meta?.kind || '').toLowerCase() === 'dynamic';
                                return (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openManageUsersModal(group), title: "Manage users", disabled: isDynamic, children: _jsx(UserPlus, { size: 16 }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEditModal(group), title: "Edit group", children: _jsx(Edit2, { size: 16 }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openDeleteModal(group), title: "Delete group", children: _jsx(Trash2, { size: 16, className: "text-red-500" }) })] }));
                            },
                        },
                    ], data: groups || [], emptyMessage: "No groups found. Create your first group to get started.", loading: loading, searchable: true, exportable: true, showColumnVisibility: true, onRefresh: refresh, refreshing: loading, tableId: "admin.groups" }) }), _jsx(Modal, { open: createModalOpen, onClose: () => setCreateModalOpen(false), title: "Create New Group", description: dynamicGroupsEnabled ? "Create a new group (static or dynamic)" : "Create a new user group", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Group Name", value: groupName, onChange: setGroupName, placeholder: "e.g., Marketing Team", required: true }), _jsx(TextArea, { label: "Description", value: groupDescription, onChange: setGroupDescription, placeholder: "Optional description for this group", rows: 3 }), dynamicGroupsEnabled && (_jsxs(_Fragment, { children: [_jsx(Select, { label: "Group Type", value: groupKind, onChange: (v) => setGroupKind(v === 'dynamic' ? 'dynamic' : 'static'), options: [
                                        { value: 'static', label: 'Static (manual members)' },
                                        { value: 'dynamic', label: 'Dynamic (computed by segment)' },
                                    ] }), groupKind === 'dynamic' && (_jsx(Select, { label: "Segment", value: segmentKey, onChange: (v) => setSegmentKey(v), placeholder: loadingUserSegments ? 'Loading segments...' : 'Select a segment', options: (userSegments || []).filter((s) => s.isActive).map((s) => ({
                                        value: s.key,
                                        label: s.label,
                                    })) }))] })), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleCreateGroup, loading: mutating, disabled: !groupName.trim() || (dynamicGroupsEnabled && groupKind === 'dynamic' && !segmentKey), children: "Create Group" })] })] }) }), _jsx(Modal, { open: editModalOpen, onClose: () => {
                    setEditModalOpen(false);
                    setSelectedGroup(null);
                    setGroupName('');
                    setGroupDescription('');
                    setGroupKind('static');
                    setSegmentKey('');
                }, title: "Edit Group", description: "Update group details", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Group Name", value: groupName, onChange: setGroupName, placeholder: "e.g., Marketing Team", required: true }), _jsx(TextArea, { label: "Description", value: groupDescription, onChange: setGroupDescription, placeholder: "Optional description for this group", rows: 3 }), dynamicGroupsEnabled && (_jsxs(_Fragment, { children: [_jsx(Select, { label: "Group Type", value: groupKind, onChange: (v) => setGroupKind(v === 'dynamic' ? 'dynamic' : 'static'), options: [
                                        { value: 'static', label: 'Static (manual members)' },
                                        { value: 'dynamic', label: 'Dynamic (computed by segment)' },
                                    ] }), groupKind === 'dynamic' && (_jsx(Select, { label: "Segment", value: segmentKey, onChange: (v) => setSegmentKey(v), placeholder: loadingUserSegments ? 'Loading segments...' : 'Select a segment', options: (userSegments || []).filter((s) => s.isActive).map((s) => ({
                                        value: s.key,
                                        label: s.label,
                                    })) }))] })), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                        setEditModalOpen(false);
                                        setSelectedGroup(null);
                                        setGroupName('');
                                        setGroupDescription('');
                                        setGroupKind('static');
                                        setSegmentKey('');
                                    }, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleEditGroup, loading: mutating, disabled: !groupName.trim() || (dynamicGroupsEnabled && groupKind === 'dynamic' && !segmentKey), children: "Save Changes" })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => {
                    setDeleteModalOpen(false);
                    setSelectedGroup(null);
                }, title: "Delete Group", description: "This action cannot be undone", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-gray-300", children: ["Are you sure you want to delete the group", ' ', _jsx("strong", { className: "text-gray-900 dark:text-gray-100", children: selectedGroup?.name }), "?", selectedGroup && selectedGroup.user_count > 0 && (_jsxs("span", { className: "block mt-2 text-sm text-yellow-500", children: ["This group has ", selectedGroup.user_count, " member", selectedGroup.user_count === 1 ? '' : 's', ". They will be removed from this group."] }))] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                        setDeleteModalOpen(false);
                                        setSelectedGroup(null);
                                    }, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDeleteGroup, loading: mutating, children: "Delete Group" })] })] }) }), _jsx(Modal, { open: manageUsersModalOpen, onClose: () => {
                    setManageUsersModalOpen(false);
                    setSelectedGroup(null);
                }, title: `Manage Users - ${selectedGroup?.name}`, description: selectedGroupIsDynamic ? "This is a dynamic group; membership is computed by a segment." : "Add or remove users from this group", size: "lg", children: _jsxs("div", { className: "space-y-6", children: [selectedGroupIsDynamic && (_jsxs(Alert, { variant: "info", title: "Dynamic Group", children: ["Membership is computed from ", _jsx("strong", { children: selectedGroupSegmentLabel }), ". You can\u2019t add or remove users manually."] })), _jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-medium mb-3", children: ["Current Members (", groupUsers?.length || 0, ")"] }), groupUsers && groupUsers.length > 0 ? (_jsx("div", { className: "space-y-2", children: groupUsers.map((ug) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded", children: [_jsx("span", { className: "text-sm", children: ug.user_email }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleRemoveUser(ug.user_email), loading: mutating, disabled: selectedGroupIsDynamic, children: _jsx(UserMinus, { size: 14, className: "text-red-500" }) })] }, ug.id))) })) : (_jsx("p", { className: "text-sm text-gray-500", children: "No members in this group" }))] }), !selectedGroupIsDynamic && availableUsers.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium mb-3", children: "Add Users" }), _jsx("div", { className: "space-y-2 max-h-64 overflow-y-auto", children: availableUsers.map((user) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded", children: [_jsx("span", { className: "text-sm", children: user.email }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleAddUser(user.email), loading: mutating, children: _jsx(UserPlus, { size: 14, className: "text-green-500" }) })] }, user.email))) })] })), !selectedGroupIsDynamic && availableUsers.length === 0 && groupUsers && groupUsers.length > 0 && (_jsx("p", { className: "text-sm text-gray-500", children: "All users are already in this group" })), _jsx("div", { className: "flex justify-end gap-3 pt-4 border-t", children: _jsx(Button, { variant: "ghost", onClick: () => {
                                    setManageUsersModalOpen(false);
                                    setSelectedGroup(null);
                                }, children: "Close" }) })] }) })] }));
}
export default Groups;
//# sourceMappingURL=Groups.js.map
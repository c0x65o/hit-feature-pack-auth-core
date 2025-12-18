'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, UserPlus, Lock } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useUsers, useUserMutations, useAuthAdminConfig, useProfileFields } from '../hooks/useAuthAdmin';
export function Users({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner } = useUi();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
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
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
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
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDeleteUser = async () => {
        if (!selectedUser)
            return;
        try {
            await deleteUser(selectedUser.email);
            setDeleteModalOpen(false);
            setSelectedUser(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const formatDateOrNever = (dateStr) => {
        if (!dateStr)
            return 'Never';
        return formatDate(dateStr);
    };
    return (_jsxs(Page, { title: "Users", description: "Manage user accounts", actions: _jsxs(Button, { variant: "primary", onClick: () => setCreateModalOpen(true), children: [_jsx(UserPlus, { size: 16, className: "mr-2" }), "Add User"] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading users", children: error.message })), _jsx(Card, { children: _jsx(DataTable, { columns: [
                        {
                            key: 'email',
                            label: 'Email',
                            sortable: true,
                            render: (_, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: String(row.email) }), row.locked ? _jsx(Lock, { size: 14, className: "text-red-500" }) : null] })),
                        },
                        // Add profile fields columns (first 2 fields)
                        ...(profileFieldMetadata && profileFieldMetadata.length > 0
                            ? profileFieldMetadata
                                .filter((field) => field.field_key !== 'email') // Exclude email as it's already shown
                                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                                .slice(0, 2) // Show first 2 additional fields
                                .map((field) => ({
                                key: `profile_fields.${field.field_key}`,
                                label: field.field_label,
                                render: (_, row) => {
                                    const value = row.profile_fields?.[field.field_key];
                                    return (_jsx("span", { className: "text-gray-900 dark:text-gray-100", children: value !== undefined && value !== null ? String(value) : '—' }));
                                },
                            }))
                            : []),
                        {
                            key: 'email_verified',
                            label: 'Verified',
                            render: (value) => (_jsx(Badge, { variant: value ? 'success' : 'warning', children: value ? 'Verified' : 'Pending' })),
                        },
                        ...(adminConfig?.two_factor_auth !== false
                            ? [
                                {
                                    key: 'two_factor_enabled',
                                    label: '2FA',
                                    render: (value) => (_jsx(Badge, { variant: value ? 'success' : 'default', children: value ? 'Enabled' : 'Disabled' })),
                                },
                            ]
                            : []),
                        {
                            key: 'role',
                            label: 'Role',
                            render: (value) => {
                                // Value is already a string from the API (user.get_role())
                                const userRole = (typeof value === 'string' ? value : 'user') || 'user';
                                return (_jsx(Badge, { variant: userRole === 'admin' ? 'info' : 'default', children: userRole }));
                            },
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (_, row) => {
                                const user = row;
                                const isLocked = user.locked || false;
                                return (_jsx(Badge, { variant: isLocked ? 'warning' : 'success', children: isLocked ? 'Locked' : 'Active' }));
                            },
                        },
                        {
                            key: 'created_at',
                            label: 'Created',
                            sortable: true,
                            render: (value) => formatDateOrNever(value),
                        },
                        {
                            key: 'last_login',
                            label: 'Last Login',
                            sortable: true,
                            render: (value) => formatDateOrNever(value),
                        },
                        {
                            key: 'actions',
                            label: '',
                            align: 'right',
                            sortable: false,
                            hideable: false,
                            render: (_, row) => {
                                const user = row;
                                return (_jsx("div", { className: "flex items-center justify-end gap-2", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                            setSelectedUser(user);
                                            setDeleteModalOpen(true);
                                        }, children: _jsx(Trash2, { size: 16, className: "text-red-500" }) }) }));
                            },
                        },
                    ], data: (data?.items || []).map((user) => ({
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
                    })), onRowClick: (row) => navigate(`/admin/users/${encodeURIComponent(row.email)}`), emptyMessage: "No users found", loading: loading, searchable: true, exportable: true, showColumnVisibility: true, pageSize: 25, manualPagination: true, total: data?.total, page: page, onPageChange: setPage }) }), _jsx(Modal, { open: createModalOpen, onClose: () => setCreateModalOpen(false), title: "Create New User", description: "Add a new user to the system", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Email", type: "email", value: newEmail, onChange: setNewEmail, placeholder: "user@example.com", required: true }), _jsx(Input, { label: "Initial Password", type: "password", value: newPassword, onChange: setNewPassword, placeholder: "Minimum 8 characters", required: true }), _jsx("p", { className: "text-xs text-gray-400", children: "User can change this after first login" }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleCreateUser, loading: mutating, disabled: !newEmail || !newPassword, children: "Create User" })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => setDeleteModalOpen(false), title: "Delete User", description: "This action cannot be undone", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-gray-300", children: ["Are you sure you want to delete", ' ', _jsx("strong", { className: "text-gray-900 dark:text-gray-100", children: selectedUser?.email }), "?"] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDeleteUser, loading: mutating, children: "Delete User" })] })] }) })] }));
}
export default Users;
//# sourceMappingURL=Users.js.map
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { RefreshCw, Trash2, Send, UserPlus, Clock } from 'lucide-react';
import { useUi, useAlertDialog } from '@hit/ui-kit';
import { formatDateShort } from '@hit/sdk';
import { useInvites, useInviteMutations } from '../hooks/useAuthAdmin';
export function Invites({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Select, Alert, Spinner, EmptyState, AlertDialog } = useUi();
    const alertDialog = useAlertDialog();
    const [page, setPage] = useState(1);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('user');
    const { data, loading, error, refresh } = useInvites({ page, pageSize: 25 });
    const { createInvite, resendInvite, revokeInvite, loading: mutating, error: mutationError } = useInviteMutations();
    const handleCreateInvite = async () => {
        try {
            await createInvite({ email: newEmail, role: newRole });
            setCreateModalOpen(false);
            setNewEmail('');
            setNewRole('user');
            refresh();
        }
        catch (e) {
            // Error is stored in mutationError and will be displayed in the modal
            // Don't close modal on error so user can see the error and retry
        }
    };
    const handleResendInvite = async (inviteId) => {
        const confirmed = await alertDialog.showConfirm('Resend this invitation?', {
            variant: 'info',
            title: 'Resend Invitation',
            confirmText: 'Resend',
            cancelText: 'Cancel',
        });
        if (confirmed) {
            try {
                await resendInvite(inviteId);
                await alertDialog.showAlert('Invitation resent!', {
                    variant: 'success',
                    title: 'Success',
                });
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Failed to resend invitation';
                await alertDialog.showAlert(errorMessage, {
                    variant: 'error',
                    title: 'Error',
                });
            }
        }
    };
    const handleRevokeInvite = async (inviteId) => {
        const confirmed = await alertDialog.showConfirm('Are you sure you want to revoke this invitation?', {
            variant: 'warning',
            title: 'Revoke Invitation',
            confirmText: 'Revoke',
            cancelText: 'Cancel',
        });
        if (confirmed) {
            try {
                await revokeInvite(inviteId);
                refresh();
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const isExpired = (expiresAt) => {
        return new Date(expiresAt) < new Date();
    };
    return (_jsxs(Page, { title: "Invitations", description: "Manage user invitations", actions: _jsxs("div", { className: "flex gap-3", children: [_jsxs(Button, { variant: "secondary", onClick: () => refresh(), children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] }), _jsxs(Button, { variant: "primary", onClick: () => setCreateModalOpen(true), children: [_jsx(UserPlus, { size: 16, className: "mr-2" }), "Send Invite"] })] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading invites", children: error.message })), mutationError && (_jsx(Alert, { variant: "error", title: "Error", children: mutationError.message })), _jsx(Card, { children: loading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) })) : !data?.items?.length ? (_jsx(EmptyState, { icon: _jsx(Clock, { size: 48 }), title: "No pending invitations", description: "Send an invitation to add new users", action: _jsxs(Button, { variant: "primary", onClick: () => setCreateModalOpen(true), children: [_jsx(UserPlus, { size: 16, className: "mr-2" }), "Send Invite"] }) })) : (_jsx(DataTable, { columns: [
                        {
                            key: 'email',
                            label: 'Email',
                            sortable: true,
                            render: (value) => _jsx("span", { className: "font-medium", children: value }),
                        },
                        {
                            key: 'roles',
                            label: 'Roles',
                            render: (value) => (_jsx("div", { className: "flex gap-1", children: value?.map((role) => (_jsx(Badge, { variant: role === 'admin' ? 'info' : 'default', children: role }, role))) })),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (_, row) => {
                                const expired = isExpired(row.expires_at);
                                const accepted = !!row.accepted_at;
                                return (_jsx(Badge, { variant: accepted ? 'success' : expired ? 'error' : 'warning', children: accepted ? 'Accepted' : expired ? 'Expired' : 'Pending' }));
                            },
                        },
                        {
                            key: 'expires_at',
                            label: 'Expires',
                            sortable: true,
                            render: (value) => formatDateShort(value),
                        },
                        {
                            key: 'actions',
                            label: '',
                            align: 'right',
                            sortable: false,
                            hideable: false,
                            render: (_, row) => {
                                if (row.accepted_at)
                                    return null;
                                return (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleResendInvite(row.id), disabled: mutating, children: _jsx(Send, { size: 16 }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleRevokeInvite(row.id), disabled: mutating, children: _jsx(Trash2, { size: 16, className: "text-red-500" }) })] }));
                            },
                        },
                    ], data: (data?.items || []).map((invite) => ({
                        id: invite.id,
                        email: invite.email,
                        roles: invite.roles,
                        expires_at: invite.expires_at,
                        accepted_at: invite.accepted_at,
                    })), emptyMessage: "No invitations found", loading: loading, searchable: true, exportable: true, showColumnVisibility: true, pageSize: 25 })) }), _jsx(Modal, { open: createModalOpen, onClose: () => {
                    setCreateModalOpen(false);
                    // Clear error when closing modal
                    if (mutationError) {
                        // The hook should clear error, but we can also clear it here if needed
                    }
                }, title: "Send Invitation", description: "Invite a new user to join", children: _jsxs("div", { className: "space-y-4", children: [mutationError && (_jsx(Alert, { variant: "error", title: "Failed to send invitation", children: mutationError.message })), _jsx(Input, { label: "Email", type: "email", value: newEmail, onChange: setNewEmail, placeholder: "user@example.com", required: true }), _jsx(Select, { label: "Role", options: [
                                { value: 'user', label: 'User' },
                                { value: 'admin', label: 'Admin' },
                            ], value: newRole, onChange: setNewRole }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleCreateInvite, loading: mutating, disabled: !newEmail, children: "Send Invite" })] })] }) }), _jsx(AlertDialog, { ...alertDialog.props })] }));
}
export default Invites;
//# sourceMappingURL=Invites.js.map
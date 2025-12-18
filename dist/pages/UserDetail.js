'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { ArrowLeft, Shield, Key, Lock, Unlock, Trash2, Monitor, Globe, Mail, CheckCircle, Edit2, Save, X, User, Upload, Camera, Link2, Users, } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime } from '@hit/sdk';
import { useUser, useUserSessions, useUserMutations, useSessionMutations, useAuthAdminConfig, useProfileFields, } from '../hooks/useAuthAdmin';
export function UserDetail({ email, onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Alert, Spinner, EmptyState, Select } = useUi();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [availableRoles, setAvailableRoles] = useState(['admin', 'user']);
    const [profileFields, setProfileFields] = useState({});
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [resetPasswordMethod, setResetPasswordMethod] = useState('email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
    const [resetPasswordError, setResetPasswordError] = useState(null);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const fileInputRef = React.useRef(null);
    const { user, loading, error, refresh } = useUser(email);
    const { config: authConfig } = useAuthAdminConfig();
    const { data: profileFieldMetadata, loading: fieldsLoading } = useProfileFields();
    const profileFieldsList = profileFieldMetadata || [];
    // Fetch available roles from features endpoint
    React.useEffect(() => {
        const fetchAvailableRoles = async () => {
            try {
                const response = await fetch('/features');
                const data = await response.json();
                const roles = data.features?.available_roles || ['admin', 'user'];
                setAvailableRoles(roles);
            }
            catch (e) {
                // Fallback to default roles
                setAvailableRoles(['admin', 'user']);
            }
        };
        fetchAvailableRoles();
    }, []);
    const { data: sessionsData, refresh: refreshSessions } = useUserSessions(email);
    const { deleteUser, resetPassword, resendVerification, verifyEmail, updateRoles, updateUser, uploadProfilePicture, deleteProfilePicture, lockUser, unlockUser, loading: mutating, } = useUserMutations();
    const { revokeSession, revokeAllUserSessions } = useSessionMutations();
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    const handleDeleteUser = async () => {
        try {
            await deleteUser(email);
            navigate('/admin/users');
        }
        catch {
            // Error handled by hook
        }
    };
    const handleResetPassword = async () => {
        setResetPasswordModalOpen(true);
        setResetPasswordSuccess(null);
        setResetPasswordError(null);
    };
    const handleResetPasswordSubmit = async () => {
        setResetPasswordSuccess(null);
        setResetPasswordError(null);
        if (resetPasswordMethod === 'email') {
            try {
                await resetPassword(email, true);
                setResetPasswordSuccess('Password reset email sent successfully!');
                setTimeout(() => {
                    setResetPasswordModalOpen(false);
                    setResetPasswordMethod('email');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetPasswordSuccess(null);
                }, 2000);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
                setResetPasswordError(errorMessage);
            }
        }
        else {
            // Direct password set
            if (!newPassword) {
                setResetPasswordError('Password is required');
                return;
            }
            if (newPassword !== confirmPassword) {
                setResetPasswordError('Passwords do not match');
                return;
            }
            try {
                await resetPassword(email, false, newPassword);
                setResetPasswordSuccess('Password has been reset successfully!');
                setTimeout(() => {
                    setResetPasswordModalOpen(false);
                    setResetPasswordMethod('email');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetPasswordSuccess(null);
                    refresh();
                }, 2000);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
                setResetPasswordError(errorMessage);
            }
        }
    };
    const handleResendVerification = async () => {
        if (confirm(`Resend verification email to ${email}?`)) {
            try {
                await resendVerification(email);
                alert('Verification email sent!');
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleVerifyEmail = async () => {
        if (confirm(`Mark email as verified for ${email}?`)) {
            try {
                await verifyEmail(email);
                refresh();
                alert('Email verified successfully!');
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleToggleLock = async () => {
        const action = user?.locked ? unlockUser : lockUser;
        const actionName = user?.locked ? 'unlock' : 'lock';
        if (confirm(`Are you sure you want to ${actionName} this user?`)) {
            try {
                await action(email);
                refresh();
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleSave = async () => {
        try {
            // Update role if changed
            const currentRole = user?.role || (user?.roles && user.roles.length > 0 ? user.roles[0] : 'user') || 'user';
            if (newRole && newRole !== currentRole) {
                await updateRoles(email, newRole);
            }
            // Update profile fields if changed
            const hasChanges = JSON.stringify(profileFields) !== JSON.stringify(user?.profile_fields || {});
            if (hasChanges) {
                await updateUser(email, { profile_fields: profileFields });
            }
            setIsEditing(false);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    // Initialize profile fields when user data loads
    React.useEffect(() => {
        if (user?.profile_fields) {
            setProfileFields(user.profile_fields);
        }
    }, [user?.profile_fields]);
    const handleRevokeSession = async (sessionId) => {
        if (confirm('Revoke this session?')) {
            try {
                await revokeSession(sessionId);
                refreshSessions();
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleRevokeAllSessions = async () => {
        if (confirm('Revoke all sessions for this user?')) {
            try {
                await revokeAllUserSessions(email);
                refreshSessions();
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const formatDateOrNever = (dateStr) => {
        if (!dateStr)
            return 'Never';
        return formatDateTime(dateStr);
    };
    const startEditing = () => {
        const currentRole = user?.role || (user?.roles && user.roles.length > 0 ? user.roles[0] : 'user') || 'user';
        setNewRole(currentRole);
        setProfileFields(user?.profile_fields || {});
        setIsEditing(true);
    };
    const cancelEditing = () => {
        setIsEditing(false);
        const currentRole = user?.role || (user?.roles && user.roles.length > 0 ? user.roles[0] : 'user') || 'user';
        setNewRole(currentRole);
        setProfileFields(user?.profile_fields || {});
    };
    const handlePictureUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        try {
            setUploadingPicture(true);
            await uploadProfilePicture(email, file);
            refresh();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to upload profile picture');
        }
        finally {
            setUploadingPicture(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handlePictureDelete = async () => {
        if (!confirm('Are you sure you want to delete this profile picture?')) {
            return;
        }
        try {
            setUploadingPicture(true);
            await deleteProfilePicture(email);
            refresh();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete profile picture');
        }
        finally {
            setUploadingPicture(false);
        }
    };
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };
    if (loading) {
        return (_jsx(Page, { title: "Loading...", children: _jsx(Card, { children: _jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }) }));
    }
    if (error || !user) {
        return (_jsx(Page, { title: "User Not Found", actions: _jsxs(Button, { variant: "secondary", onClick: () => navigate('/admin/users'), children: [_jsx(ArrowLeft, { size: 16, className: "mr-2" }), "Back to Users"] }), children: _jsx(Alert, { variant: "error", title: "Error", children: error?.message || 'User not found' }) }));
    }
    const breadcrumbs = [
        { label: 'Admin', href: '/admin', icon: _jsx(Shield, { size: 14 }) },
        { label: 'Users', href: '/admin/users', icon: _jsx(Users, { size: 14 }) },
        { label: user.email },
    ];
    return (_jsxs(Page, { title: user.email, description: user.locked ? 'This account is locked' : undefined, breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsx("div", { className: "flex gap-3", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", onClick: handleSave, disabled: mutating, children: [_jsx(Save, { size: 16, className: "mr-2" }), "Save"] }), _jsxs(Button, { variant: "ghost", onClick: cancelEditing, disabled: mutating, children: [_jsx(X, { size: 16, className: "mr-2" }), "Cancel"] })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: startEditing, children: [_jsx(Edit2, { size: 16, className: "mr-2" }), "Edit"] }), !user.email_verified && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: handleVerifyEmail, disabled: mutating, children: [_jsx(CheckCircle, { size: 16, className: "mr-2" }), "Verify"] }), _jsxs(Button, { variant: "secondary", onClick: handleResendVerification, disabled: mutating, children: [_jsx(Mail, { size: 16, className: "mr-2" }), "Resend Verification"] })] })), _jsxs(Button, { variant: "secondary", onClick: handleResetPassword, disabled: mutating, children: [_jsx(Key, { size: 16, className: "mr-2" }), "Reset Password"] }), _jsxs(Button, { variant: "secondary", onClick: handleToggleLock, disabled: mutating, children: [user.locked ? _jsx(Unlock, { size: 16, className: "mr-2" }) : _jsx(Lock, { size: 16, className: "mr-2" }), user.locked ? 'Unlock' : 'Lock'] }), _jsxs(Button, { variant: "danger", onClick: () => setDeleteModalOpen(true), children: [_jsx(Trash2, { size: 16, className: "mr-2" }), "Delete"] })] })) }), children: [user.oauth_providers && user.oauth_providers.length > 0 && (_jsx(Alert, { variant: "info", title: "OAuth Account Linked", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link2, { size: 16 }), _jsxs("span", { children: ["This account is linked to", ' ', _jsx("strong", { children: user.oauth_providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') }), user.oauth_providers.length === 1 ? ' account' : ' accounts', "."] })] }) })), _jsx(Card, { title: "User Details", children: isEditing ? (_jsxs("div", { className: "space-y-4", children: [profileFieldsList.length > 0 && profileFieldsList
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((fieldMeta) => {
                            const rawFieldValue = fieldMeta.field_key === 'email'
                                ? (user.email || '')
                                : (profileFields[fieldMeta.field_key]);
                            const fieldValue = typeof rawFieldValue === 'string' || typeof rawFieldValue === 'number'
                                ? String(rawFieldValue)
                                : '';
                            const isEmail = fieldMeta.field_key === 'email';
                            return (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: [fieldMeta.field_label, fieldMeta.required && _jsx("span", { className: "text-red-500 ml-1", children: "*" })] }), fieldMeta.field_type === 'int' ? (_jsx("input", { type: "number", value: fieldValue || '', onChange: (e) => setProfileFields({
                                            ...profileFields,
                                            [fieldMeta.field_key]: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                        }), className: "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: fieldMeta.default_value || '', disabled: isEmail })) : (_jsx("input", { type: isEmail ? 'email' : 'text', value: fieldValue || '', onChange: (e) => {
                                            if (!isEmail) {
                                                setProfileFields({
                                                    ...profileFields,
                                                    [fieldMeta.field_key]: e.target.value || undefined,
                                                });
                                            }
                                        }, className: "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed", placeholder: fieldMeta.default_value || '', disabled: isEmail })), isEmail && (_jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Email cannot be changed" }))] }, fieldMeta.field_key));
                        }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: "Role" }), _jsx(Select, { value: newRole, onChange: (value) => setNewRole(value), options: availableRoles.map((role) => ({
                                        value: role,
                                        label: role.charAt(0).toUpperCase() + role.slice(1),
                                    })), placeholder: "Select a role" })] })] })) : (_jsxs("div", { className: "space-y-4", children: [authConfig?.profile_picture !== false && (_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-400", children: "Profile Picture" }), _jsxs("div", { className: "flex items-center gap-3", children: [user.profile_picture_url ? (_jsx("div", { className: "relative group", children: _jsx("img", { src: user.profile_picture_url, alt: "Profile", className: "w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-700", onError: (e) => {
                                                    e.target.style.display = 'none';
                                                } }) })) : (_jsx("div", { className: "w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center", children: _jsx(User, { size: 24, className: "text-gray-400" }) })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: triggerFileInput, disabled: uploadingPicture || mutating, children: user.profile_picture_url ? (_jsxs(_Fragment, { children: [_jsx(Camera, { size: 14, className: "mr-1" }), "Change"] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { size: 14, className: "mr-1" }), "Upload"] })) }), user.profile_picture_url && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: handlePictureDelete, disabled: uploadingPicture || mutating, children: [_jsx(Trash2, { size: 14, className: "mr-1 text-red-500" }), "Delete"] }))] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handlePictureUpload, className: "hidden" })] })), profileFieldsList.length > 0 && profileFieldsList
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((fieldMeta) => {
                            const value = fieldMeta.field_key === 'email'
                                ? (user.email || '')
                                : (user.profile_fields?.[fieldMeta.field_key]);
                            return (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: fieldMeta.field_label }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: value !== undefined && value !== null ? String(value) : '—' })] }, fieldMeta.field_key));
                        }), user.oauth_providers && user.oauth_providers.length > 0 && (_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-400", children: "OAuth Providers" }), _jsx("div", { className: "flex gap-2", children: user.oauth_providers.map((provider) => (_jsxs(Badge, { variant: "info", children: [_jsx(Link2, { size: 12, className: "mr-1" }), provider.charAt(0).toUpperCase() + provider.slice(1)] }, provider))) })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Role" }), (() => {
                                    const userRole = user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : 'user') || 'user';
                                    return (_jsx(Badge, { variant: userRole === 'admin' ? 'info' : 'default', children: userRole }));
                                })()] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Verified" }), _jsx(Badge, { variant: user.email_verified ? 'success' : 'warning', children: user.email_verified ? 'Yes' : 'No' })] }), authConfig?.two_factor_auth !== false && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "2FA" }), _jsx(Badge, { variant: user.two_factor_enabled ? 'success' : 'default', children: user.two_factor_enabled ? 'Enabled' : 'Disabled' })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Status" }), _jsx(Badge, { variant: user.locked ? 'error' : 'success', children: user.locked ? 'Locked' : 'Active' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Created" }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: formatDateOrNever(user.created_at) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Last Login" }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: formatDateOrNever(user.last_login ?? null) })] })] })) }), _jsx(Card, { title: "Active Sessions", footer: sessionsData?.items?.length ? (_jsx(Button, { variant: "danger", size: "sm", onClick: handleRevokeAllSessions, children: "Revoke All Sessions" })) : undefined, children: !sessionsData?.items?.length ? (_jsx(EmptyState, { icon: _jsx(Monitor, { size: 48 }), title: "No active sessions", description: "This user has no active sessions" })) : (_jsx(DataTable, { columns: [
                        {
                            key: 'ip_address',
                            label: 'IP Address',
                            sortable: true,
                            render: (value) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Globe, { size: 16, className: "text-gray-400" }), _jsx("span", { className: "font-mono text-sm", children: value })] })),
                        },
                        {
                            key: 'created_at',
                            label: 'Started',
                            sortable: true,
                            render: (value) => formatDateOrNever(value),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: () => (_jsx(Badge, { variant: "success", children: "Active" })),
                        },
                        {
                            key: 'actions',
                            label: '',
                            align: 'right',
                            sortable: false,
                            hideable: false,
                            render: (_, row) => (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleRevokeSession(row.id), children: _jsx(Trash2, { size: 16, className: "text-red-500" }) })),
                        },
                    ], data: (sessionsData?.items || []).map((s) => ({
                        id: s.id,
                        ip_address: s.ip_address,
                        created_at: s.created_at,
                    })), emptyMessage: "No active sessions", searchable: true, exportable: true, showColumnVisibility: true, pageSize: 25 })) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => setDeleteModalOpen(false), title: "Delete User", description: "This action cannot be undone", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-gray-300", children: ["Are you sure you want to delete ", _jsx("strong", { className: "text-gray-900 dark:text-gray-100", children: user.email }), "?"] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDeleteUser, loading: mutating, children: "Delete User" })] })] }) }), _jsx(Modal, { open: resetPasswordModalOpen, onClose: () => {
                    setResetPasswordModalOpen(false);
                    setResetPasswordMethod('email');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetPasswordSuccess(null);
                    setResetPasswordError(null);
                }, title: "Reset Password", description: "Choose how to reset the password for this user", children: _jsxs("div", { className: "space-y-4", children: [resetPasswordSuccess && (_jsx(Alert, { variant: "success", title: "Success", children: resetPasswordSuccess })), resetPasswordError && (_jsx(Alert, { variant: "error", title: "Error", children: resetPasswordError })), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "radio", id: "reset-email", checked: resetPasswordMethod === 'email', onChange: () => setResetPasswordMethod('email'), className: "w-4 h-4" }), _jsxs("label", { htmlFor: "reset-email", className: "cursor-pointer", children: [_jsx("div", { className: "font-medium", children: "Send reset email" }), _jsx("div", { className: "text-sm text-gray-400", children: "Send a password reset link via email through the email provider module" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "radio", id: "reset-direct", checked: resetPasswordMethod === 'direct', onChange: () => setResetPasswordMethod('direct'), className: "w-4 h-4" }), _jsxs("label", { htmlFor: "reset-direct", className: "cursor-pointer", children: [_jsx("div", { className: "font-medium", children: "Set password directly" }), _jsx("div", { className: "text-sm text-gray-400", children: "Type in a new password to change it immediately" })] })] })] }), resetPasswordMethod === 'direct' && (_jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: "New Password" }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), className: "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Enter new password" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-400 mb-1", children: "Confirm Password" }), _jsx("input", { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Confirm new password" })] })] })), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                        setResetPasswordModalOpen(false);
                                        setResetPasswordMethod('email');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setResetPasswordSuccess(null);
                                        setResetPasswordError(null);
                                    }, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleResetPasswordSubmit, loading: mutating, children: resetPasswordMethod === 'email' ? 'Send Reset Email' : 'Set Password' })] })] }) })] }));
}
export default UserDetail;
//# sourceMappingURL=UserDetail.js.map
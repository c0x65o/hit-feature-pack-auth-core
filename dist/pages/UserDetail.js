'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { ArrowLeft, Shield, Key, Lock, Unlock, Trash2, RefreshCw, Monitor, Globe, Mail, CheckCircle, Edit2, Save, X, User, UserCheck, Upload, Camera, Link2, Users, } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { formatDateTime } from '@hit/sdk';
import { useUser, useUserSessions, useUserMutations, useSessionMutations, useAuthAdminConfig, useProfileFields, useUserEffectivePermissions, } from '../hooks/useAuthAdmin';
import { ProfilePictureCropModal } from '../components/ProfilePictureCropModal';
export function UserDetail({ email, onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Alert, Spinner, EmptyState, Select, Input, AlertDialog } = useUi();
    const alertDialog = useAlertDialog();
    const normalizeEmail = (raw) => {
        let out = String(raw || '').trim();
        // Next route params may arrive percent-encoded (sometimes double-encoded). Decode up to 2 times.
        for (let i = 0; i < 2; i++) {
            if (!/%[0-9A-Fa-f]{2}/.test(out))
                break;
            try {
                out = decodeURIComponent(out);
            }
            catch {
                break;
            }
        }
        return out;
    };
    const userEmail = normalizeEmail(email);
    // Default hidden until we confirm the backend config says it's enabled.
    const [impersonationEnabled, setImpersonationEnabled] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [availableRoles, setAvailableRoles] = useState(['admin', 'user']);
    const [profileFields, setProfileFields] = useState({});
    const [permissionsFilter, setPermissionsFilter] = useState('');
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
    const [resetPasswordMethod, setResetPasswordMethod] = useState('email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState(null);
    const [resetPasswordError, setResetPasswordError] = useState(null);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const fileInputRef = React.useRef(null);
    const { user, loading, error, refresh } = useUser(userEmail);
    const { data: effectivePerms, loading: effectivePermsLoading, error: effectivePermsError, refresh: refreshEffectivePerms, } = useUserEffectivePermissions(userEmail);
    const { config: authConfig } = useAuthAdminConfig();
    const { data: profileFieldMetadata, loading: fieldsLoading } = useProfileFields();
    const profileFieldsList = profileFieldMetadata || [];
    // Fetch available roles from features endpoint
    React.useEffect(() => {
        const fetchAvailableRoles = async () => {
            try {
                const authUrl = typeof window !== 'undefined' && window.NEXT_PUBLIC_HIT_AUTH_URL
                    ? window.NEXT_PUBLIC_HIT_AUTH_URL
                    : '/api/proxy/auth';
                const response = await fetch(`${authUrl}/features`, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                const roles = data.features?.available_roles || ['admin', 'user'];
                setAvailableRoles(roles);
                setImpersonationEnabled(Boolean(data.features?.admin_impersonation));
            }
            catch (e) {
                // Fallback to default roles
                setAvailableRoles(['admin', 'user']);
                setImpersonationEnabled(false);
            }
        };
        fetchAvailableRoles();
    }, []);
    const { data: sessionsData, refresh: refreshSessions } = useUserSessions(userEmail);
    const { deleteUser, resetPassword, resendVerification, verifyEmail, updateRoles, updateUser, uploadProfilePicture, uploadProfilePictureBase64, deleteProfilePicture, lockUser, unlockUser, startImpersonation, loading: mutating, } = useUserMutations();
    const { revokeSession, revokeAllUserSessions } = useSessionMutations();
    const [impersonating, setImpersonating] = useState(false);
    const setAuthToken = (token) => {
        if (typeof window === 'undefined')
            return;
        localStorage.setItem('hit_token', token);
        // Best-effort cookie max-age from JWT exp (falls back to 1 hour).
        let maxAge = 3600;
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                if (payload.exp) {
                    maxAge = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
                }
            }
        }
        catch {
            // Use default
        }
        document.cookie = `hit_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    };
    const navigate = (path) => {
        if (onNavigate) {
            onNavigate(path);
        }
        else if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    const handleStartImpersonation = async () => {
        const confirmed = await alertDialog.showConfirm(`Assume ${userEmail}?`, {
            title: 'Assume User',
            variant: 'warning',
        });
        if (!confirmed)
            return;
        setImpersonating(true);
        try {
            const originalToken = typeof window !== 'undefined' ? localStorage.getItem('hit_token') : null;
            if (originalToken && typeof window !== 'undefined' && !localStorage.getItem('hit_token_original')) {
                localStorage.setItem('hit_token_original', originalToken);
            }
            const res = await startImpersonation(userEmail);
            if (!res?.token) {
                throw new Error('Impersonation did not return a token');
            }
            setAuthToken(res.token);
            // Full reload so the shell rehydrates from the new token cleanly.
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
            else {
                navigate('/');
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start impersonation';
            await alertDialog.showAlert(message, { variant: 'error', title: 'Impersonation Failed' });
            // If start failed, don't leave a stale "original token" behind.
            if (typeof window !== 'undefined') {
                localStorage.removeItem('hit_token_original');
            }
            setImpersonating(false);
        }
    };
    const handleDeleteUser = async () => {
        try {
            await deleteUser(userEmail);
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
                await resetPassword(userEmail, true);
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
                await resetPassword(userEmail, false, newPassword);
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
        const confirmed = await alertDialog.showConfirm(`Resend verification email to ${userEmail}?`, {
            title: 'Resend Verification',
        });
        if (confirmed) {
            try {
                await resendVerification(userEmail);
                await alertDialog.showAlert('Verification email sent!', { variant: 'success', title: 'Success' });
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleVerifyEmail = async () => {
        const confirmed = await alertDialog.showConfirm(`Mark email as verified for ${userEmail}?`, {
            title: 'Verify Email',
        });
        if (confirmed) {
            try {
                await verifyEmail(userEmail);
                refresh();
                await alertDialog.showAlert('Email verified successfully!', { variant: 'success', title: 'Success' });
            }
            catch {
                // Error handled by hook
            }
        }
    };
    const handleToggleLock = async () => {
        const action = user?.locked ? unlockUser : lockUser;
        const actionName = user?.locked ? 'unlock' : 'lock';
        const confirmed = await alertDialog.showConfirm(`Are you sure you want to ${actionName} this user?`, {
            title: user?.locked ? 'Unlock User' : 'Lock User',
            ...(user?.locked ? {} : { variant: 'warning' }),
        });
        if (confirmed) {
            try {
                await action(userEmail);
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
                await updateRoles(userEmail, newRole);
            }
            // Update profile fields if changed
            const hasChanges = JSON.stringify(profileFields) !== JSON.stringify(user?.profile_fields || {});
            if (hasChanges) {
                await updateUser(userEmail, { profile_fields: profileFields });
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
        const confirmed = await alertDialog.showConfirm('Revoke this session?', {
            title: 'Revoke Session',
            variant: 'warning',
        });
        if (confirmed) {
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
        const confirmed = await alertDialog.showConfirm('Revoke all sessions for this user?', {
            title: 'Revoke All Sessions',
            variant: 'error',
        });
        if (confirmed) {
            try {
                await revokeAllUserSessions(userEmail);
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
        // Validate file type
        if (!file.type.startsWith('image/')) {
            await alertDialog.showAlert('File must be an image', {
                variant: 'error',
                title: 'Invalid File',
            });
            return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            await alertDialog.showAlert('File size must be less than 5MB', {
                variant: 'error',
                title: 'File Too Large',
            });
            return;
        }
        // Convert file to data URL and show crop modal
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageToCrop(reader.result);
            setCropModalOpen(true);
        };
        reader.onerror = () => {
            alertDialog.showAlert('Failed to read image file', {
                variant: 'error',
                title: 'Error',
            });
        };
        reader.readAsDataURL(file);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleCropComplete = async (croppedImageBase64) => {
        try {
            setUploadingPicture(true);
            // Upload the cropped image (base64 string)
            await uploadProfilePictureBase64(userEmail, croppedImageBase64);
            refresh();
            // Dispatch event to update top header avatar
            if (typeof window !== 'undefined') {
                const updateEvent = new CustomEvent('user-profile-updated', {
                    detail: { profile_picture_url: croppedImageBase64, email: userEmail },
                });
                window.dispatchEvent(updateEvent);
            }
        }
        catch (err) {
            await alertDialog.showAlert(err instanceof Error ? err.message : 'Failed to upload profile picture', {
                variant: 'error',
                title: 'Upload Failed',
            });
        }
        finally {
            setUploadingPicture(false);
            setImageToCrop(null);
        }
    };
    const handlePictureDelete = async () => {
        const confirmed = await alertDialog.showConfirm('Are you sure you want to delete this profile picture?', {
            title: 'Delete Profile Picture',
            variant: 'error',
        });
        if (!confirmed) {
            return;
        }
        try {
            setUploadingPicture(true);
            await deleteProfilePicture(userEmail);
            refresh();
            // Dispatch event to update top header avatar
            if (typeof window !== 'undefined') {
                const updateEvent = new CustomEvent('user-profile-updated', {
                    detail: { profile_picture_url: null, email: userEmail },
                });
                window.dispatchEvent(updateEvent);
            }
        }
        catch (err) {
            await alertDialog.showAlert(err instanceof Error ? err.message : 'Failed to delete profile picture', {
                variant: 'error',
                title: 'Delete Failed',
            });
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
    return (_jsxs(Page, { title: user.email, description: user.locked ? 'This account is locked' : undefined, breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsx("div", { className: "flex gap-3", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", onClick: handleSave, disabled: mutating, children: [_jsx(Save, { size: 16, className: "mr-2" }), "Save"] }), _jsxs(Button, { variant: "ghost", onClick: cancelEditing, disabled: mutating, children: [_jsx(X, { size: 16, className: "mr-2" }), "Cancel"] })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: startEditing, children: [_jsx(Edit2, { size: 16, className: "mr-2" }), "Edit"] }), impersonationEnabled ? (_jsxs(Button, { variant: "secondary", onClick: handleStartImpersonation, disabled: mutating || impersonating, children: [_jsx(UserCheck, { size: 16, className: "mr-2" }), impersonating ? 'Assuming...' : 'Assume'] })) : null, !user.email_verified && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: handleVerifyEmail, disabled: mutating, children: [_jsx(CheckCircle, { size: 16, className: "mr-2" }), "Verify"] }), _jsxs(Button, { variant: "secondary", onClick: handleResendVerification, disabled: mutating, children: [_jsx(Mail, { size: 16, className: "mr-2" }), "Resend Verification"] })] })), _jsxs(Button, { variant: "secondary", onClick: handleResetPassword, disabled: mutating, children: [_jsx(Key, { size: 16, className: "mr-2" }), "Reset Password"] }), _jsxs(Button, { variant: "secondary", onClick: handleToggleLock, disabled: mutating, children: [user.locked ? _jsx(Unlock, { size: 16, className: "mr-2" }) : _jsx(Lock, { size: 16, className: "mr-2" }), user.locked ? 'Unlock' : 'Lock'] }), _jsxs(Button, { variant: "danger", onClick: () => setDeleteModalOpen(true), children: [_jsx(Trash2, { size: 16, className: "mr-2" }), "Delete"] })] })) }), children: [user.oauth_providers && user.oauth_providers.length > 0 && (_jsx(Alert, { variant: "info", title: "OAuth Account Linked", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link2, { size: 16 }), _jsxs("span", { children: ["This account is linked to", ' ', _jsx("strong", { children: user.oauth_providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') }), user.oauth_providers.length === 1 ? ' account' : ' accounts', "."] })] }) })), _jsx(Card, { title: "User Details", children: isEditing ? (_jsxs("div", { className: "space-y-4", children: [profileFieldsList.length > 0 && profileFieldsList
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
                                })()] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Verified" }), _jsx(Badge, { variant: user.email_verified ? 'success' : 'warning', children: user.email_verified ? 'Yes' : 'No' })] }), authConfig?.two_factor_auth !== false && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "2FA" }), _jsx(Badge, { variant: user.two_factor_enabled ? 'success' : 'default', children: user.two_factor_enabled ? 'Enabled' : 'Disabled' })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Status" }), _jsx(Badge, { variant: user.locked ? 'error' : 'success', children: user.locked ? 'Locked' : 'Active' })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Created" }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: formatDateOrNever(user.created_at) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Last Login" }), _jsx("span", { className: "text-gray-900 dark:text-gray-100", children: formatDateOrNever(user.last_login ?? null) })] })] })) }), _jsx(Card, { title: "Security Groups & Effective Permissions", footer: _jsx("div", { className: "flex justify-end gap-2", children: _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => refreshEffectivePerms(), disabled: effectivePermsLoading, children: [_jsx(RefreshCw, { size: 14, className: "mr-2" }), "Refresh"] }) }), children: effectivePermsError ? (_jsx(Alert, { variant: "error", title: "Failed to load security groups / permissions", children: effectivePermsError?.message || 'Unknown error' })) : effectivePermsLoading || !effectivePerms ? (_jsxs("div", { className: "flex items-center gap-2 text-gray-400", children: [_jsx(Spinner, { size: "sm" }), _jsx("span", { children: "Loading security groups and permissions\u2026" })] })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-medium text-gray-400", children: "User Groups" }), _jsxs("div", { className: "text-xs text-gray-500", children: [effectivePerms.counts?.groups ?? effectivePerms.groups.length, " total"] })] }), !effectivePerms.groups?.length ? (_jsx("div", { className: "text-sm text-gray-500 mt-2", children: "No group memberships found." })) : (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: effectivePerms.groups.map((g) => (_jsxs(Badge, { variant: g.kind === 'dynamic' ? 'info' : 'default', children: [_jsx(Users, { size: 12, className: "mr-1" }), g.name, g.kind === 'dynamic' && g.segment_key ? ` (${g.segment_key})` : ''] }, g.id))) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-medium text-gray-400", children: "Security Groups" }), _jsxs("div", { className: "text-xs text-gray-500", children: [effectivePerms.counts?.permission_sets ?? effectivePerms.permission_sets.length, " total", effectivePerms.has_default_access ? ' • Default Access applies' : '', effectivePerms.is_admin ? ' • Admin (full access)' : ''] })] }), !effectivePerms.permission_sets?.length ? (_jsx("div", { className: "text-sm text-gray-500 mt-2", children: "No security groups assigned via user/group/role." })) : (_jsx("div", { className: "mt-3", children: _jsx(DataTable, { columns: [
                                            {
                                                key: 'name',
                                                label: 'Security Group',
                                                sortable: true,
                                                render: (_, row) => (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate(`/admin/security-groups/${row.id}`), children: row.name })),
                                            },
                                            {
                                                key: 'assigned_via',
                                                label: 'Assigned Via',
                                                sortable: false,
                                                render: (value) => {
                                                    const via = Array.isArray(value) ? value : [];
                                                    if (!via.length)
                                                        return _jsx("span", { className: "text-gray-500", children: "\u2014" });
                                                    return (_jsx("div", { className: "flex flex-wrap gap-2", children: via.map((v) => (_jsxs(Badge, { variant: "default", children: [String(v?.principal_type || 'principal'), ": ", String(v?.label || v?.principal_id || '')] }, `${v?.principal_type}:${v?.principal_id}`))) }));
                                                },
                                            },
                                            {
                                                key: 'description',
                                                label: 'Description',
                                                sortable: false,
                                                render: (value) => (_jsx("span", { className: "text-gray-500", children: value || '—' })),
                                            },
                                        ], data: (effectivePerms.permission_sets || []).map((ps) => ({
                                            id: ps.id,
                                            name: ps.name,
                                            description: ps.description,
                                            assigned_via: ps.assigned_via,
                                        })), emptyMessage: "No security groups", searchable: true, pageSize: 10, tableId: "admin.user-detail.security-groups" }) }))] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-medium text-gray-400", children: "Effective (Unioned) Permissions" }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Pages: ", effectivePerms.effective.pages.length, " \u2022 Actions: ", effectivePerms.effective.actions.length, " \u2022 Metrics:", ' ', effectivePerms.effective.metrics.length] })] }), _jsx(Input, { value: permissionsFilter, onChange: (e) => setPermissionsFilter(String(e?.target?.value || '')), placeholder: "Filter pages/actions/metrics (substring match)\u2026" }), (() => {
                                    const q = permissionsFilter.trim().toLowerCase();
                                    const matches = (x) => (!q ? true : x.toLowerCase().includes(q));
                                    const pages = (effectivePerms.effective.pages || []).filter(matches);
                                    const actions = (effectivePerms.effective.actions || []).filter(matches);
                                    const metrics = (effectivePerms.effective.metrics || []).filter(matches);
                                    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("div", { className: "text-sm font-medium", children: "Pages" }), _jsx(Badge, { variant: "default", children: pages.length })] }), _jsx("div", { className: "max-h-64 overflow-auto space-y-1", children: pages.length ? (pages.map((p) => (_jsx("div", { className: "text-xs font-mono text-gray-700 dark:text-gray-200", children: p }, p)))) : (_jsx("div", { className: "text-sm text-gray-500", children: "No matches" })) })] }), _jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("div", { className: "text-sm font-medium", children: "Actions" }), _jsx(Badge, { variant: "default", children: actions.length })] }), _jsx("div", { className: "max-h-64 overflow-auto space-y-1", children: actions.length ? (actions.map((a) => (_jsx("div", { className: "text-xs font-mono text-gray-700 dark:text-gray-200", children: a }, a)))) : (_jsx("div", { className: "text-sm text-gray-500", children: "No matches" })) })] }), _jsxs("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg p-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("div", { className: "text-sm font-medium", children: "Metrics" }), _jsx(Badge, { variant: "default", children: metrics.length })] }), _jsx("div", { className: "max-h-64 overflow-auto space-y-1", children: metrics.length ? (metrics.map((m) => (_jsx("div", { className: "text-xs font-mono text-gray-700 dark:text-gray-200", children: m }, m)))) : (_jsx("div", { className: "text-sm text-gray-500", children: "No matches" })) })] })] }));
                                })()] })] })) }), _jsx(Card, { title: "Active Sessions", footer: sessionsData?.items?.length ? (_jsx(Button, { variant: "danger", size: "sm", onClick: handleRevokeAllSessions, children: "Revoke All Sessions" })) : undefined, children: !sessionsData?.items?.length ? (_jsx(EmptyState, { icon: _jsx(Monitor, { size: 48 }), title: "No active sessions", description: "This user has no active sessions" })) : (_jsx(DataTable, { columns: [
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
                    })), emptyMessage: "No active sessions", searchable: true, exportable: true, showColumnVisibility: true, pageSize: 25, tableId: "admin.user-detail.sessions" })) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => setDeleteModalOpen(false), title: "Delete User", description: "This action cannot be undone", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-gray-300", children: ["Are you sure you want to delete ", _jsx("strong", { className: "text-gray-900 dark:text-gray-100", children: user.email }), "?"] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteModalOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDeleteUser, loading: mutating, children: "Delete User" })] })] }) }), _jsx(Modal, { open: resetPasswordModalOpen, onClose: () => {
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
                                    }, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleResetPasswordSubmit, loading: mutating, children: resetPasswordMethod === 'email' ? 'Send Reset Email' : 'Set Password' })] })] }) }), imageToCrop && (_jsx(ProfilePictureCropModal, { open: cropModalOpen, onClose: () => {
                    setCropModalOpen(false);
                    setImageToCrop(null);
                }, imageSrc: imageToCrop, onCropComplete: handleCropComplete })), _jsx(AlertDialog, { ...alertDialog.props })] }));
}
export default UserDetail;
//# sourceMappingURL=UserDetail.js.map
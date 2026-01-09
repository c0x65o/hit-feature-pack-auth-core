'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Key,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Monitor,
  Globe,
  Mail,
  CheckCircle,
  Edit2,
  Save,
  X,
  User,
  Upload,
  Camera,
  Link2,
  Users,
} from 'lucide-react';
import type { BreadcrumbItem } from '@hit/ui-kit';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { formatDateTime } from '@hit/sdk';
import {
  useUser,
  useUserSessions,
  useUserMutations,
  useSessionMutations,
  useAuthAdminConfig,
  useProfileFields,
  useUserEffectivePermissions,
} from '../hooks/useAuthAdmin';
import { ProfilePictureCropModal } from '../components/ProfilePictureCropModal';

interface UserDetailProps {
  email: string;
  onNavigate?: (path: string) => void;
}

export function UserDetail({ email, onNavigate }: UserDetailProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Alert, Spinner, EmptyState, Select, Input, AlertDialog } = useUi();
  const alertDialog = useAlertDialog();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'user']);
  const [profileFields, setProfileFields] = useState<Record<string, unknown>>({});
  const [permissionsFilter, setPermissionsFilter] = useState<string>('');
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'email' | 'direct'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { user, loading, error, refresh } = useUser(email);
  const {
    data: effectivePerms,
    loading: effectivePermsLoading,
    error: effectivePermsError,
    refresh: refreshEffectivePerms,
  } = useUserEffectivePermissions(email);
  const { config: authConfig } = useAuthAdminConfig();
  const { data: profileFieldMetadata, loading: fieldsLoading } = useProfileFields();
  const profileFieldsList = profileFieldMetadata || [];
  
  // Fetch available roles from features endpoint
  React.useEffect(() => {
    const fetchAvailableRoles = async () => {
      try {
        const authUrl = typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_HIT_AUTH_URL 
          ? (window as any).NEXT_PUBLIC_HIT_AUTH_URL 
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
      } catch (e) {
        // Fallback to default roles
        setAvailableRoles(['admin', 'user']);
      }
    };
    fetchAvailableRoles();
  }, []);
  const { data: sessionsData, refresh: refreshSessions } = useUserSessions(email);
  const {
    deleteUser,
    resetPassword,
    resendVerification,
    verifyEmail,
    updateRoles,
    updateUser,
    uploadProfilePicture,
    uploadProfilePictureBase64,
    deleteProfilePicture,
    lockUser,
    unlockUser,
    loading: mutating,
  } = useUserMutations();
  const { revokeSession, revokeAllUserSessions } = useSessionMutations();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(email);
      navigate('/admin/users');
    } catch {
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
        setResetPasswordError(errorMessage);
      }
    } else {
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
        setResetPasswordError(errorMessage);
      }
    }
  };

  const handleResendVerification = async () => {
    const confirmed = await alertDialog.showConfirm(`Resend verification email to ${email}?`, {
      title: 'Resend Verification',
    });
    if (confirmed) {
      try {
        await resendVerification(email);
        await alertDialog.showAlert('Verification email sent!', { variant: 'success', title: 'Success' });
      } catch {
        // Error handled by hook
      }
    }
  };

  const handleVerifyEmail = async () => {
    const confirmed = await alertDialog.showConfirm(`Mark email as verified for ${email}?`, {
      title: 'Verify Email',
    });
    if (confirmed) {
      try {
        await verifyEmail(email);
        refresh();
        await alertDialog.showAlert('Email verified successfully!', { variant: 'success', title: 'Success' });
      } catch {
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
        await action(email);
        refresh();
      } catch {
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
    } catch {
      // Error handled by hook
    }
  };

  // Initialize profile fields when user data loads
  React.useEffect(() => {
    if (user?.profile_fields) {
      setProfileFields(user.profile_fields);
    }
  }, [user?.profile_fields]);

  const handleRevokeSession = async (sessionId: string) => {
    const confirmed = await alertDialog.showConfirm('Revoke this session?', {
      title: 'Revoke Session',
      variant: 'warning',
    });
    if (confirmed) {
      try {
        await revokeSession(sessionId);
        refreshSessions();
      } catch {
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
        await revokeAllUserSessions(email);
        refreshSessions();
      } catch {
        // Error handled by hook
      }
    }
  };

  const formatDateOrNever = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
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

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      setImageToCrop(reader.result as string);
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

  const handleCropComplete = async (croppedImageBase64: string) => {
    try {
      setUploadingPicture(true);
      // Upload the cropped image (base64 string)
      await uploadProfilePictureBase64(email, croppedImageBase64);
      refresh();
      
      // Dispatch event to update top header avatar
      if (typeof window !== 'undefined') {
        const updateEvent = new CustomEvent('user-profile-updated', {
          detail: { profile_picture_url: croppedImageBase64, email },
        });
        window.dispatchEvent(updateEvent);
      }
    } catch (err) {
      await alertDialog.showAlert(err instanceof Error ? err.message : 'Failed to upload profile picture', {
        variant: 'error',
        title: 'Upload Failed',
      });
    } finally {
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
      await deleteProfilePicture(email);
      refresh();
      
      // Dispatch event to update top header avatar
      if (typeof window !== 'undefined') {
        const updateEvent = new CustomEvent('user-profile-updated', {
          detail: { profile_picture_url: null, email },
        });
        window.dispatchEvent(updateEvent);
      }
    } catch (err) {
      await alertDialog.showAlert(err instanceof Error ? err.message : 'Failed to delete profile picture', {
        variant: 'error',
        title: 'Delete Failed',
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <Page title="Loading...">
        <Card>
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        </Card>
      </Page>
    );
  }

  if (error || !user) {
    return (
      <Page
        title="User Not Found"
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Users
          </Button>
        }
      >
        <Alert variant="error" title="Error">
          {error?.message || 'User not found'}
        </Alert>
      </Page>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Admin', href: '/admin', icon: <Shield size={14} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={14} /> },
    { label: user.email },
  ];

  return (
    <Page
      title={user.email}
      description={user.locked ? 'This account is locked' : undefined}
      breadcrumbs={breadcrumbs}
      onNavigate={navigate}
      actions={
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button variant="primary" onClick={handleSave} disabled={mutating}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
              <Button variant="ghost" onClick={cancelEditing} disabled={mutating}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEditing}>
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
              {!user.email_verified && (
                <>
                  <Button variant="secondary" onClick={handleVerifyEmail} disabled={mutating}>
                    <CheckCircle size={16} className="mr-2" />
                    Verify
                  </Button>
                  <Button variant="secondary" onClick={handleResendVerification} disabled={mutating}>
                    <Mail size={16} className="mr-2" />
                    Resend Verification
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={handleResetPassword} disabled={mutating}>
                <Key size={16} className="mr-2" />
                Reset Password
              </Button>
              <Button variant="secondary" onClick={handleToggleLock} disabled={mutating}>
                {user.locked ? <Unlock size={16} className="mr-2" /> : <Lock size={16} className="mr-2" />}
                {user.locked ? 'Unlock' : 'Lock'}
              </Button>
              <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* OAuth Account Alert */}
      {user.oauth_providers && user.oauth_providers.length > 0 && (
        <Alert variant="info" title="OAuth Account Linked">
          <div className="flex items-center gap-2">
            <Link2 size={16} />
            <span>
              This account is linked to{' '}
              <strong>{user.oauth_providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}</strong>
              {user.oauth_providers.length === 1 ? ' account' : ' accounts'}.
            </span>
          </div>
        </Alert>
      )}

      {/* User Info - Consolidated */}
      <Card title="User Details">
        {isEditing ? (
          <div className="space-y-4">
            {/* Profile Fields - Editable */}
            {profileFieldsList.length > 0 && profileFieldsList
              .sort((a, b) => a.display_order - b.display_order)
              .map((fieldMeta) => {
                const rawFieldValue = fieldMeta.field_key === 'email' 
                  ? (user.email || '')
                  : (profileFields[fieldMeta.field_key]);
                const fieldValue = typeof rawFieldValue === 'string' || typeof rawFieldValue === 'number' 
                  ? String(rawFieldValue) 
                  : '';
                const isEmail = fieldMeta.field_key === 'email';
                
                return (
                  <div key={fieldMeta.field_key}>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {fieldMeta.field_label}
                      {fieldMeta.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {fieldMeta.field_type === 'int' ? (
                      <input
                        type="number"
                        value={fieldValue || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfileFields({
                            ...profileFields,
                            [fieldMeta.field_key]: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={fieldMeta.default_value || ''}
                        disabled={isEmail}
                      />
                    ) : (
                      <input
                        type={isEmail ? 'email' : 'text'}
                        value={fieldValue || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (!isEmail) {
                            setProfileFields({
                              ...profileFields,
                              [fieldMeta.field_key]: e.target.value || undefined,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder={fieldMeta.default_value || ''}
                        disabled={isEmail}
                      />
                    )}
                    {isEmail && (
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    )}
                  </div>
                );
              })}
            
            {/* Role - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <Select
                value={newRole}
                onChange={(value: string) => setNewRole(value)}
                options={availableRoles.map((role) => ({
                  value: role,
                  label: role.charAt(0).toUpperCase() + role.slice(1),
                }))}
                placeholder="Select a role"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile Picture */}
            {authConfig?.profile_picture !== false && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Profile Picture</span>
                <div className="flex items-center gap-3">
                  {user.profile_picture_url ? (
                    <div className="relative group">
                      <img
                        src={user.profile_picture_url}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <User size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={triggerFileInput}
                      disabled={uploadingPicture || mutating}
                    >
                      {user.profile_picture_url ? (
                        <>
                          <Camera size={14} className="mr-1" />
                          Change
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                    {user.profile_picture_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePictureDelete}
                        disabled={uploadingPicture || mutating}
                      >
                        <Trash2 size={14} className="mr-1 text-red-500" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
              </div>
            )}
            
            {/* Profile Fields - View Mode */}
            {profileFieldsList.length > 0 && profileFieldsList
              .sort((a, b) => a.display_order - b.display_order)
              .map((fieldMeta) => {
                const value = fieldMeta.field_key === 'email' 
                  ? (user.email || '')
                  : (user.profile_fields?.[fieldMeta.field_key]);
                return (
                  <div key={fieldMeta.field_key} className="flex justify-between">
                    <span className="text-gray-400">{fieldMeta.field_label}</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {value !== undefined && value !== null ? String(value) : '—'}
                    </span>
                  </div>
                );
              })}
            
            {/* OAuth Providers - View Mode */}
            {user.oauth_providers && user.oauth_providers.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">OAuth Providers</span>
                <div className="flex gap-2">
                  {user.oauth_providers.map((provider) => (
                    <Badge key={provider} variant="info">
                      <Link2 size={12} className="mr-1" />
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Role - View Mode */}
            <div className="flex justify-between">
              <span className="text-gray-400">Role</span>
              {(() => {
                const userRole = user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : 'user') || 'user';
                return (
                  <Badge variant={userRole === 'admin' ? 'info' : 'default'}>
                    {userRole}
                  </Badge>
                );
              })()}
            </div>
            
            {/* Account Status Fields */}
            <div className="flex justify-between">
              <span className="text-gray-400">Verified</span>
              <Badge variant={user.email_verified ? 'success' : 'warning'}>
                {user.email_verified ? 'Yes' : 'No'}
              </Badge>
            </div>
            {authConfig?.two_factor_auth !== false && (
              <div className="flex justify-between">
                <span className="text-gray-400">2FA</span>
                <Badge variant={user.two_factor_enabled ? 'success' : 'default'}>
                  {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <Badge variant={user.locked ? 'error' : 'success'}>
                {user.locked ? 'Locked' : 'Active'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-gray-100">{formatDateOrNever(user.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Login</span>
              <span className="text-gray-900 dark:text-gray-100">{formatDateOrNever(user.last_login ?? null)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Security Groups (Permission Sets) + Effective Permissions */}
      <Card
        title="Security Groups & Effective Permissions"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshEffectivePerms()}
              disabled={effectivePermsLoading}
            >
              <RefreshCw size={14} className="mr-2" />
              Refresh
            </Button>
          </div>
        }
      >
        {effectivePermsError ? (
          <Alert variant="error" title="Failed to load security groups / permissions">
            {(effectivePermsError as any)?.message || 'Unknown error'}
          </Alert>
        ) : effectivePermsLoading || !effectivePerms ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Spinner size="sm" />
            <span>Loading security groups and permissions…</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">User Groups</div>
                <div className="text-xs text-gray-500">
                  {effectivePerms.counts?.groups ?? effectivePerms.groups.length} total
                </div>
              </div>
              {!effectivePerms.groups?.length ? (
                <div className="text-sm text-gray-500 mt-2">No group memberships found.</div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {effectivePerms.groups.map((g) => (
                    <Badge key={g.id} variant={g.kind === 'dynamic' ? 'info' : 'default'}>
                      <Users size={12} className="mr-1" />
                      {g.name}
                      {g.kind === 'dynamic' && g.segment_key ? ` (${g.segment_key})` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Security Groups</div>
                <div className="text-xs text-gray-500">
                  {effectivePerms.counts?.permission_sets ?? effectivePerms.permission_sets.length} total
                  {effectivePerms.has_default_access ? ' • Default Access applies' : ''}
                  {effectivePerms.is_admin ? ' • Admin (full access)' : ''}
                </div>
              </div>

              {!effectivePerms.permission_sets?.length ? (
                <div className="text-sm text-gray-500 mt-2">No security groups assigned via user/group/role.</div>
              ) : (
                <div className="mt-3">
                  <DataTable
                    columns={[
                      {
                        key: 'name',
                        label: 'Security Group',
                        sortable: true,
                        render: (_: unknown, row: Record<string, unknown>) => (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/security-groups/${row.id as string}`)}
                          >
                            {row.name as string}
                          </Button>
                        ),
                      },
                      {
                        key: 'assigned_via',
                        label: 'Assigned Via',
                        sortable: false,
                        render: (value: unknown) => {
                          const via = Array.isArray(value) ? (value as any[]) : [];
                          if (!via.length) return <span className="text-gray-500">—</span>;
                          return (
                            <div className="flex flex-wrap gap-2">
                              {via.map((v) => (
                                <Badge key={`${v?.principal_type}:${v?.principal_id}`} variant="default">
                                  {String(v?.principal_type || 'principal')}: {String(v?.label || v?.principal_id || '')}
                                </Badge>
                              ))}
                            </div>
                          );
                        },
                      },
                      {
                        key: 'description',
                        label: 'Description',
                        sortable: false,
                        render: (value: unknown) => (
                          <span className="text-gray-500">{(value as string) || '—'}</span>
                        ),
                      },
                    ]}
                    data={(effectivePerms.permission_sets || []).map((ps) => ({
                      id: ps.id,
                      name: ps.name,
                      description: ps.description,
                      assigned_via: ps.assigned_via,
                    }))}
                    emptyMessage="No security groups"
                    searchable
                    pageSize={10}
                    tableId="admin.user-detail.security-groups"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Effective (Unioned) Permissions</div>
                <div className="text-xs text-gray-500">
                  Pages: {effectivePerms.effective.pages.length} • Actions: {effectivePerms.effective.actions.length} • Metrics:{' '}
                  {effectivePerms.effective.metrics.length}
                </div>
              </div>

              <Input
                value={permissionsFilter}
                onChange={(e: any) => setPermissionsFilter(String(e?.target?.value || ''))}
                placeholder="Filter pages/actions/metrics (substring match)…"
              />

              {(() => {
                const q = permissionsFilter.trim().toLowerCase();
                const matches = (x: string) => (!q ? true : x.toLowerCase().includes(q));
                const pages = (effectivePerms.effective.pages || []).filter(matches);
                const actions = (effectivePerms.effective.actions || []).filter(matches);
                const metrics = (effectivePerms.effective.metrics || []).filter(matches);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Pages</div>
                        <Badge variant="default">{pages.length}</Badge>
                      </div>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {pages.length ? (
                          pages.map((p) => (
                            <div key={p} className="text-xs font-mono text-gray-700 dark:text-gray-200">
                              {p}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No matches</div>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Actions</div>
                        <Badge variant="default">{actions.length}</Badge>
                      </div>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {actions.length ? (
                          actions.map((a) => (
                            <div key={a} className="text-xs font-mono text-gray-700 dark:text-gray-200">
                              {a}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No matches</div>
                        )}
                      </div>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Metrics</div>
                        <Badge variant="default">{metrics.length}</Badge>
                      </div>
                      <div className="max-h-64 overflow-auto space-y-1">
                        {metrics.length ? (
                          metrics.map((m) => (
                            <div key={m} className="text-xs font-mono text-gray-700 dark:text-gray-200">
                              {m}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No matches</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Card>

      {/* Sessions */}
      <Card
        title="Active Sessions"
        footer={
          sessionsData?.items?.length ? (
            <Button variant="danger" size="sm" onClick={handleRevokeAllSessions}>
              Revoke All Sessions
            </Button>
          ) : undefined
        }
      >
        {!sessionsData?.items?.length ? (
          <EmptyState
            icon={<Monitor size={48} />}
            title="No active sessions"
            description="This user has no active sessions"
          />
        ) : (
          <DataTable
            columns={[
              {
                key: 'ip_address',
                label: 'IP Address',
                sortable: true,
                render: (value: unknown) => (
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" />
                    <span className="font-mono text-sm">{value as string}</span>
                  </div>
                ),
              },
              {
                key: 'created_at',
                label: 'Started',
                sortable: true,
                render: (value: unknown) => formatDateOrNever(value as string),
              },
              {
                key: 'status',
                label: 'Status',
                render: () => (
                  <Badge variant="success">
                    Active
                  </Badge>
                ),
              },
              {
                key: 'actions',
                label: '',
                align: 'right' as const,
                sortable: false,
                hideable: false,
                render: (_: unknown, row: Record<string, unknown>) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(row.id as string)}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                ),
              },
            ]}
            data={(sessionsData?.items || []).map((s) => ({
              id: s.id,
              ip_address: s.ip_address,
              created_at: s.created_at,
            }))}
            emptyMessage="No active sessions"
            searchable
            exportable
            showColumnVisibility
            pageSize={25}
            tableId="admin.user-detail.sessions"
          />
        )}
      </Card>

      {/* Delete Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-gray-100">{user.email}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} loading={mutating}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setResetPasswordMethod('email');
          setNewPassword('');
          setConfirmPassword('');
          setResetPasswordSuccess(null);
          setResetPasswordError(null);
        }}
        title="Reset Password"
        description="Choose how to reset the password for this user"
      >
        <div className="space-y-4">
          {/* Success Alert */}
          {resetPasswordSuccess && (
            <Alert variant="success" title="Success">
              {resetPasswordSuccess}
            </Alert>
          )}
          
          {/* Error Alert */}
          {resetPasswordError && (
            <Alert variant="error" title="Error">
              {resetPasswordError}
            </Alert>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="reset-email"
                checked={resetPasswordMethod === 'email'}
                onChange={() => setResetPasswordMethod('email')}
                className="w-4 h-4"
              />
              <label htmlFor="reset-email" className="cursor-pointer">
                <div className="font-medium">Send reset email</div>
                <div className="text-sm text-gray-400">
                  Send a password reset link via email through the email provider module
                </div>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="reset-direct"
                checked={resetPasswordMethod === 'direct'}
                onChange={() => setResetPasswordMethod('direct')}
                className="w-4 h-4"
              />
              <label htmlFor="reset-direct" className="cursor-pointer">
                <div className="font-medium">Set password directly</div>
                <div className="text-sm text-gray-400">
                  Type in a new password to change it immediately
                </div>
              </label>
            </div>
          </div>

          {resetPasswordMethod === 'direct' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordMethod('email');
                setNewPassword('');
                setConfirmPassword('');
                setResetPasswordSuccess(null);
                setResetPasswordError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleResetPasswordSubmit} loading={mutating}>
              {resetPasswordMethod === 'email' ? 'Send Reset Email' : 'Set Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Profile Picture Crop Modal */}
      {imageToCrop && (
        <ProfilePictureCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Alert Dialog */}
      <AlertDialog {...alertDialog.props} />
    </Page>
  );
}

export default UserDetail;



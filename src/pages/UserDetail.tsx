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
import { useUi, type BreadcrumbItem } from '@hit/ui-kit';
import { formatDateTime } from '@hit/sdk';
import {
  useUser,
  useUserSessions,
  useUserMutations,
  useSessionMutations,
  useAuthAdminConfig,
  useProfileFields,
} from '../hooks/useAuthAdmin';

interface UserDetailProps {
  email: string;
  onNavigate?: (path: string) => void;
}

export function UserDetail({ email, onNavigate }: UserDetailProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Alert, Spinner, EmptyState, Select } = useUi();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'user']);
  const [profileFields, setProfileFields] = useState<Record<string, unknown>>({});
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'email' | 'direct'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    if (confirm(`Resend verification email to ${email}?`)) {
      try {
        await resendVerification(email);
        alert('Verification email sent!');
      } catch {
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
      } catch {
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
    if (confirm('Revoke this session?')) {
      try {
        await revokeSession(sessionId);
        refreshSessions();
      } catch {
        // Error handled by hook
      }
    }
  };

  const handleRevokeAllSessions = async () => {
    if (confirm('Revoke all sessions for this user?')) {
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

    try {
      setUploadingPicture(true);
      await uploadProfilePicture(email, file);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload profile picture');
    } finally {
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete profile picture');
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
                        onChange={(e) =>
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
                        onChange={(e) => {
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
                onChange={(value) => setNewRole(value)}
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
                render: (value) => (
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
                render: (value) => formatDateOrNever(value as string),
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
                render: (_, row) => (
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
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
    </Page>
  );
}

export default UserDetail;



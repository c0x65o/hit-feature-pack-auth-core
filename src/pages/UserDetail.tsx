'use client';

import React, { useMemo, useState } from 'react';
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
  UserCheck,
  Upload,
  Camera,
  Link2,
  Users,
  ChevronDown,
  ChevronRight,
  Package,
  KeyRound,
  BarChart3,
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
  usePermissionActions,
  useMetricsCatalog,
} from '../hooks/useAuthAdmin';
import { ProfilePictureCropModal } from '../components/ProfilePictureCropModal';

interface UserDetailProps {
  email: string;
  onNavigate?: (path: string) => void;
}

export function UserDetail({ email, onNavigate }: UserDetailProps) {
  const { Page, Card, Button, Badge, DataTable, Modal, Alert, Spinner, EmptyState, Select, Input, AlertDialog } = useUi();
  const alertDialog = useAlertDialog();

  const normalizeEmail = (raw: string) => {
    let out = String(raw || '').trim();
    // Next route params may arrive percent-encoded (sometimes double-encoded). Decode up to 2 times.
    for (let i = 0; i < 2; i++) {
      if (!/%[0-9A-Fa-f]{2}/.test(out)) break;
      try {
        out = decodeURIComponent(out);
      } catch {
        break;
      }
    }
    return out;
  };
  const userEmail = normalizeEmail(email);
  // Default hidden until we confirm the backend config says it's enabled.
  const [impersonationEnabled, setImpersonationEnabled] = useState<boolean>(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'user']);
  const [profileFields, setProfileFields] = useState<Record<string, unknown>>({});
  const [permissionsFilter, setPermissionsFilter] = useState<string>('');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainTitle, setExplainTitle] = useState<string>('Explain Why');
  const [explainLines, setExplainLines] = useState<string[]>([]);
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

  const { user, loading, error, refresh } = useUser(userEmail);
  const {
    data: effectivePerms,
    loading: effectivePermsLoading,
    error: effectivePermsError,
    refresh: refreshEffectivePerms,
  } = useUserEffectivePermissions(userEmail);
  const { data: actionDefs, loading: actionsLoading } = usePermissionActions();
  const { data: metricsCatalog, loading: metricsLoading } = useMetricsCatalog();
  const { config: authConfig } = useAuthAdminConfig();
  const { data: profileFieldMetadata, loading: fieldsLoading } = useProfileFields();
  const profileFieldsList = profileFieldMetadata || [];
  
  // Fetch available roles from features endpoint
  React.useEffect(() => {
    const fetchAvailableRoles = async () => {
      try {
        // Auth is always app-local via Next API routes (auth-v2).
        const authUrl = '/api/auth';
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
      } catch (e) {
        // Fallback to default roles
        setAvailableRoles(['admin', 'user']);
        setImpersonationEnabled(false);
      }
    };
    fetchAvailableRoles();
  }, []);
  const { data: sessionsData, refresh: refreshSessions } = useUserSessions(userEmail);
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
    startImpersonation,
    loading: mutating,
  } = useUserMutations();
  const { revokeSession, revokeAllUserSessions } = useSessionMutations();

  const [impersonating, setImpersonating] = useState(false);

  const setAuthToken = (token: string) => {
    if (typeof window === 'undefined') return;
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
    } catch {
      // Use default
    }
    document.cookie = `hit_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  };

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  type ScopeModeValue = 'none' | 'own' | 'ldd' | 'any';

  function parseExclusiveActionModeGroup(
    actionKey: string
  ): { groupKey: string; value: ScopeModeValue; basePrefix: string; verb: 'read' | 'write' | 'delete' } | null {
    const m = String(actionKey || '').trim().match(
      /^([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*)\.(read|write|delete)\.scope\.(none|own|ldd|any)$/
    );
    if (!m) return null;
    return {
      groupKey: `${m[1]}.${m[2]}.scope`,
      value: m[3] as ScopeModeValue,
      basePrefix: m[1],
      verb: m[2] as any,
    };
  }

  function baseIdFromActionKey(key: string): string | null {
    const k = String(key || '').trim().toLowerCase();
    if (!k) return null;
    const mCreate = k.match(/^([a-z][a-z0-9_-]*)\.([a-z0-9_-]+)\.create$/);
    if (mCreate) return `${mCreate[1]}.${mCreate[2]}`;
    return null;
  }

  function titleCase(x: string): string {
    const s = String(x || '').trim();
    if (!s) return '';
    return s
      .split(/[\s._/-]+/)
      .filter(Boolean)
      .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
      .join(' ');
  }

  function shortLabelForValue(v: ScopeModeValue): string {
    if (v === 'none') return 'None';
    if (v === 'any') return 'Any';
    if (v === 'own') return 'Own';
    if (v === 'ldd') return 'LDD';
    return String(v);
  }

  const permSetNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const ps of effectivePerms?.permission_sets || []) {
      if (ps?.id) m.set(String(ps.id), String(ps.name || ps.id));
    }
    return m;
  }, [effectivePerms]);

  const defaultAccessPsId = useMemo(() => {
    const ps = (effectivePerms?.permission_sets || []).find((x) => String(x?.name || '').toLowerCase() === 'default access');
    return ps?.id ? String(ps.id) : null;
  }, [effectivePerms]);

  const actionCatalog = useMemo(() => {
    const xs = Array.isArray(actionDefs) ? (actionDefs as any[]) : [];
    return xs
      .map((a: any) => ({
        key: String(a?.key || '').trim(),
        pack_name: typeof a?.pack_name === 'string' && a.pack_name.trim() ? a.pack_name.trim() : null,
        pack_title: typeof a?.pack_title === 'string' && a.pack_title.trim() ? a.pack_title.trim() : null,
        label: String(a?.label || a?.key || '').trim(),
        description: typeof a?.description === 'string' ? a.description : null,
        default_enabled: Boolean(a?.default_enabled),
        scope_modes: Array.isArray(a?.scope_modes) ? (a.scope_modes as any[]) : null,
      }))
      .filter((a: any) => Boolean(a.key));
  }, [actionDefs]);

  const packs = useMemo(() => {
    const effectiveActions = new Set<string>(effectivePerms?.effective?.actions || []);
    const explicitActions = new Set<string>(effectivePerms?.explicit_grants?.actions || []);
    const actionSources = (effectivePerms?.sources?.actions || {}) as Record<string, string[]>;
    const metricSources = (effectivePerms?.sources?.metrics || {}) as Record<string, string[]>;
    const effectiveMetrics = new Set<string>(effectivePerms?.effective?.metrics || []);
    const explicitMetrics = new Set<string>(effectivePerms?.explicit_grants?.metrics || []);

    const actionRows = actionCatalog
      .map((a) => {
        const effective = effectiveActions.has(a.key);
        if (!effective) return null;
        const explicit = explicitActions.has(a.key);
        const sources = explicit ? (actionSources[a.key] || []) : [];
        const isDefault = !explicit && Boolean(effectivePerms?.has_default_access) && Boolean(a.default_enabled);
        return { ...a, effective, explicit, sources, isDefault };
      })
      .filter(Boolean) as any[];

    const metricsRows = (metricsCatalog || [])
      .map((m: any) => {
        const key = String(m?.key || '').trim();
        if (!key || !effectiveMetrics.has(key)) return null;
        const explicit = explicitMetrics.has(key);
        const sources = explicit ? (metricSources[key] || []) : [];
        const label = String(m?.label || key);
        const unit = String(m?.unit || '');
        const ownerKind = String(m?.owner?.kind || 'app');
        const ownerId = String(m?.owner?.id || (ownerKind === 'app' ? 'app' : ''));
        const packId = ownerKind === 'feature_pack' && ownerId ? ownerId : '__app__';
        return { key, label, unit, explicit, sources, packId };
      })
      .filter(Boolean) as any[];

    const packMap = new Map<string, { id: string; name: string; title: string | null; actions: any[]; metrics: any[] }>();
    function ensurePack(id: string, name: string, title: string | null) {
      if (!packMap.has(id)) packMap.set(id, { id, name, title, actions: [], metrics: [] });
      const p = packMap.get(id)!;
      if (!p.title && title) p.title = title;
      return p;
    }

    for (const a of actionRows) {
      const pack = a.pack_name || String(a.key).split('.')[0] || 'unknown';
      const p = ensurePack(pack, pack, a.pack_title || null);
      p.actions.push(a);
    }
    for (const m of metricsRows) {
      const p = ensurePack(m.packId, m.packId === '__app__' ? 'app' : m.packId, m.packId === '__app__' ? 'App' : null);
      p.metrics.push(m);
    }

    for (const p of packMap.values()) {
      p.actions.sort((a, b) => String(a.label).localeCompare(String(b.label)) || String(a.key).localeCompare(String(b.key)));
      p.metrics.sort((a, b) => String(a.label).localeCompare(String(b.label)) || String(a.key).localeCompare(String(b.key)));
    }

    const out = Array.from(packMap.values());
    out.sort((a, b) => {
      if (a.id === '__app__') return -1;
      if (b.id === '__app__') return 1;
      return String(a.title || titleCase(a.name)).localeCompare(String(b.title || titleCase(b.name)));
    });

    const q = permissionsFilter.trim().toLowerCase();
    if (!q) return out;
    const match = (s: string) => s.toLowerCase().includes(q);
    return out.filter((p) => {
      if (match(String(p.title || p.name))) return true;
      if (p.actions.some((a) => match(String(a.key)) || match(String(a.label)))) return true;
      if (p.metrics.some((m) => match(String(m.key)) || match(String(m.label)) || match(String(m.unit)))) return true;
      return false;
    });
  }, [effectivePerms, actionCatalog, metricsCatalog, permissionsFilter]);

  const anyLoading = effectivePermsLoading || actionsLoading || metricsLoading;

  const handleStartImpersonation = async () => {
    const confirmed = await alertDialog.showConfirm(`Assume ${userEmail}?`, {
      title: 'Assume User',
      variant: 'warning',
    });
    if (!confirmed) return;

    setImpersonating(true);
    try {
      const originalToken = typeof window !== 'undefined' ? localStorage.getItem('hit_token') : null;
      if (originalToken && typeof window !== 'undefined') {
        // Stash admin token + last assumed user so the shell can offer a quick toggle back/forth.
        localStorage.setItem('hit_token_original', originalToken);
        localStorage.setItem('hit_last_impersonated_email', userEmail);
      }

      const res = await startImpersonation(userEmail);
      if (!res?.token) {
        throw new Error('Impersonation did not return a token');
      }

      setAuthToken(res.token);

      // Full reload so the shell rehydrates from the new token cleanly.
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        navigate('/');
      }
    } catch (err) {
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
        await resetPassword(userEmail, true);
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
      } catch (err) {
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
      } catch {
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
        await action(userEmail);
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
        await updateRoles(userEmail, newRole);
      }
      
      // Update profile fields if changed
      const hasChanges = JSON.stringify(profileFields) !== JSON.stringify(user?.profile_fields || {});
      if (hasChanges) {
        await updateUser(userEmail, { profile_fields: profileFields });
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
        await revokeAllUserSessions(userEmail);
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
      await uploadProfilePictureBase64(userEmail, croppedImageBase64);
      refresh();
      
      // Dispatch event to update top header avatar
      if (typeof window !== 'undefined') {
        const updateEvent = new CustomEvent('user-profile-updated', {
          detail: { profile_picture_url: croppedImageBase64, email: userEmail },
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
      await deleteProfilePicture(userEmail);
      refresh();
      
      // Dispatch event to update top header avatar
      if (typeof window !== 'undefined') {
        const updateEvent = new CustomEvent('user-profile-updated', {
          detail: { profile_picture_url: null, email: userEmail },
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
              {impersonationEnabled ? (
                <Button
                  variant="secondary"
                  onClick={handleStartImpersonation}
                  disabled={mutating || impersonating}
                >
                  <UserCheck size={16} className="mr-2" />
                  {impersonating ? 'Assuming...' : 'Assume'}
                </Button>
              ) : null}
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
                <div className="text-sm font-medium text-gray-400">Effective Permissions (V2)</div>
                <div className="text-xs text-gray-500">
                  Actions: {effectivePerms.effective.actions.length} • Metrics: {effectivePerms.effective.metrics.length}
                </div>
              </div>

              <Input
                value={permissionsFilter}
                onChange={(e: any) => setPermissionsFilter(String(e?.target?.value || ''))}
                placeholder="Filter actions/metrics (substring match)…"
              />

              {anyLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Spinner size="sm" />
                  <span>Loading permission catalog…</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {packs.map((pack) => {
                    const isExpanded = expandedPacks.has(pack.id);
                    const hasAny = pack.actions.length > 0 || pack.metrics.length > 0;
                    if (!hasAny) return null;

                    // Build scope groups for this pack
                    type ActionRow = typeof pack.actions extends Array<infer T> ? T : any;
                    type GroupBuild = { values: Map<string, any> };
                    const grouped = new Map<string, GroupBuild>();
                    const other: any[] = [];

                    for (const a of pack.actions as any[]) {
                      const parsed = parseExclusiveActionModeGroup(a.key);
                      if (!parsed) {
                        other.push(a);
                        continue;
                      }
                      if (!grouped.has(parsed.groupKey)) grouped.set(parsed.groupKey, { values: new Map() });
                      grouped.get(parsed.groupKey)!.values.set(parsed.value, { ...a, _parsed: parsed });
                    }

                    const groups = Array.from(grouped.entries()).map(([groupKey, g]) => {
                      const precedence: ScopeModeValue[] = ['none', 'own', 'ldd', 'any'];
                      const declared = (() => {
                        const anyOpt = Array.from(g.values.values()).find((x: any) => Array.isArray(x?.scope_modes));
                        const ms = anyOpt?.scope_modes;
                        if (!Array.isArray(ms) || !ms.length) return null;
                        const allowed = ms.map((x: any) => String(x || '').trim().toLowerCase()).filter((x: string) =>
                          ['none', 'own', 'ldd', 'any'].includes(x)
                        ) as ScopeModeValue[];
                        return allowed.length ? allowed : null;
                      })();
                      const valuesToUse = declared || precedence;

                      const effectiveValue = (() => {
                        // most restrictive wins
                        for (const v of precedence) {
                          const row = g.values.get(v);
                          if (row) return v;
                        }
                        return 'none' as ScopeModeValue;
                      })();

                      return { groupKey, values: g.values, valuesToUse, effectiveValue };
                    });

                    // Attach non-scope actions like create under base ids
                    const attachedByBase = new Map<string, any[]>();
                    for (const a of other) {
                      const baseId = baseIdFromActionKey(a.key);
                      if (!baseId) continue;
                      if (!attachedByBase.has(baseId)) attachedByBase.set(baseId, []);
                      attachedByBase.get(baseId)!.push(a);
                    }

                    const onTogglePack = () => {
                      setExpandedPacks((prev) => {
                        const next = new Set(prev);
                        if (next.has(pack.id)) next.delete(pack.id);
                        else next.add(pack.id);
                        return next;
                      });
                    };

                    return (
                      <div key={pack.id} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={onTogglePack}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Package size={16} className="text-gray-500" />
                            <span className="font-semibold">{pack.title || titleCase(pack.name)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <KeyRound size={14} className="text-gray-400" />
                              {pack.actions.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 size={14} className="text-gray-400" />
                              {pack.metrics.length}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t p-3 space-y-4">
                            {/* Scope groups */}
                            {groups.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500">Scope</div>
                                {groups.map((g) => {
                                  const eff = g.effectiveValue;
                                  const groupKeysByMode = (mode: ScopeModeValue) => {
                                    const row = g.values.get(mode);
                                    return row ? [String(row.key)] : [];
                                  };
                                  const explain = () => {
                                    const lines: string[] = [];
                                    lines.push(`Group: ${g.groupKey}`);
                                    for (const mode of ['none', 'own', 'ldd', 'any'] as ScopeModeValue[]) {
                                      const row = g.values.get(mode);
                                      if (!row) continue;
                                      const sources = (effectivePerms?.sources?.actions?.[String(row.key)] || []) as string[];
                                      const named = sources.map((id: string) => permSetNameById.get(id) || id);
                                      const implied =
                                        !sources.length && Boolean(effectivePerms?.has_default_access) && Boolean(row.default_enabled) && defaultAccessPsId
                                          ? [permSetNameById.get(defaultAccessPsId) || defaultAccessPsId]
                                          : [];
                                      const all = named.length ? named : implied;
                                      lines.push(`${mode.toUpperCase()}: ${all.length ? all.join(', ') : '—'}`);
                                    }
                                    setExplainTitle(`Explain: ${g.groupKey} (effective=${eff.toUpperCase()})`);
                                    setExplainLines(lines);
                                    setExplainOpen(true);
                                  };

                                  return (
                                    <div key={g.groupKey} className="flex items-center justify-between gap-3 px-2 py-2 rounded border border-gray-200 dark:border-gray-800">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{g.groupKey}</div>
                                        <div className="text-xs text-gray-500">Effective: {shortLabelForValue(eff)}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="default" className="text-xs">{shortLabelForValue(eff)}</Badge>
                                        <Button size="sm" variant="ghost" onClick={explain}>
                                          Explain why
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Create + other actions */}
                            {other.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500">Actions</div>
                                {other.map((a: any) => {
                                  const sources = (a.sources || []) as string[];
                                  const named = sources.map((id: string) => permSetNameById.get(id) || id);
                                  const implied =
                                    !sources.length && a.isDefault && defaultAccessPsId
                                      ? [permSetNameById.get(defaultAccessPsId) || defaultAccessPsId]
                                      : [];
                                  const explain = () => {
                                    setExplainTitle(`Explain: ${a.key}`);
                                    setExplainLines([
                                      `Action: ${a.key}`,
                                      `Label: ${a.label}`,
                                      `Source: ${named.length ? named.join(', ') : implied.length ? implied.join(', ') : '—'}`,
                                    ]);
                                    setExplainOpen(true);
                                  };
                                  return (
                                    <div key={a.key} className="flex items-center justify-between gap-3 px-2 py-2 rounded border border-gray-200 dark:border-gray-800">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{a.label}</div>
                                        <div className="text-xs font-mono text-gray-500 truncate">{a.key}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="success" className="text-xs">enabled</Badge>
                                        <Button size="sm" variant="ghost" onClick={explain}>
                                          Explain why
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Metrics */}
                            {pack.metrics.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500">Metrics</div>
                                {pack.metrics.map((m: any) => {
                                  const sources = (m.sources || []) as string[];
                                  const named = sources.map((id: string) => permSetNameById.get(id) || id);
                                  const explain = () => {
                                    setExplainTitle(`Explain: ${m.key}`);
                                    setExplainLines([
                                      `Metric: ${m.key}`,
                                      `Label: ${m.label}`,
                                      `Source: ${named.length ? named.join(', ') : m.explicit ? '—' : 'catalog default (unprotected)'}`,
                                    ]);
                                    setExplainOpen(true);
                                  };
                                  return (
                                    <div key={m.key} className="flex items-center justify-between gap-3 px-2 py-2 rounded border border-gray-200 dark:border-gray-800">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{m.label}</div>
                                        <div className="text-xs font-mono text-gray-500 truncate">{m.key}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="default" className="text-xs">{m.unit || 'metric'}</Badge>
                                        <Button size="sm" variant="ghost" onClick={explain}>
                                          Explain why
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!packs.length ? <div className="text-sm text-gray-500 py-6 text-center">No matching items</div> : null}
                </div>
              )}

              <Modal open={explainOpen} onClose={() => setExplainOpen(false)} title={explainTitle}>
                <div className="space-y-2">
                  {explainLines.map((l, idx) => (
                    <div key={idx} className="text-sm text-gray-700 dark:text-gray-200 font-mono whitespace-pre-wrap">
                      {l}
                    </div>
                  ))}
                </div>
              </Modal>
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



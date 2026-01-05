'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Shield,
  Users,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Search,
  Package,
  FileText,
  KeyRound,
  BarChart3,
  CheckCircle,
  XCircle,
  Crown,
  UsersRound,
  UserCheck,
} from 'lucide-react';
import { useUi, type BreadcrumbItem } from '@hit/ui-kit';
import {
  usePermissionSet,
  usePermissionSetMutations,
  usePermissionActions,
  useUsers,
  useGroups,
  useMetricsCatalog,
  type PermissionSetAssignment,
  type PermissionSetPageGrant,
  type PermissionSetActionGrant,
  type PermissionSetMetricGrant,
} from '../hooks/useAuthAdmin';

interface SecurityGroupDetailProps {
  id: string;
  onNavigate?: (path: string) => void;
}

export default function SecurityGroupDetailPage(props: SecurityGroupDetailProps) {
  return <SecurityGroupDetail {...props} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  const x = String(s || '').trim();
  if (!x) return '';
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function normalizePath(p: string): string {
  const x = String(p || '').trim();
  if (!x) return '';
  if (x === '/') return '/';
  return x.startsWith('/') ? x.replace(/\/+$/, '') : `/${x.replace(/\/+$/, '')}`;
}

type GeneratedRoute = {
  path: string;
  packName: string;
  componentName: string;
  shell: boolean;
};

type ActionCatalogItem = {
  key: string;
  pack_name: string | null;
  pack_title: string | null;
  label: string;
  description: string | null;
  default_enabled: boolean;
};

function isAdminishPath(path: string): boolean {
  const p = String(path || '');
  return p.startsWith('/admin') || p.startsWith('/setup') || p.startsWith('/settings');
}

function pageGrantCandidates(path: string): string[] {
  const p = normalizePath(path);
  const segs = p.split('/').filter(Boolean);
  const out: string[] = [p, '/*'];
  let cur = '';
  for (const s of segs) {
    cur += `/${s}`;
    out.push(`${cur}/*`);
  }
  return Array.from(new Set(out));
}

async function loadShellPages(): Promise<Array<{ path: string; label: string; packName: string; packTitle: string | null; defaultEnabled: boolean }>> {
  try {
    const routesMod = await import('@/.hit/generated/routes');
    const featurePackRoutes: GeneratedRoute[] = (routesMod as any).featurePackRoutes || [];
    const authRoutes: string[] = (routesMod as any).authRoutes || [];

    const pages = featurePackRoutes
      .filter((r) => r && typeof r.path === 'string')
      .filter((r) => Boolean((r as any).shell))
      .filter((r) => !authRoutes.includes(String(r.path)))
      .filter((r) => String(r.path) !== '/')
      .map((r) => ({
        path: normalizePath(r.path),
        label: r.componentName,
        packName: r.packName,
        packTitle: typeof (r as any)?.packTitle === 'string' ? String((r as any).packTitle) : null,
        // Must mirror `/api/permissions/catalog` policy:
        // 1.0 default policy: non-adminish shell pages default-allow for Default Access.
        defaultEnabled: Boolean((r as any).shell) && !isAdminishPath(String(r.path)),
      }));

    return Array.from(new Map(pages.map((p) => [p.path, p])).values()).sort((a, b) =>
      a.path.localeCompare(b.path)
    );
  } catch (e) {
    console.warn('Could not load generated routes:', e);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function SecurityGroupDetail({ id, onNavigate }: SecurityGroupDetailProps) {
  const { Page, Card, Button, Badge, Modal, Input, Alert, Spinner, Checkbox } = useUi();

  const { data: detail, loading, error, refresh } = usePermissionSet(id);
  const { data: actionDefs, loading: actionsLoading } = usePermissionActions();
  const { data: groups } = useGroups();
  const { data: usersData, loading: usersLoading } = useUsers({ page: 1, pageSize: 1000 });
  const { data: metricsCatalog, loading: metricsLoading } = useMetricsCatalog();
  const mutations = usePermissionSetMutations();

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Assignments modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignType, setAssignType] = useState<'role' | 'group' | 'user'>('role');
  const [assignId, setAssignId] = useState('');

  // Grants
  const [search, setSearch] = useState('');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [pages, setPages] = useState<Array<{ path: string; label: string; packName: string; packTitle: string | null; defaultEnabled: boolean }>>([]);
  const [pagesLoading, setPagesLoading] = useState(true);

  // Tab state for switching between Pages/Actions and Metrics
  const [activeTab, setActiveTab] = useState<'pages_actions' | 'metrics'>('pages_actions');
  const [metricsSearch, setMetricsSearch] = useState('');

  // Pending metric changes (batch editing)
  // Map of metricKey -> desired state (true = grant, false = revoke)
  const [pendingMetricChanges, setPendingMetricChanges] = useState<Map<string, boolean>>(new Map());
  const [savingMetrics, setSavingMetrics] = useState(false);

  const permissionSet = detail?.permission_set ?? null;
  const assignments: PermissionSetAssignment[] = (detail?.assignments ?? []) as PermissionSetAssignment[];
  const pageGrants: PermissionSetPageGrant[] = (detail?.page_grants ?? []) as PermissionSetPageGrant[];
  const actionGrants: PermissionSetActionGrant[] = (detail?.action_grants ?? []) as PermissionSetActionGrant[];
  const metricGrants: PermissionSetMetricGrant[] = (detail?.metric_grants ?? []) as PermissionSetMetricGrant[];

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  // Load pages on mount
  useEffect(() => {
    let cancelled = false;
    setPagesLoading(true);
    loadShellPages()
      .then((xs) => {
        if (cancelled) return;
        setPages(xs);
      })
      .finally(() => {
        if (!cancelled) setPagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────────────────

  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups || []) {
      if (g?.id && g?.name) m.set(String(g.id), String(g.name));
    }
    return m;
  }, [groups]);

  const roleSuggestions = useMemo(() => {
    const roles = new Set<string>();
    roles.add('admin');
    roles.add('user');
    for (const u of usersData?.items || []) {
      const r = (u as any)?.role;
      if (typeof r === 'string' && r.trim()) roles.add(r.trim());
    }
    return Array.from(roles).sort();
  }, [usersData]);

  // Parse action catalog
  const actionCatalog: ActionCatalogItem[] = useMemo(() => {
    const xs = Array.isArray(actionDefs) ? (actionDefs as any[]) : [];
    return xs
      .map((a: any) => ({
        key: String(a?.key || '').trim(),
        pack_name: typeof a?.pack_name === 'string' && a.pack_name.trim() ? a.pack_name.trim() : null,
        pack_title: typeof a?.pack_title === 'string' && a.pack_title.trim() ? a.pack_title.trim() : null,
        label: String(a?.label || a?.key || '').trim(),
        description: typeof a?.description === 'string' ? a.description : null,
        default_enabled: Boolean(a?.default_enabled),
      }))
      .filter((a) => Boolean(a.key));
  }, [actionDefs]);

  // Grant lookups
  const pageGrantSet = useMemo(() => {
    const s = new Set<string>();
    for (const g of pageGrants) s.add(String((g as any).page_path));
    return s;
  }, [pageGrants]);

  const pageGrantIdByPath = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of pageGrants) m.set(String((g as any).page_path), String((g as any).id));
    return m;
  }, [pageGrants]);

  const actionGrantSet = useMemo(() => {
    const s = new Set<string>();
    for (const g of actionGrants) s.add(String((g as any).action_key));
    return s;
  }, [actionGrants]);

  const actionGrantIdByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of actionGrants) m.set(String((g as any).action_key), String((g as any).id));
    return m;
  }, [actionGrants]);

  const metricGrantIdByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of metricGrants) m.set(String((g as any).metric_key), String((g as any).id));
    return m;
  }, [metricGrants]);

  // Group pages and actions by feature pack (metrics are separate)
  const packData = useMemo(() => {
    const packs = new Map<string, {
      title: string | null;
      pages: Array<{ path: string; label: string; default_enabled: boolean; explicit: boolean; effective: boolean; via?: string }>;
      actions: Array<ActionCatalogItem & { explicit: boolean; effective: boolean }>;
    }>();

    // Add pages
    for (const p of pages) {
      const pack = p.packName || 'unknown';
      if (!packs.has(pack)) packs.set(pack, { title: p.packTitle, pages: [], actions: [] });
      else if (!packs.get(pack)!.title && p.packTitle) packs.get(pack)!.title = p.packTitle;
      const candidates = pageGrantCandidates(p.path);
      let explicit = false;
      let effective = false;
      let via: string | undefined;

      // Default allow (catalog)
      if (p.defaultEnabled) {
        effective = true;
        via = 'default';
      }

      // Explicit grants in this permission set (exact/subtree + inherited subtrees)
      for (const c of candidates) {
        if (pageGrantSet.has(c)) {
          effective = true;
          via = c;
          // explicit if it's exactly this node (exact or node subtree), not inherited from ancestor
          const norm = normalizePath(p.path);
          explicit = (c === norm) || (c === `${norm}/*`) || (c === '/*' && norm === '/');
          break;
        }
      }

      packs.get(pack)!.pages.push({
        path: p.path,
        label: p.label,
        default_enabled: p.defaultEnabled,
        explicit,
        effective,
        via,
      });
    }

    // Add actions
    for (const a of actionCatalog) {
      const pack = a.pack_name || a.key.split('.')[0] || 'unknown';
      if (!packs.has(pack)) packs.set(pack, { title: a.pack_title, pages: [], actions: [] });
      else if (!packs.get(pack)!.title && a.pack_title) packs.get(pack)!.title = a.pack_title;
      const explicit = actionGrantSet.has(a.key);
      const effective = Boolean(a.default_enabled || explicit);
      packs.get(pack)!.actions.push({ ...a, explicit, effective });
    }

    // Sort packs and filter out empty ones
    return Array.from(packs.entries())
      .filter(([, data]) => data.pages.length > 0 || data.actions.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, data]) => ({
        name,
        ...data,
        pageCount: data.pages.length,
        effectivePages: data.pages.filter((p) => p.effective).length,
        explicitPages: data.pages.filter((p) => p.explicit).length,
        actionCount: data.actions.length,
        effectiveActions: data.actions.filter((a) => a.effective).length,
        explicitActions: data.actions.filter((a) => a.explicit).length,
      }));
  }, [pages, actionCatalog, pageGrantSet, actionGrantSet]);

  // Metrics organized by owner type (App vs Feature Pack)
  const metricsData = useMemo(() => {
    const appMetrics: Array<{ key: string; label: string; unit: string; category?: string; description?: string; checked: boolean; hasPendingChange: boolean }> = [];
    const fpMetrics = new Map<string, {
      packId: string;
      metrics: Array<{ key: string; label: string; unit: string; category?: string; description?: string; checked: boolean; hasPendingChange: boolean }>;
    }>();

    for (const m of metricsCatalog || []) {
      const currentlyGranted = metricGrantIdByKey.has(m.key);
      const pendingState = pendingMetricChanges.get(m.key);
      const effectiveState = pendingState !== undefined ? pendingState : currentlyGranted;
      const hasPendingChange = pendingState !== undefined && pendingState !== currentlyGranted;

      const metricEntry = {
        key: m.key,
        label: m.label,
        unit: m.unit,
        category: m.category,
        description: m.description,
        checked: effectiveState,
        hasPendingChange,
      };

      if (m.owner?.kind === 'feature_pack' && m.owner.id) {
        const packId = m.owner.id;
        if (!fpMetrics.has(packId)) {
          fpMetrics.set(packId, { packId, metrics: [] });
        }
        fpMetrics.get(packId)!.metrics.push(metricEntry);
      } else {
        // App-level or user-defined metrics
        appMetrics.push(metricEntry);
      }
    }

    // Count based on effective state (including pending)
    let effectiveGrantedCount = 0;
    for (const m of metricsCatalog || []) {
      const currentlyGranted = metricGrantIdByKey.has(m.key);
      const pendingState = pendingMetricChanges.get(m.key);
      if (pendingState !== undefined ? pendingState : currentlyGranted) {
        effectiveGrantedCount++;
      }
    }

    return {
      appMetrics,
      featurePackMetrics: Array.from(fpMetrics.values()).sort((a, b) => a.packId.localeCompare(b.packId)),
      totalCount: (metricsCatalog || []).length,
      grantedCount: effectiveGrantedCount,
    };
  }, [metricsCatalog, metricGrantIdByKey, pendingMetricChanges]);

  // Filter metrics by search
  const filteredMetricsData = useMemo(() => {
    const q = metricsSearch.trim().toLowerCase();
    if (!q) return metricsData;

    type MetricEntry = { key: string; label: string; unit: string; category?: string; description?: string; checked: boolean; hasPendingChange: boolean };
    const filterMetrics = (arr: MetricEntry[]) =>
      arr.filter((m) =>
        m.key.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
      );

    return {
      appMetrics: filterMetrics(metricsData.appMetrics),
      featurePackMetrics: metricsData.featurePackMetrics
        .map((fp) => ({ ...fp, metrics: filterMetrics(fp.metrics) }))
        .filter((fp) => fp.metrics.length > 0),
      totalCount: metricsData.totalCount,
      grantedCount: metricsData.grantedCount,
    };
  }, [metricsData, metricsSearch]);

  // Filter by search (pages and actions only)
  const filteredPacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packData;
    return packData.filter((pack) => {
      if (pack.name.toLowerCase().includes(q)) return true;
      if (pack.pages.some((p) => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))) return true;
      if (pack.actions.some((a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [packData, search]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!permissionSet) return;
    setEditName(permissionSet.name);
    setEditDescription(permissionSet.description || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!permissionSet) return;
    await mutations.updatePermissionSet(id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
    setIsEditing(false);
    refresh();
  };

  const handleDelete = async () => {
    await mutations.deletePermissionSet(id);
    navigate('/admin/security-groups');
  };

  const handleAddAssignment = async () => {
    const pid = assignId.trim();
    if (!pid) return;
    await mutations.addAssignment(id, assignType, pid);
    setAssignId('');
    setAssignOpen(false);
    refresh();
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    await mutations.removeAssignment(id, assignmentId);
    refresh();
  };

  const togglePack = (packName: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packName)) next.delete(packName);
      else next.add(packName);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPacks(new Set(packData.map((p) => p.name)));
  };

  const collapseAll = () => {
    setExpandedPacks(new Set());
  };

  const togglePageGrant = async (path: string) => {
    const normalized = normalizePath(path);
    if (pageGrantSet.has(normalized)) {
      const gid = pageGrantIdByPath.get(normalized);
      if (gid) await mutations.removePageGrant(id, gid);
    } else {
      await mutations.addPageGrant(id, normalized);
    }
    refresh();
  };

  const toggleActionGrant = async (actionKey: string) => {
    if (actionGrantSet.has(actionKey)) {
      const gid = actionGrantIdByKey.get(actionKey);
      if (gid) await mutations.removeActionGrant(id, gid);
    } else {
      await mutations.addActionGrant(id, actionKey);
    }
    refresh();
  };

  // Toggle metric in local state (batch editing - doesn't save immediately)
  const toggleMetricLocal = (metricKey: string) => {
    setPendingMetricChanges((prev) => {
      const next = new Map(prev);
      const currentlyGranted = metricGrantIdByKey.has(metricKey);
      const pendingState = next.get(metricKey);

      if (pendingState === undefined) {
        // No pending change yet - toggle from current state
        next.set(metricKey, !currentlyGranted);
      } else if (pendingState === currentlyGranted) {
        // Pending change matches current state - remove the pending change
        next.delete(metricKey);
      } else {
        // Toggle the pending state
        next.set(metricKey, !pendingState);
      }
      return next;
    });
  };

  // Enable/disable all metrics
  const enableAllMetrics = () => {
    const allKeys = (metricsCatalog || []).map((m) => m.key);
    setPendingMetricChanges((prev) => {
      const next = new Map(prev);
      for (const key of allKeys) {
        const currentlyGranted = metricGrantIdByKey.has(key);
        if (!currentlyGranted) {
          next.set(key, true);
        } else {
          next.delete(key); // Already granted, no change needed
        }
      }
      return next;
    });
  };

  const disableAllMetrics = () => {
    const allKeys = (metricsCatalog || []).map((m) => m.key);
    setPendingMetricChanges((prev) => {
      const next = new Map(prev);
      for (const key of allKeys) {
        const currentlyGranted = metricGrantIdByKey.has(key);
        if (currentlyGranted) {
          next.set(key, false);
        } else {
          next.delete(key); // Already not granted, no change needed
        }
      }
      return next;
    });
  };

  const discardMetricChanges = () => {
    setPendingMetricChanges(new Map());
  };

  // Save all pending metric changes
  const saveMetricChanges = async () => {
    if (pendingMetricChanges.size === 0) return;
    setSavingMetrics(true);
    try {
      const promises: Promise<void>[] = [];
      for (const [metricKey, shouldGrant] of pendingMetricChanges) {
        const grantId = metricGrantIdByKey.get(metricKey);
        if (shouldGrant && !grantId) {
          // Need to add grant
          promises.push(mutations.addMetricGrant(id, metricKey).then(() => void 0));
        } else if (!shouldGrant && grantId) {
          // Need to remove grant
          promises.push(mutations.removeMetricGrant(id, grantId).then(() => void 0));
        }
      }
      await Promise.all(promises);
      setPendingMetricChanges(new Map());
      refresh();
    } finally {
      setSavingMetrics(false);
    }
  };

  // Count of actual pending changes (changes that differ from current state)
  const pendingMetricChangeCount = useMemo(() => {
    let count = 0;
    for (const [key, desiredState] of pendingMetricChanges) {
      const currentlyGranted = metricGrantIdByKey.has(key);
      if (desiredState !== currentlyGranted) count++;
    }
    return count;
  }, [pendingMetricChanges, metricGrantIdByKey]);


  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading || pagesLoading || actionsLoading || metricsLoading) {
    return (
      <Page
        title="Loading..."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Security Groups', href: '/admin/security-groups' },
        ]}
        onNavigate={navigate}
      >
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </Page>
    );
  }

  if (error || !permissionSet) {
    return (
      <Page
        title="Not Found"
        breadcrumbs={[
          { label: 'Admin', href: '/admin', icon: <Shield size={14} /> },
          { label: 'Security Groups', href: '/admin/security-groups' },
        ]}
        onNavigate={navigate}
      >
        <Alert variant="error">{error?.message || 'Security group not found'}</Alert>
      </Page>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Admin', href: '/admin', icon: <Shield size={14} /> },
    { label: 'Security Groups', href: '/admin/security-groups', icon: <Lock size={14} /> },
    { label: permissionSet.name },
  ];

  return (
    <Page
      title={
        isEditing ? (
          <Input value={editName} onChange={setEditName} placeholder="Group name" />
        ) : (
          permissionSet.name
        )
      }
      description={permissionSet.description || 'No description'}
      breadcrumbs={breadcrumbs}
      onNavigate={navigate}
      actions={
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                <X size={16} className="mr-1" /> Cancel
              </Button>
              <Button variant="primary" onClick={() => handleSaveEdit().catch(() => void 0)} disabled={!editName.trim()}>
                <Save size={16} className="mr-1" /> Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEdit}>
                <Edit2 size={16} className="mr-1" /> Edit
              </Button>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} className="mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
      }
    >
      {isEditing ? (
        <Card className="mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input value={editDescription} onChange={setEditDescription} placeholder="Description (optional)" />
            </div>
            <div className="text-xs text-gray-500">
              Tip: name/description changes don’t affect permissions; they just help organization.
            </div>
          </div>
        </Card>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────
          ASSIGNMENTS SECTION
      ───────────────────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <h3 className="font-semibold">Assigned To</h3>
            <Badge variant="default">{assignments.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-sm text-gray-500">No assignments yet. Add roles, groups, or users.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => {
              const displayName =
                a.principal_type === 'group'
                  ? groupNameById.get(a.principal_id) || a.principal_id
                  : a.principal_id;
              const Icon = a.principal_type === 'role' ? Crown : a.principal_type === 'group' ? UsersRound : UserCheck;
              const variant = a.principal_type === 'role' ? 'info' : a.principal_type === 'group' ? 'warning' : 'success';

              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm group"
                >
                  <Icon size={14} className="text-gray-500" />
                  <Badge variant={variant} className="text-xs">{a.principal_type}</Badge>
                  <span className="font-medium">{displayName}</span>
                  <button
                    onClick={() => handleRemoveAssignment(a.id).catch(() => void 0)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────
          TABS: Pages & Actions | Metrics
      ───────────────────────────────────────────────────────────────────── */}
      <Card>
        {/* Tab Header */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
          <button
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'pages_actions' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pages_actions')}
          >
            <Package size={16} />
            Pages & Actions
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'metrics' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('metrics')}
          >
            <BarChart3 size={16} />
            Metrics
            {metricsData.grantedCount > 0 && (
              <Badge variant="info" className="text-xs">{metricsData.grantedCount}/{metricsData.totalCount}</Badge>
            )}
          </button>
        </div>

        {activeTab === 'pages_actions' && (
          <>
            {/* Legend */}
            <Alert variant="info" className="mb-4">
              <div className="text-sm space-y-1">
                <div><strong>Legend:</strong></div>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-green-500">●</span> <span>Default Allow</span> <span className="text-gray-500">- everyone has access, no grant needed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500">●</span> <span>Default Deny</span> <span className="text-gray-500">- requires explicit grant</span>
                  </div>
                </div>
                <div className="text-gray-500 text-xs mt-2">
                  Note: Admins bypass all permission checks. "Effective" is read-only; "Grant" is the explicit toggle from THIS security group.
                </div>
              </div>
            </Alert>

            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages, actions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse</Button>
              </div>
            </div>

        {/* Feature Pack List */}
        <div className="space-y-2">
          {filteredPacks.map((pack) => {
            const isExpanded = expandedPacks.has(pack.name);
            const hasEffective = pack.effectivePages > 0 || pack.effectiveActions > 0;

            return (
              <div key={pack.name} className="border rounded-lg overflow-hidden">
                {/* Pack Header */}
                <button
                  onClick={() => togglePack(pack.name)}
                  className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                    hasEffective ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <Package size={18} className="text-gray-500" />
                    <span className="font-semibold">{pack.title || titleCase(pack.name)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {pack.pageCount > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText size={14} className="text-gray-400" />
                        <span className={pack.effectivePages > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                          {pack.effectivePages}/{pack.pageCount}
                        </span>
                        {pack.explicitPages > 0 ? (
                          <span className="text-gray-400">({pack.explicitPages} explicit)</span>
                        ) : null}
                      </div>
                    )}
                    {pack.actionCount > 0 && (
                      <div className="flex items-center gap-1">
                        <KeyRound size={14} className="text-gray-400" />
                        <span className={pack.effectiveActions > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          {pack.effectiveActions}/{pack.actionCount}
                        </span>
                        {pack.explicitActions > 0 ? (
                          <span className="text-gray-400">({pack.explicitActions} explicit)</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </button>

                {/* Pack Content */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    {/* Pages */}
                    {pack.pages.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText size={16} className="text-blue-500" />
                          <span className="text-sm font-medium text-gray-600">Pages</span>
                          <span className="text-xs text-gray-400">
                            ({pack.pages.filter(p => p.default_enabled).length} default-allow,{' '}
                            {pack.pages.filter(p => !p.default_enabled).length} default-deny)
                          </span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {pack.pages.map((p) => (
                            <div
                              key={p.path}
                              className={`flex items-center justify-between py-1.5 px-2 rounded ${
                                p.explicit ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' : ''
                              } hover:bg-gray-50 dark:hover:bg-gray-800`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-sm truncate">{p.label}</span>
                                <span className="text-xs text-gray-500 truncate">{p.path}</span>
                                {p.default_enabled ? (
                                  <Badge variant="success" className="text-xs">default-allow</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">default-deny</Badge>
                                )}
                                {p.explicit ? (
                                  <Badge variant="info" className="text-xs">explicit</Badge>
                                ) : (p.effective && p.via && p.via !== 'default') ? (
                                  <Badge variant="default" className="text-xs">via {p.via}</Badge>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Effective:</span>
                                  <Checkbox checked={Boolean(p.effective)} disabled={true} onChange={() => void 0} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Grant:</span>
                                <Checkbox
                                  checked={p.explicit}
                                  onChange={() => togglePageGrant(p.path).catch(() => void 0)}
                                  disabled={mutations.loading}
                                />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {pack.actions.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <KeyRound size={16} className="text-green-500" />
                          <span className="text-sm font-medium text-gray-600">Actions</span>
                          <span className="text-xs text-gray-400">
                            ({pack.actions.filter(a => a.default_enabled).length} default-allow,{' '}
                            {pack.actions.filter(a => !a.default_enabled).length} default-deny)
                          </span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {pack.actions.map((a) => {
                            return (
                              <div
                                key={a.key}
                                className={`flex items-center justify-between py-1.5 px-2 rounded ${
                                  a.explicit && !a.default_enabled
                                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                                    : a.default_enabled
                                    ? 'bg-green-50/30 dark:bg-green-900/5'
                                    : ''
                                } hover:bg-gray-50 dark:hover:bg-gray-800`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-medium text-sm truncate">{a.label}</span>
                                  <span className="text-xs text-gray-500 font-mono truncate">{a.key}</span>
                                  {a.default_enabled ? (
                                    <Badge variant="success" className="text-xs">default-allow</Badge>
                                  ) : a.explicit ? (
                                    <Badge variant="info" className="text-xs">granted</Badge>
                                  ) : (
                                    <Badge variant="warning" className="text-xs">default-deny</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Effective:</span>
                                    <Checkbox checked={Boolean(a.effective)} disabled={true} onChange={() => void 0} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Grant:</span>
                                  <Checkbox
                                    checked={a.explicit}
                                    onChange={() => toggleActionGrant(a.key).catch(() => void 0)}
                                    disabled={mutations.loading}
                                  />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {pack.pages.length === 0 && pack.actions.length === 0 && (
                      <div className="p-4 text-sm text-gray-500">No items in this pack</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredPacks.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              {search ? 'No matching items' : 'No feature packs found'}
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'metrics' && (
          <>
            {/* Metrics Legend */}
            <Alert variant="info" className="mb-4">
              <div className="text-sm">
                <strong>All metrics are default-deny.</strong> Toggle checkboxes to select which metrics this security group can access, then click Save.
                <div className="text-gray-500 text-xs mt-1">
                  Note: Admins bypass all permission checks and can see all metrics.
                </div>
              </div>
            </Alert>

            {/* Metrics Actions Bar */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={metricsSearch}
                  onChange={(e) => setMetricsSearch(e.target.value)}
                  placeholder="Search metrics..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={enableAllMetrics} disabled={savingMetrics}>
                  Enable All
                </Button>
                <Button variant="ghost" size="sm" onClick={disableAllMetrics} disabled={savingMetrics}>
                  Disable All
                </Button>
                {pendingMetricChangeCount > 0 && (
                  <>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Badge variant="warning" className="text-xs">
                      {pendingMetricChangeCount} unsaved change{pendingMetricChangeCount !== 1 ? 's' : ''}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={discardMetricChanges} disabled={savingMetrics}>
                      Discard
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => saveMetricChanges().catch(() => void 0)} loading={savingMetrics}>
                      <Save size={14} className="mr-1" /> Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* App Metrics */}
            {filteredMetricsData.appMetrics.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={18} className="text-orange-500" />
                  <h4 className="font-semibold">App Metrics</h4>
                  <Badge variant="default" className="text-xs">
                    {metricsData.appMetrics.filter((m) => m.checked).length}/{metricsData.appMetrics.length} selected
                  </Badge>
                </div>
                <div className="space-y-1 border rounded-lg p-3">
                  {filteredMetricsData.appMetrics.map((m) => (
                    <div
                      key={m.key}
                      className={`flex items-center justify-between py-2 px-3 rounded ${
                        m.hasPendingChange
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                          : m.checked
                            ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                            : ''
                      } hover:bg-gray-50 dark:hover:bg-gray-800`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">{m.label}</span>
                        <span className="text-xs text-gray-500 font-mono truncate">{m.key}</span>
                        <Badge variant="default" className="text-xs">{m.unit}</Badge>
                        {m.hasPendingChange && <Badge variant="warning" className="text-xs">unsaved</Badge>}
                      </div>
                      <Checkbox
                        checked={m.checked}
                        onChange={() => toggleMetricLocal(m.key)}
                        disabled={savingMetrics}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature Pack Metrics */}
            {filteredMetricsData.featurePackMetrics.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-blue-500" />
                  <h4 className="font-semibold">Feature Pack Metrics</h4>
                </div>
                <div className="space-y-4">
                  {filteredMetricsData.featurePackMetrics.map((fp) => {
                    const selectedInPack = fp.metrics.filter((m) => m.checked).length;
                    return (
                      <div key={fp.packId} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-500" />
                            <span className="font-medium">{titleCase(fp.packId)}</span>
                          </div>
                          <Badge variant={selectedInPack > 0 ? 'info' : 'default'} className="text-xs">
                            {selectedInPack}/{fp.metrics.length} selected
                          </Badge>
                        </div>
                        <div className="p-3 space-y-1">
                          {fp.metrics.map((m) => (
                            <div
                              key={m.key}
                              className={`flex items-center justify-between py-2 px-3 rounded ${
                                m.hasPendingChange
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                                  : m.checked
                                    ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                                    : ''
                              } hover:bg-gray-50 dark:hover:bg-gray-800`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="font-medium text-sm truncate">{m.label}</span>
                                <span className="text-xs text-gray-500 font-mono truncate">{m.key}</span>
                                <Badge variant="default" className="text-xs">{m.unit}</Badge>
                                {m.hasPendingChange && <Badge variant="warning" className="text-xs">unsaved</Badge>}
                              </div>
                              <Checkbox
                                checked={m.checked}
                                onChange={() => toggleMetricLocal(m.key)}
                                disabled={savingMetrics}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredMetricsData.appMetrics.length === 0 && filteredMetricsData.featurePackMetrics.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                {metricsSearch ? 'No matching metrics' : (
                  <div>
                    <div className="mb-2">No metrics available.</div>
                    <div className="text-xs">Run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">hit run</code> to generate the metrics catalog.</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────────────── */}

      {/* Delete Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Security Group">
        <div className="space-y-4">
          <Alert variant="warning">
            This will permanently delete <strong>{permissionSet.name}</strong> and revoke all permissions.
          </Alert>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete().catch(() => void 0)} loading={mutations.loading}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Assignment Modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Add Assignment">
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['role', 'group', 'user'] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                  assignType === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'
                }`}
                onClick={() => { setAssignType(t); setAssignId(''); }}
              >
                {titleCase(t)}
              </button>
            ))}
          </div>

          {assignType === 'role' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {roleSuggestions.map((r) => (
                  <Button key={r} variant={assignId === r ? 'primary' : 'secondary'} size="sm" onClick={() => setAssignId(r)}>
                    {r}
                  </Button>
                ))}
              </div>
              <Input value={assignId} onChange={setAssignId} placeholder="Or type custom role..." />
            </div>
          )}

          {assignType === 'group' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(groups || []).map((g) => (
                <button
                  key={g.id}
                  className={`w-full text-left p-3 rounded-lg border ${assignId === g.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setAssignId(g.id)}
                >
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">{g.id}</div>
                </button>
              ))}
            </div>
          )}

          {assignType === 'user' && (
            usersLoading ? <Spinner /> : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(usersData?.items || []).map((u: any) => (
                  <button
                    key={u.email}
                    className={`w-full text-left p-3 rounded-lg border ${assignId === u.email ? 'border-blue-500 bg-blue-50' : ''}`}
                    onClick={() => setAssignId(u.email)}
                  >
                    {u.email}
                  </button>
                ))}
              </div>
            )
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => handleAddAssignment().catch(() => void 0)} disabled={!assignId.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Modal>

    </Page>
  );
}

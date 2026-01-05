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
  type MetricCatalogItem,
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

  // Add grant modal
  const [addGrantOpen, setAddGrantOpen] = useState(false);
  const [addGrantType, setAddGrantType] = useState<'page' | 'action' | 'metric'>('page');
  const [addGrantValue, setAddGrantValue] = useState('');

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

  // Group everything by feature pack
  const packData = useMemo(() => {
    const packs = new Map<string, {
      title: string | null;
      pages: Array<{ path: string; label: string; default_enabled: boolean; explicit: boolean; effective: boolean; via?: string }>;
      actions: Array<ActionCatalogItem & { explicit: boolean; effective: boolean }>;
      metrics: Array<{ key: string; label: string; unit: string; category?: string; description?: string; explicit: boolean; grantId?: string }>;
    }>();

    // Add pages
    for (const p of pages) {
      const pack = p.packName || 'unknown';
      if (!packs.has(pack)) packs.set(pack, { title: p.packTitle, pages: [], actions: [], metrics: [] });
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
      if (!packs.has(pack)) packs.set(pack, { title: a.pack_title, pages: [], actions: [], metrics: [] });
      else if (!packs.get(pack)!.title && a.pack_title) packs.get(pack)!.title = a.pack_title;
      const explicit = actionGrantSet.has(a.key);
      const effective = Boolean(a.default_enabled || explicit);
      packs.get(pack)!.actions.push({ ...a, explicit, effective });
    }

    // Add metrics from catalog (group by owner pack or first segment of key)
    for (const m of metricsCatalog || []) {
      const packName = m.owner?.kind === 'feature_pack' && m.owner.id ? m.owner.id : (m.key.split('.')[0] || 'app');
      if (!packs.has(packName)) packs.set(packName, { title: null, pages: [], actions: [], metrics: [] });
      const grantId = metricGrantIdByKey.get(m.key);
      packs.get(packName)!.metrics.push({
        key: m.key,
        label: m.label,
        unit: m.unit,
        category: m.category,
        description: m.description,
        explicit: Boolean(grantId),
        grantId,
      });
    }

    // Sort packs
    return Array.from(packs.entries())
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
        metricCount: data.metrics.length,
        explicitMetrics: data.metrics.filter((m) => m.explicit).length,
      }));
  }, [pages, actionCatalog, pageGrantSet, actionGrantSet, metricsCatalog, metricGrantIdByKey]);

  // Filter by search
  const filteredPacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packData;
    return packData.filter((pack) => {
      if (pack.name.toLowerCase().includes(q)) return true;
      if (pack.pages.some((p) => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))) return true;
      if (pack.actions.some((a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q))) return true;
      if (pack.metrics.some((m) => m.key.toLowerCase().includes(q))) return true;
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

  const removeMetricGrant = async (grantId: string) => {
    await mutations.removeMetricGrant(id, grantId);
    refresh();
  };

  const toggleMetricGrant = async (metricKey: string) => {
    const grantId = metricGrantIdByKey.get(metricKey);
    if (grantId) {
      await mutations.removeMetricGrant(id, grantId);
    } else {
      await mutations.addMetricGrant(id, metricKey);
    }
    refresh();
  };

  const handleAddGrant = async () => {
    const val = addGrantValue.trim();
    if (!val) return;
    if (addGrantType === 'page') {
      await mutations.addPageGrant(id, val.startsWith('/') ? val : `/${val}`);
    } else if (addGrantType === 'action') {
      await mutations.addActionGrant(id, val);
    } else {
      await mutations.addMetricGrant(id, val);
    }
    setAddGrantValue('');
    setAddGrantOpen(false);
    refresh();
  };

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
          GRANTS BY FEATURE PACK
      ───────────────────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-gray-500" />
            <h3 className="font-semibold">Grants by Feature Pack</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse</Button>
            <Button size="sm" onClick={() => setAddGrantOpen(true)}>
              <Plus size={14} className="mr-1" /> Add Grant
            </Button>
          </div>
        </div>

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
              Note: Admins bypass all permission checks. “Effective” is read-only; “Grant” is the explicit toggle from THIS security group.
            </div>
          </div>
        </Alert>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages, actions, metrics..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Feature Pack List */}
        <div className="space-y-2">
          {filteredPacks.map((pack) => {
            const isExpanded = expandedPacks.has(pack.name);
            const hasEffective = pack.effectivePages > 0 || pack.effectiveActions > 0 || pack.explicitMetrics > 0;

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
                    {pack.metricCount > 0 && (
                      <div className="flex items-center gap-1">
                        <BarChart3 size={14} className="text-gray-400" />
                        <span className={pack.explicitMetrics > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                          {pack.explicitMetrics}/{pack.metricCount}
                        </span>
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

                    {/* Metrics */}
                    {pack.metrics.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 size={16} className="text-orange-500" />
                          <span className="text-sm font-medium text-gray-600">Metrics</span>
                          <span className="text-xs text-gray-400">
                            (all default-deny, {pack.explicitMetrics} granted)
                          </span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {pack.metrics.map((m) => (
                            <div
                              key={m.key}
                              className={`flex items-center justify-between py-1.5 px-2 rounded ${
                                m.explicit ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800' : ''
                              } hover:bg-gray-50 dark:hover:bg-gray-800`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="font-medium text-sm truncate">{m.label}</span>
                                <span className="text-xs text-gray-500 font-mono truncate">{m.key}</span>
                                <Badge variant="warning" className="text-xs">default-deny</Badge>
                                {m.explicit && <Badge variant="info" className="text-xs">granted</Badge>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Grant:</span>
                                <Checkbox
                                  checked={m.explicit}
                                  onChange={() => toggleMetricGrant(m.key).catch(() => void 0)}
                                  disabled={mutations.loading}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pack.pages.length === 0 && pack.actions.length === 0 && pack.metrics.length === 0 && (
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

      {/* Add Grant Modal */}
      <Modal open={addGrantOpen} onClose={() => setAddGrantOpen(false)} title="Add Grant">
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['page', 'action', 'metric'] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                  addGrantType === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'
                }`}
                onClick={() => { setAddGrantType(t); setAddGrantValue(''); }}
              >
                {titleCase(t)}
              </button>
            ))}
          </div>

          {addGrantType === 'metric' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Select Metric</label>
              {(metricsCatalog || []).length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  No metrics available. Run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">hit run</code> to generate the metrics catalog.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(metricsCatalog || [])
                    .filter((m) => !metricGrantIdByKey.has(m.key))
                    .map((m) => (
                      <button
                        key={m.key}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          addGrantValue === m.key
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => setAddGrantValue(m.key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{m.label}</div>
                          <Badge variant="default" className="text-xs">{m.unit}</Badge>
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{m.key}</div>
                        {m.description && (
                          <div className="text-xs text-gray-400 mt-1 truncate">{m.description}</div>
                        )}
                      </button>
                    ))}
                  {(metricsCatalog || []).filter((m) => !metricGrantIdByKey.has(m.key)).length === 0 && (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      All available metrics have already been granted.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">
                {addGrantType === 'page' ? 'Page Path' : 'Action Key'}
              </label>
              <Input
                value={addGrantValue}
                onChange={setAddGrantValue}
                placeholder={addGrantType === 'page' ? '/crm/companies/*' : 'crm.company.create'}
              />
              <div className="text-xs text-gray-500 mt-1">
                {addGrantType === 'page' && 'Use /* for subtree grants'}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddGrantOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => handleAddGrant().catch(() => void 0)} disabled={!addGrantValue.trim()}>
              Add Grant
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

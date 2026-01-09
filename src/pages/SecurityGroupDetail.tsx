'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import type { BreadcrumbItem } from '@hit/ui-kit';
import { useUi } from '@hit/ui-kit';
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
  roles?: string[];
};

type ActionCatalogItem = {
  key: string;
  pack_name: string | null;
  pack_title: string | null;
  label: string;
  description: string | null;
  default_enabled: boolean; // indicates if enabled by default for all users
};

function isAdminishPath(path: string): boolean {
  const p = String(path || '');
  return p.startsWith('/admin') || p.startsWith('/setup') || p.startsWith('/settings');
}

function normalizeRoles(x: unknown): string[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const roles = x
    .map((r) => String(r || '').trim())
    .filter(Boolean)
    .map((r) => r.toLowerCase());
  return roles.length ? roles : [];
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

type ExclusiveActionModeGroup = {
  groupKey: string; // e.g. "crm.read.scope" or "crm.contacts.read.scope"
  label: string; // UI label
  options: Array<{ key: string; value: string; label: string }>;
  precedenceKeys: string[]; // most restrictive -> least restrictive
};

function parseExclusiveActionModeGroup(actionKey: string): { groupKey: string; value: string } | null {
  const m = String(actionKey || '').match(
    /^(crm(?:\.[a-z0-9_-]+)*)\.(read|write|delete)\.scope\.(any|own|ldd)$/
  );
  if (!m) return null;
  return { groupKey: `${m[1]}.${m[2]}.scope`, value: m[3] };
}

function titleFromGroupKey(groupKey: string): string {
  // Keep it simple and readable; prefer explicit known names.
  if (groupKey === 'crm.read.scope') return 'CRM Read Scope';
  if (groupKey === 'crm.write.scope') return 'CRM Write Scope';
  if (groupKey === 'crm.delete.scope') return 'CRM Delete Scope';
  if (groupKey === 'crm.contacts.read.scope') return 'CRM Contacts Read Scope';
  if (groupKey === 'crm.contacts.write.scope') return 'CRM Contacts Write Scope';
  if (groupKey === 'crm.contacts.delete.scope') return 'CRM Contacts Delete Scope';
  return groupKey;
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
        // IMPORTANT: if a route has explicit role requirements, it is NOT default-enabled.
        defaultEnabled:
          Boolean((r as any).shell) &&
          !isAdminishPath(String(r.path)) &&
          !(normalizeRoles((r as any).roles)?.length),
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

  // Scope tree UI state (Actions)
  const [expandedScopeNodes, setExpandedScopeNodes] = useState<Set<string>>(new Set());

  // Pending page/action changes (batch editing like Metrics)
  // Map of key -> desired explicit grant (true=grant, false=revoke)
  const [pendingPageChanges, setPendingPageChanges] = useState<Map<string, boolean>>(new Map());
  const [pendingActionChanges, setPendingActionChanges] = useState<Map<string, boolean>>(new Map());
  const [savingPagesActions, setSavingPagesActions] = useState(false);

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

  const pendingPageChangeCount = useMemo(() => {
    let n = 0;
    for (const [path, desired] of pendingPageChanges.entries()) {
      const cur = pageGrantSet.has(path);
      if (cur !== desired) n++;
    }
    return n;
  }, [pendingPageChanges, pageGrantSet]);

  const pendingActionChangeCount = useMemo(() => {
    let n = 0;
    for (const [key, desired] of pendingActionChanges.entries()) {
      const cur = actionGrantSet.has(key);
      if (cur !== desired) n++;
    }
    return n;
  }, [pendingActionChanges, actionGrantSet]);

  const pendingPagesActionsChangeCount = pendingPageChangeCount + pendingActionChangeCount;

  const isPageExplicitEffective = useCallback((pagePath: string): boolean => {
    const normalized = normalizePath(pagePath);
    const pending = pendingPageChanges.get(normalized);
    if (pending !== undefined) return pending;
    return pageGrantSet.has(normalized);
  }, [pendingPageChanges, pageGrantSet]);

  const isActionExplicitEffective = useCallback((actionKey: string): boolean => {
    const key = String(actionKey || '').trim();
    const pending = pendingActionChanges.get(key);
    if (pending !== undefined) return pending;
    return actionGrantSet.has(key);
  }, [pendingActionChanges, actionGrantSet]);

  const hasPendingPageChange = useCallback((pagePath: string): boolean => {
    const normalized = normalizePath(pagePath);
    const pending = pendingPageChanges.get(normalized);
    if (pending === undefined) return false;
    return pageGrantSet.has(normalized) !== pending;
  }, [pendingPageChanges, pageGrantSet]);

  const hasPendingActionChange = useCallback((actionKey: string): boolean => {
    const key = String(actionKey || '').trim();
    const pending = pendingActionChanges.get(key);
    if (pending === undefined) return false;
    return actionGrantSet.has(key) !== pending;
  }, [pendingActionChanges, actionGrantSet]);

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

      // Explicit grants in this permission set (exact/subtree + inherited subtrees)
      for (const c of candidates) {
        if (isPageExplicitEffective(c)) {
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
      const explicit = isActionExplicitEffective(a.key);
      const effective = Boolean(explicit);
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
  }, [pages, actionCatalog, isPageExplicitEffective, isActionExplicitEffective]);

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

  const togglePageGrantLocal = (path: string) => {
    const normalized = normalizePath(path);
    setPendingPageChanges((prev) => {
      const next = new Map(prev);
      const current = pageGrantSet.has(normalized);
      const pending = next.get(normalized);
      const effective = pending !== undefined ? pending : current;
      const desired = !effective;
      if (desired === current) next.delete(normalized);
      else next.set(normalized, desired);
      return next;
    });
  };

  const toggleActionGrantLocal = (actionKey: string) => {
    const key = String(actionKey || '').trim();
    if (!key) return;
    setPendingActionChanges((prev) => {
      const next = new Map(prev);
      const current = actionGrantSet.has(key);
      const pending = next.get(key);
      const effective = pending !== undefined ? pending : current;
      const desired = !effective;
      if (desired === current) next.delete(key);
      else next.set(key, desired);
      return next;
    });
  };

  const setExclusiveActionModeLocal = (group: ExclusiveActionModeGroup, selectedKey: string | null) => {
    setPendingActionChanges((prev) => {
      const next = new Map(prev);
      for (const k of group.precedenceKeys) {
        const current = actionGrantSet.has(k);
        const desired = k === selectedKey;
        if (desired === current) next.delete(k);
        else next.set(k, desired);
      }
      return next;
    });
  };

  const discardPagesActionsChanges = () => {
    setPendingPageChanges(new Map());
    setPendingActionChanges(new Map());
  };

  const savePagesActionsChanges = async () => {
    if (savingPagesActions) return;
    setSavingPagesActions(true);
    try {
      // Pages
      for (const [path, desired] of pendingPageChanges.entries()) {
        const current = pageGrantSet.has(path);
        if (current === desired) continue;
        if (desired) {
          await mutations.addPageGrant(id, path);
        } else {
          const gid = pageGrantIdByPath.get(path);
          if (gid) await mutations.removePageGrant(id, gid);
        }
      }

      // Actions
      for (const [key, desired] of pendingActionChanges.entries()) {
        const current = actionGrantSet.has(key);
        if (current === desired) continue;
        if (desired) {
          await mutations.addActionGrant(id, key);
        } else {
          const gid = actionGrantIdByKey.get(key);
          if (gid) await mutations.removeActionGrant(id, gid);
        }
      }

      setPendingPageChanges(new Map());
      setPendingActionChanges(new Map());
      refresh();
    } finally {
      setSavingPagesActions(false);
    }
  };

  const toggleScopeNode = (nodeId: string) => {
    setExpandedScopeNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
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
                    <span className="text-green-500">●</span> <span>Default On</span> <span className="text-gray-500">- enabled for all users by default</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-orange-500">●</span> <span>Default Off</span> <span className="text-gray-500">- requires explicit grant</span>
                  </div>
                </div>
                <div className="text-gray-500 text-xs mt-2">
                  "Effective" is read-only (includes inherited subtree grants like <code>/*</code>). "Grant" toggles the explicit grant from THIS security group.
                </div>
              </div>
            </Alert>

            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  placeholder="Search pages, actions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={expandAll} disabled={savingPagesActions || mutations.loading}>Expand All</Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} disabled={savingPagesActions || mutations.loading}>Collapse</Button>
                {pendingPagesActionsChangeCount > 0 && (
                  <>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                    <Badge variant="warning" className="text-xs">
                      {pendingPagesActionsChangeCount} unsaved change{pendingPagesActionsChangeCount !== 1 ? 's' : ''}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={discardPagesActionsChanges} disabled={savingPagesActions}>
                      Discard
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => savePagesActionsChanges().catch(() => void 0)}
                      loading={savingPagesActions}
                    >
                      <Save size={14} className="mr-1" /> Save
                    </Button>
                  </>
                )}
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
                            ({pack.pages.filter(p => p.default_enabled).length} default-on,{' '}
                            {pack.pages.filter(p => !p.default_enabled).length} default-off)
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
                                  <Badge variant="success" className="text-xs">default</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">restricted</Badge>
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
                                  onChange={() => togglePageGrantLocal(p.path)}
                                  disabled={savingPagesActions || mutations.loading}
                                />
                                </div>
                                {hasPendingPageChange(p.path) ? (
                                  <Badge variant="warning" className="text-xs">unsaved</Badge>
                                ) : null}
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
                            ({pack.actions.filter(a => a.default_enabled).length} default-on,{' '}
                            {pack.actions.filter(a => !a.default_enabled).length} default-off)
                          </span>
                        </div>
                        {(() => {
                          // Build "dropdown" groups for exclusive scope-mode action keys like:
                          //   crm.read.scope.{own,ldd_manager,ldd_lead,ldd_member,any}
                          //   crm.contacts.read.scope.{own,ldd_manager,ldd_lead,ldd_member,any}
                          type ActionRow = ActionCatalogItem & { explicit: boolean; effective: boolean };
                          type GroupBuild = { actions: ActionRow[]; values: Map<string, ActionRow> };
                          const grouped = new Map<string, GroupBuild>();
                          const other: ActionRow[] = [];

                          for (const a of pack.actions as ActionRow[]) {
                            const parsed = parseExclusiveActionModeGroup(a.key);
                            if (!parsed) {
                              other.push(a);
                              continue;
                            }
                            if (!grouped.has(parsed.groupKey)) {
                              grouped.set(parsed.groupKey, { actions: [], values: new Map() });
                            }
                            grouped.get(parsed.groupKey)!.actions.push(a);
                            grouped.get(parsed.groupKey)!.values.set(parsed.value, a);
                          }

                          const groups: ExclusiveActionModeGroup[] = Array.from(grouped.entries()).map(([groupKey, g]) => {
                            // Fixed precedence (most restrictive -> least restrictive)
                            const precedenceValues = ['own', 'ldd', 'any'] as const;
                            const options = precedenceValues
                              .map((v) => {
                                const item = g.values.get(v);
                                if (!item) return null;
                                return { key: item.key, value: v, label: item.label };
                              })
                              .filter(Boolean) as Array<{ key: string; value: string; label: string }>;

                            const precedenceKeys = precedenceValues
                              .map((v) => g.values.get(v)?.key)
                              .filter(Boolean) as string[];

                            return {
                              groupKey,
                              label: titleFromGroupKey(groupKey),
                              options,
                              precedenceKeys,
                            };
                          });

                          // Determine explicit selection for a group (first explicit in precedence order; otherwise null).
                          function getExplicitSelectedKey(g: ExclusiveActionModeGroup): string | null {
                            for (const k of g.precedenceKeys) {
                              if (actionGrantSet.has(k)) return k;
                            }
                            return null;
                          }

                          function optionValueForKey(g: ExclusiveActionModeGroup, key: string | null): string {
                            if (!key) return '';
                            const opt = g.options.find((o) => o.key === key);
                            return opt?.value ?? '';
                          }

                          function labelForValue(v: string): string {
                            if (v === 'any') return 'Any';
                            if (v === 'own') return 'Own';
                            if (v === 'ldd') return 'LDD';
                            return v;
                          }

                          function shortLabelForValue(v: ScopeModeValue | null): string {
                            if (!v) return '—';
                            if (v === 'any') return 'Any';
                            if (v === 'own') return 'Own';
                            if (v === 'ldd') return 'LDD';
                            return String(v);
                          }

                          // Build a tree from groupKey:
                          // groupKey patterns:
                          //   - crm.{read|write|delete}.scope
                          //   - crm.<entity>.{read|write|delete}.scope
                          //
                          // UI tree layout:
                          //   CRM
                          //     Read/Write/Delete Scope            (global defaults)
                          //     Contacts / Prospects / ...         (entity nodes)
                          //       Read/Write/Delete Scope          (overrides, inherit from parent verb)
                          type ScopeVerb = 'read' | 'write' | 'delete';
                          type ScopeModeValue = 'own' | 'ldd' | 'any';
                          type InheritedByVerb = Record<ScopeVerb, ScopeModeValue | null>;

                          type ScopeNode = {
                            id: string; // stable node id
                            kind: 'base' | 'verb';
                            verb?: ScopeVerb;
                            label: string;
                            group?: ExclusiveActionModeGroup; // only for verb nodes (dropdown)
                            children: ScopeNode[];
                          };

                          const nodeById = new Map<string, ScopeNode>();
                          function getOrCreateNode(id: string, kind: 'base' | 'verb' = 'base', verb?: ScopeVerb): ScopeNode {
                            const existing = nodeById.get(id);
                            if (existing) return existing;
                            const seg = id.split('.').slice(-1)[0] || id;
                            const label = id === 'crm' ? 'CRM' : titleCase(seg);
                            const node: ScopeNode = { id, kind, verb, label, children: [] };
                            nodeById.set(id, node);
                            return node;
                          }

                          function splitGroupKey(groupKey: string): { base: string; verb: 'read' | 'write' | 'delete' } | null {
                            const m = groupKey.match(/^(.*)\.(read|write|delete)\.scope$/);
                            if (!m) return null;
                            return { base: m[1], verb: m[2] as any };
                          }

                          function verbLabel(v: ScopeVerb): string {
                            if (v === 'read') return 'Read Scope';
                            if (v === 'write') return 'Write Scope';
                            return 'Delete Scope';
                          }

                          // Attach groups to nodes (verb becomes a child node under its base)
                          for (const g of groups) {
                            const parts = splitGroupKey(g.groupKey);
                            if (!parts) continue;
                            const baseNode = getOrCreateNode(parts.base, 'base');
                            const verbNodeId = `${parts.base}.${parts.verb}`;
                            const verbNode = getOrCreateNode(verbNodeId, 'verb', parts.verb);
                            verbNode.label = verbLabel(parts.verb);
                            verbNode.group = g;
                            if (!baseNode.children.some((c) => c.id === verbNode.id)) {
                              baseNode.children.push(verbNode);
                            }
                          }

                          // Ensure ancestors exist, and wire parent->child for base nodes only.
                          // Skip verb nodes (they were already attached under their base).
                          for (const id of Array.from(nodeById.keys())) {
                            if (id.endsWith('.read') || id.endsWith('.write') || id.endsWith('.delete')) continue;
                            const parts = id.split('.');
                            if (parts.length <= 1) continue;
                            const parentId = parts.slice(0, -1).join('.');
                            const parent = getOrCreateNode(parentId, 'base');
                            const child = getOrCreateNode(id, 'base');
                            if (!parent.children.some((c) => c.id === child.id)) {
                              parent.children.push(child);
                            }
                          }

                          // Roots are base nodes without parents in the node map.
                          const roots: ScopeNode[] = Array.from(nodeById.values()).filter((n) => {
                            if (n.kind !== 'base') return false;
                            const parts = n.id.split('.');
                            if (parts.length <= 1) return true;
                            const parentId = parts.slice(0, -1).join('.');
                            return !nodeById.has(parentId);
                          });
                          // Sort children for stable UI
                          for (const n of nodeById.values()) {
                            n.children.sort((a, b) => {
                              // Verb nodes first (read/write/delete), then base nodes alpha.
                              if (a.kind === 'verb' && b.kind === 'verb') {
                                const order: Record<ScopeVerb, number> = { read: 0, write: 1, delete: 2 };
                                return order[a.verb as ScopeVerb] - order[b.verb as ScopeVerb];
                              }
                              if (a.kind === 'verb') return -1;
                              if (b.kind === 'verb') return 1;
                              return a.label.localeCompare(b.label);
                            });
                          }
                          roots.sort((a, b) => a.label.localeCompare(b.label));

                          // Compute if a node has any explicit override (itself or descendants)
                          const explicitOverrideCache = new Map<string, boolean>();
                          function nodeHasExplicitOverride(node: ScopeNode): boolean {
                            const cached = explicitOverrideCache.get(node.id);
                            if (cached !== undefined) return cached;
                            const selfExplicit = node.group ? Boolean(getExplicitSelectedKey(node.group)) : false;
                            const childExplicit = node.children.some(nodeHasExplicitOverride);
                            const v = selfExplicit || childExplicit;
                            explicitOverrideCache.set(node.id, v);
                            return v;
                          }

                          // Render
                          function renderVerbNode(node: ScopeNode, depth: number, inheritedMode: ScopeModeValue | null): React.ReactNode {
                            const group = node.group!;
                            const explicitKey = getExplicitSelectedKey(group);
                            const explicitValue = explicitKey ? (optionValueForKey(group, explicitKey) as ScopeModeValue) : null;
                            const status: 'override' | 'inherited' | 'default' =
                              explicitValue ? 'override' : inheritedMode ? 'inherited' : 'default';

                            const rowStyle =
                              status === 'override'
                                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
                                : status === 'inherited'
                                ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
                                : 'border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20';

                            const stripeStyle =
                              status === 'override'
                                ? 'bg-blue-500'
                                : status === 'inherited'
                                ? 'bg-amber-500'
                                : 'bg-gray-300 dark:bg-gray-700';

                            const row = (
                              <div
                                key={node.id}
                                className={`flex items-center justify-between gap-4 px-2 py-2 rounded border ${rowStyle}`}
                                style={{ marginLeft: depth * 16 }}
                              >
                                <div className={`w-1 self-stretch rounded ${stripeStyle}`} />
                                <div className="flex items-center gap-2 min-w-0">
                                  <div style={{ width: 16 }} />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                      {group.label}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate">
                                      {group.groupKey}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <select
                                    className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900"
                                    value={explicitValue ?? ''}
                                    disabled={savingPagesActions || mutations.loading}
                                    onChange={(e) => {
                                      const v = e.target.value as ScopeModeValue | '';
                                      const nextKey = v ? (group.options.find((o) => o.value === v)?.key ?? null) : null;
                                      setExclusiveActionModeLocal(group, nextKey);
                                    }}
                                  >
                                    <option value="">
                                      {inheritedMode ? `Inherit (${labelForValue(inheritedMode)})` : 'Default (server fallback)'}
                                    </option>
                                    {group.options.map((o) => (
                                      <option key={o.key} value={o.value}>
                                        {labelForValue(o.value)}
                                      </option>
                                    ))}
                                  </select>
                                  {explicitValue ? (
                                    <Badge variant="info" className="text-xs">override</Badge>
                                  ) : inheritedMode ? (
                                    <Badge variant="warning" className="text-xs">inherited</Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs">default</Badge>
                                  )}
                                </div>
                              </div>
                            );

                            return row;
                          }

                          function renderBaseNode(node: ScopeNode, depth: number, inherited: InheritedByVerb): React.ReactNode {
                            const isExpanded =
                              depth === 0 || expandedScopeNodes.has(node.id) || nodeHasExplicitOverride(node);
                            const canExpand = node.children.length > 0;

                            // Compute effective summary (R/W/D) for this node, using:
                            // - explicit selections on this node's verb children
                            // - otherwise inherited from parent
                            const effectiveByVerb: InheritedByVerb = { ...inherited };
                            for (const c of node.children) {
                              if (c.kind !== 'verb' || !c.group || !c.verb) continue;
                              const explicitKey = getExplicitSelectedKey(c.group);
                              const explicitValue = explicitKey ? (optionValueForKey(c.group, explicitKey) as ScopeModeValue) : null;
                              if (explicitValue) effectiveByVerb[c.verb] = explicitValue;
                            }

                            const row = (
                              <div
                                key={node.id}
                                className="flex items-center justify-between gap-4 px-2 py-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10"
                                style={{ marginLeft: depth * 16 }}
                              >
                                <div className="w-1 self-stretch rounded bg-gray-200 dark:bg-gray-800" />
                                <div className="flex items-center gap-2 min-w-0">
                                  {canExpand ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleScopeNode(node.id)}
                                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                  ) : (
                                    <div style={{ width: 16 }} />
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                                      {node.label}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate">
                                      {node.id}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-xs">
                                    R: {shortLabelForValue(effectiveByVerb.read)} · W: {shortLabelForValue(effectiveByVerb.write)} · D: {shortLabelForValue(effectiveByVerb.delete)}
                                  </Badge>
                                  <Badge variant="default" className="text-xs">defaults + overrides</Badge>
                                </div>
                              </div>
                            );

                            if (!isExpanded) return row;

                            // Update inherited modes for children based on this base's verb nodes.
                            const nextInherited: InheritedByVerb = { ...inherited };
                            for (const c of node.children) {
                              if (c.kind !== 'verb' || !c.group || !c.verb) continue;
                              const explicitKey = getExplicitSelectedKey(c.group);
                              const explicitValue = explicitKey ? (optionValueForKey(c.group, explicitKey) as ScopeModeValue) : null;
                              nextInherited[c.verb] = explicitValue ?? inherited[c.verb] ?? null;
                            }

                            const verbChildren = node.children.filter((c) => c.kind === 'verb');
                            const baseChildren = node.children.filter((c) => c.kind === 'base');

                            return (
                              <React.Fragment key={node.id}>
                                {row}
                                {verbChildren.map((c) => renderVerbNode(c, depth + 1, inherited[c.verb as ScopeVerb] ?? null))}
                                {baseChildren.map((c) => renderBaseNode(c, depth + 1, nextInherited))}
                              </React.Fragment>
                            );
                          }

                          return (
                            <>
                              {groups.length > 0 && (
                                <div className="ml-6 mb-3 space-y-2">
                                  <div className="text-xs text-gray-500">
                                    Scope Policy Tree (override any branch; collapsed branches inherit from parents)
                                  </div>
                                  {roots.map((r) =>
                                    renderBaseNode(r, 0, { read: null, write: null, delete: null })
                                  )}
                                </div>
                              )}

                              <div className="space-y-1 ml-6">
                                {other.map((a) => {
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
                                    <Badge variant="success" className="text-xs">default</Badge>
                                  ) : a.explicit ? (
                                    <Badge variant="info" className="text-xs">granted</Badge>
                                  ) : (
                                    <Badge variant="warning" className="text-xs">restricted</Badge>
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
                                    onChange={() => toggleActionGrantLocal(a.key)}
                                    disabled={savingPagesActions || mutations.loading}
                                  />
                                  </div>
                                  {hasPendingActionChange(a.key) ? (
                                    <Badge variant="warning" className="text-xs">unsaved</Badge>
                                  ) : null}
                                </div>
                              </div>
                            );
                                })}
                              </div>
                            </>
                          );
                        })()}
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
                  Tip: the built-in <strong>System Admin</strong> security group has access to all metrics by default.
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMetricsSearch(e.target.value)}
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

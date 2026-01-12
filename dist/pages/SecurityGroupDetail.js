'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Lock, Shield, Users, ChevronRight, ChevronDown, Trash2, Edit2, Save, X, Plus, Search, Package, FileText, KeyRound, BarChart3, Crown, UsersRound, UserCheck, } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { usePermissionSet, usePermissionSetMutations, usePermissionActions, useUsers, useGroups, useMetricsCatalog, } from '../hooks/useAuthAdmin';
export default function SecurityGroupDetailPage(props) {
    return _jsx(SecurityGroupDetail, { ...props });
}
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function titleCase(s) {
    const x = String(s || '').trim();
    if (!x)
        return '';
    return x.charAt(0).toUpperCase() + x.slice(1);
}
/** Convert PascalCase/camelCase to spaced words: "ContactEdit" → "Contact Edit" */
function spacePascalCase(s) {
    if (!s)
        return '';
    return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
function normalizePath(p) {
    const x = String(p || '').trim();
    if (!x)
        return '';
    if (x === '/')
        return '/';
    return x.startsWith('/') ? x.replace(/\/+$/, '') : `/${x.replace(/\/+$/, '')}`;
}
function isAdminishPath(path) {
    const p = String(path || '');
    return p.startsWith('/admin') || p.startsWith('/setup') || p.startsWith('/settings');
}
function normalizeRoles(x) {
    if (!Array.isArray(x))
        return undefined;
    const roles = x
        .map((r) => String(r || '').trim())
        .filter(Boolean)
        .map((r) => r.toLowerCase());
    return roles.length ? roles : [];
}
function pageGrantCandidates(path) {
    const p = normalizePath(path);
    const segs = p.split('/').filter(Boolean);
    const out = [p, '/*'];
    let cur = '';
    for (const s of segs) {
        cur += `/${s}`;
        out.push(`${cur}/*`);
    }
    return Array.from(new Set(out));
}
function parseExclusiveActionModeGroup(actionKey) {
    const m = String(actionKey || '').match(/^(crm(?:\.[a-z0-9_-]+)*)\.(read|write|delete)\.scope\.(any|own|ldd)$/);
    if (!m)
        return null;
    return { groupKey: `${m[1]}.${m[2]}.scope`, value: m[3] };
}
function titleFromGroupKey(groupKey) {
    // Parse patterns like: crm.read.scope, crm.contacts.read.scope, crm.activities.write.scope
    const m = groupKey.match(/^(crm)(?:\.([a-z]+))?\.(read|write|delete)\.scope$/);
    if (!m)
        return groupKey;
    const [, module, entity, verb] = m;
    const moduleLabel = module.toUpperCase(); // "CRM"
    const entityLabel = entity ? entity.charAt(0).toUpperCase() + entity.slice(1) : null; // "Contacts", "Activities", etc.
    const verbLabel = verb.charAt(0).toUpperCase() + verb.slice(1); // "Read", "Write", "Delete"
    return entityLabel
        ? `${moduleLabel} ${entityLabel} ${verbLabel} Scope`
        : `${moduleLabel} ${verbLabel} Scope`;
}
async function loadShellPages() {
    try {
        const routesMod = await import('@/.hit/generated/routes');
        const featurePackRoutes = routesMod.featurePackRoutes || [];
        const authRoutes = routesMod.authRoutes || [];
        const pages = featurePackRoutes
            .filter((r) => r && typeof r.path === 'string')
            .filter((r) => Boolean(r.shell))
            .filter((r) => !authRoutes.includes(String(r.path)))
            .filter((r) => String(r.path) !== '/')
            .map((r) => ({
            path: normalizePath(r.path),
            label: r.componentName,
            packName: r.packName,
            packTitle: typeof r?.packTitle === 'string' ? String(r.packTitle) : null,
            // Must mirror `/api/permissions/catalog` policy:
            // 1.0 default policy: non-adminish shell pages default-allow for Default Access.
            // IMPORTANT: if a route has explicit role requirements, it is NOT default-enabled.
            defaultEnabled: Boolean(r.shell) &&
                !isAdminishPath(String(r.path)) &&
                !(normalizeRoles(r.roles)?.length),
        }));
        return Array.from(new Map(pages.map((p) => [p.path, p])).values()).sort((a, b) => a.path.localeCompare(b.path));
    }
    catch (e) {
        console.warn('Could not load generated routes:', e);
        return [];
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function SecurityGroupDetail({ id, onNavigate }) {
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
    const [assignType, setAssignType] = useState('role');
    const [assignId, setAssignId] = useState('');
    // Grants
    const [search, setSearch] = useState('');
    const [expandedPacks, setExpandedPacks] = useState(new Set());
    const [pages, setPages] = useState([]);
    const [pagesLoading, setPagesLoading] = useState(true);
    // Scope tree UI state (Actions) - track user's explicit expand/collapse choices
    const [scopeNodeToggled, setScopeNodeToggled] = useState(new Map());
    // Pending page/action changes (batch editing like Metrics)
    // Map of key -> desired explicit grant (true=grant, false=revoke)
    const [pendingPageChanges, setPendingPageChanges] = useState(new Map());
    const [pendingActionChanges, setPendingActionChanges] = useState(new Map());
    const [savingPagesActions, setSavingPagesActions] = useState(false);
    // Pending metric changes (batch editing)
    // Map of metricKey -> desired state (true = grant, false = revoke)
    const [pendingMetricChanges, setPendingMetricChanges] = useState(new Map());
    const [savingMetrics, setSavingMetrics] = useState(false);
    const permissionSet = detail?.permission_set ?? null;
    const assignments = (detail?.assignments ?? []);
    const pageGrants = (detail?.page_grants ?? []);
    const actionGrants = (detail?.action_grants ?? []);
    const metricGrants = (detail?.metric_grants ?? []);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    // Load pages on mount
    useEffect(() => {
        let cancelled = false;
        setPagesLoading(true);
        loadShellPages()
            .then((xs) => {
            if (cancelled)
                return;
            setPages(xs);
        })
            .finally(() => {
            if (!cancelled)
                setPagesLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED DATA
    // ─────────────────────────────────────────────────────────────────────────
    const groupNameById = useMemo(() => {
        const m = new Map();
        for (const g of groups || []) {
            if (g?.id && g?.name)
                m.set(String(g.id), String(g.name));
        }
        return m;
    }, [groups]);
    const roleSuggestions = useMemo(() => {
        const roles = new Set();
        roles.add('admin');
        roles.add('user');
        for (const u of usersData?.items || []) {
            const r = u?.role;
            if (typeof r === 'string' && r.trim())
                roles.add(r.trim());
        }
        return Array.from(roles).sort();
    }, [usersData]);
    // Parse action catalog
    const actionCatalog = useMemo(() => {
        const xs = Array.isArray(actionDefs) ? actionDefs : [];
        return xs
            .map((a) => ({
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
        const s = new Set();
        for (const g of pageGrants)
            s.add(String(g.page_path));
        return s;
    }, [pageGrants]);
    const pageGrantIdByPath = useMemo(() => {
        const m = new Map();
        for (const g of pageGrants)
            m.set(String(g.page_path), String(g.id));
        return m;
    }, [pageGrants]);
    const actionGrantSet = useMemo(() => {
        const s = new Set();
        for (const g of actionGrants)
            s.add(String(g.action_key));
        return s;
    }, [actionGrants]);
    const actionGrantIdByKey = useMemo(() => {
        const m = new Map();
        for (const g of actionGrants)
            m.set(String(g.action_key), String(g.id));
        return m;
    }, [actionGrants]);
    const metricGrantIdByKey = useMemo(() => {
        const m = new Map();
        for (const g of metricGrants)
            m.set(String(g.metric_key), String(g.id));
        return m;
    }, [metricGrants]);
    const pendingPageChangeCount = useMemo(() => {
        let n = 0;
        for (const [path, desired] of pendingPageChanges.entries()) {
            const cur = pageGrantSet.has(path);
            if (cur !== desired)
                n++;
        }
        return n;
    }, [pendingPageChanges, pageGrantSet]);
    const pendingActionChangeCount = useMemo(() => {
        let n = 0;
        for (const [key, desired] of pendingActionChanges.entries()) {
            const cur = actionGrantSet.has(key);
            if (cur !== desired)
                n++;
        }
        return n;
    }, [pendingActionChanges, actionGrantSet]);
    const pendingPagesActionsChangeCount = pendingPageChangeCount + pendingActionChangeCount;
    const isPageExplicitEffective = useCallback((pagePath) => {
        const normalized = normalizePath(pagePath);
        const pending = pendingPageChanges.get(normalized);
        if (pending !== undefined)
            return pending;
        return pageGrantSet.has(normalized);
    }, [pendingPageChanges, pageGrantSet]);
    const isActionExplicitEffective = useCallback((actionKey) => {
        const key = String(actionKey || '').trim();
        const pending = pendingActionChanges.get(key);
        if (pending !== undefined)
            return pending;
        return actionGrantSet.has(key);
    }, [pendingActionChanges, actionGrantSet]);
    const hasPendingPageChange = useCallback((pagePath) => {
        const normalized = normalizePath(pagePath);
        const pending = pendingPageChanges.get(normalized);
        if (pending === undefined)
            return false;
        return pageGrantSet.has(normalized) !== pending;
    }, [pendingPageChanges, pageGrantSet]);
    const hasPendingActionChange = useCallback((actionKey) => {
        const key = String(actionKey || '').trim();
        const pending = pendingActionChanges.get(key);
        if (pending === undefined)
            return false;
        return actionGrantSet.has(key) !== pending;
    }, [pendingActionChanges, actionGrantSet]);
    // Group pages and actions by feature pack (metrics are separate)
    const packData = useMemo(() => {
        const packs = new Map();
        // Add pages
        for (const p of pages) {
            const pack = p.packName || 'unknown';
            if (!packs.has(pack))
                packs.set(pack, { title: p.packTitle, pages: [], actions: [] });
            else if (!packs.get(pack).title && p.packTitle)
                packs.get(pack).title = p.packTitle;
            const candidates = pageGrantCandidates(p.path);
            let explicit = false;
            let effective = false;
            let via;
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
            packs.get(pack).pages.push({
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
            if (!packs.has(pack))
                packs.set(pack, { title: a.pack_title, pages: [], actions: [] });
            else if (!packs.get(pack).title && a.pack_title)
                packs.get(pack).title = a.pack_title;
            const explicit = isActionExplicitEffective(a.key);
            const effective = Boolean(explicit);
            packs.get(pack).actions.push({ ...a, explicit, effective });
        }
        // Sort packs and filter out empty ones
        return Array.from(packs.entries())
            .filter(([, data]) => data.pages.length > 0 || data.actions.length > 0)
            .map(([name, data]) => ({
            name,
            ...data,
            pageCount: data.pages.length,
            effectivePages: data.pages.filter((p) => p.effective).length,
            explicitPages: data.pages.filter((p) => p.explicit).length,
            actionCount: data.actions.length,
            effectiveActions: data.actions.filter((a) => a.effective).length,
            explicitActions: data.actions.filter((a) => a.explicit).length,
        }))
            .sort((a, b) => {
            // Sort by display title (title || titleCase(name)) alphabetically
            const titleA = a.title || titleCase(a.name);
            const titleB = b.title || titleCase(b.name);
            return titleA.localeCompare(titleB);
        });
    }, [pages, actionCatalog, isPageExplicitEffective, isActionExplicitEffective]);
    // Metrics organized by owner type (App vs Feature Pack)
    const metricRowsByPack = useMemo(() => {
        const byPack = new Map();
        const APP_PACK_ID = '__app__';
        for (const m of metricsCatalog || []) {
            const currentlyGranted = metricGrantIdByKey.has(m.key);
            const pendingState = pendingMetricChanges.get(m.key);
            const effectiveState = pendingState !== undefined ? pendingState : currentlyGranted;
            const hasPendingChange = pendingState !== undefined && pendingState !== currentlyGranted;
            const ownerKind = (m.owner?.kind || 'app');
            const ownerId = ownerKind === 'feature_pack'
                ? String(m.owner?.id || '')
                : ownerKind === 'user'
                    ? String(m.owner?.id || 'user')
                    : 'app';
            const packId = ownerKind === 'feature_pack' && ownerId ? ownerId : APP_PACK_ID;
            if (!byPack.has(packId))
                byPack.set(packId, []);
            byPack.get(packId).push({
                key: m.key,
                label: m.label,
                unit: m.unit,
                category: m.category,
                description: m.description,
                checked: effectiveState,
                hasPendingChange,
                ownerKind,
                ownerId,
            });
        }
        // stable sort
        for (const [k, arr] of byPack.entries()) {
            arr.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
            byPack.set(k, arr);
        }
        return { byPack, APP_PACK_ID };
    }, [metricsCatalog, metricGrantIdByKey, pendingMetricChanges]);
    // Filter by search (pages and actions only)
    const filteredPacks = useMemo(() => {
        const q = search.trim().toLowerCase();
        const APP_PACK_ID = metricRowsByPack.APP_PACK_ID;
        const metricsByPack = metricRowsByPack.byPack;
        const packById = new Map();
        function ensurePack(id, name, title) {
            if (!packById.has(id)) {
                packById.set(id, { id, name, title, pages: [], actions: [], metrics: [] });
            }
            else if (!packById.get(id).title && title) {
                packById.get(id).title = title;
            }
            return packById.get(id);
        }
        // App root first
        ensurePack(APP_PACK_ID, 'app', 'App');
        // Pages/actions (existing)
        for (const p of packData) {
            const pid = p.name || 'unknown';
            const node = ensurePack(pid, p.name, p.title || null);
            node.pages = p.pages;
            node.actions = p.actions;
        }
        // Metrics
        for (const [packId, rows] of metricsByPack.entries()) {
            const node = ensurePack(packId, packId === APP_PACK_ID ? 'app' : packId, packId === APP_PACK_ID ? 'App' : null);
            node.metrics = rows;
        }
        let merged = Array.from(packById.values())
            .map((p) => ({
            ...p,
            pageCount: p.pages.length,
            effectivePages: p.pages.filter((x) => x.effective).length,
            explicitPages: p.pages.filter((x) => x.explicit).length,
            actionCount: p.actions.length,
            effectiveActions: p.actions.filter((x) => x.effective).length,
            explicitActions: p.actions.filter((x) => x.explicit).length,
            metricCount: p.metrics.length,
            grantedMetrics: p.metrics.filter((x) => x.checked).length,
        }))
            .filter((p) => p.pageCount > 0 || p.actionCount > 0 || p.metricCount > 0);
        // Sort: App first, then title/name alpha.
        merged.sort((a, b) => {
            if (a.id === APP_PACK_ID)
                return -1;
            if (b.id === APP_PACK_ID)
                return 1;
            const ta = a.title || titleCase(a.name);
            const tb = b.title || titleCase(b.name);
            return ta.localeCompare(tb);
        });
        if (!q)
            return merged;
        return merged.filter((pack) => {
            if (String(pack.title || pack.name).toLowerCase().includes(q))
                return true;
            if (pack.pages.some((p) => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)))
                return true;
            if (pack.actions.some((a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)))
                return true;
            if (pack.metrics.some((m) => m.key.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)))
                return true;
            return false;
        });
    }, [packData, metricRowsByPack, search]);
    // ─────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────────────────────
    const startEdit = () => {
        if (!permissionSet)
            return;
        setEditName(permissionSet.name);
        setEditDescription(permissionSet.description || '');
        setIsEditing(true);
    };
    const handleSaveEdit = async () => {
        if (!permissionSet)
            return;
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
        if (!pid)
            return;
        await mutations.addAssignment(id, assignType, pid);
        setAssignId('');
        setAssignOpen(false);
        refresh();
    };
    const handleRemoveAssignment = async (assignmentId) => {
        await mutations.removeAssignment(id, assignmentId);
        refresh();
    };
    const togglePack = (packName) => {
        setExpandedPacks((prev) => {
            const next = new Set(prev);
            if (next.has(packName))
                next.delete(packName);
            else
                next.add(packName);
            return next;
        });
    };
    const expandAll = () => {
        setExpandedPacks(new Set(packData.map((p) => p.name)));
    };
    const collapseAll = () => {
        setExpandedPacks(new Set());
    };
    const togglePageGrantLocal = (path) => {
        const normalized = normalizePath(path);
        setPendingPageChanges((prev) => {
            const next = new Map(prev);
            const current = pageGrantSet.has(normalized);
            const pending = next.get(normalized);
            const effective = pending !== undefined ? pending : current;
            const desired = !effective;
            if (desired === current)
                next.delete(normalized);
            else
                next.set(normalized, desired);
            return next;
        });
    };
    const toggleActionGrantLocal = (actionKey) => {
        const key = String(actionKey || '').trim();
        if (!key)
            return;
        setPendingActionChanges((prev) => {
            const next = new Map(prev);
            const current = actionGrantSet.has(key);
            const pending = next.get(key);
            const effective = pending !== undefined ? pending : current;
            const desired = !effective;
            if (desired === current)
                next.delete(key);
            else
                next.set(key, desired);
            return next;
        });
    };
    const setExclusiveActionModeLocal = (group, selectedKey) => {
        setPendingActionChanges((prev) => {
            const next = new Map(prev);
            for (const k of group.precedenceKeys) {
                const current = actionGrantSet.has(k);
                const desired = k === selectedKey;
                if (desired === current)
                    next.delete(k);
                else
                    next.set(k, desired);
            }
            return next;
        });
    };
    const discardPagesActionsChanges = () => {
        setPendingPageChanges(new Map());
        setPendingActionChanges(new Map());
    };
    const savePagesActionsChanges = async () => {
        if (savingPagesActions)
            return;
        setSavingPagesActions(true);
        try {
            // Pages
            for (const [path, desired] of pendingPageChanges.entries()) {
                const current = pageGrantSet.has(path);
                if (current === desired)
                    continue;
                if (desired) {
                    await mutations.addPageGrant(id, path);
                }
                else {
                    const gid = pageGrantIdByPath.get(path);
                    if (gid)
                        await mutations.removePageGrant(id, gid);
                }
            }
            // Actions
            for (const [key, desired] of pendingActionChanges.entries()) {
                const current = actionGrantSet.has(key);
                if (current === desired)
                    continue;
                if (desired) {
                    await mutations.addActionGrant(id, key);
                }
                else {
                    const gid = actionGrantIdByKey.get(key);
                    if (gid)
                        await mutations.removeActionGrant(id, gid);
                }
            }
            setPendingPageChanges(new Map());
            setPendingActionChanges(new Map());
            refresh();
        }
        finally {
            setSavingPagesActions(false);
        }
    };
    const toggleScopeNode = (nodeId, currentlyExpanded) => {
        setScopeNodeToggled((prev) => {
            const next = new Map(prev);
            next.set(nodeId, !currentlyExpanded);
            return next;
        });
    };
    // Toggle metric in local state (batch editing - doesn't save immediately)
    const toggleMetricLocal = (metricKey) => {
        setPendingMetricChanges((prev) => {
            const next = new Map(prev);
            const currentlyGranted = metricGrantIdByKey.has(metricKey);
            const pendingState = next.get(metricKey);
            if (pendingState === undefined) {
                // No pending change yet - toggle from current state
                next.set(metricKey, !currentlyGranted);
            }
            else if (pendingState === currentlyGranted) {
                // Pending change matches current state - remove the pending change
                next.delete(metricKey);
            }
            else {
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
                }
                else {
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
                }
                else {
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
        if (pendingMetricChanges.size === 0)
            return;
        setSavingMetrics(true);
        try {
            const promises = [];
            for (const [metricKey, shouldGrant] of pendingMetricChanges) {
                const grantId = metricGrantIdByKey.get(metricKey);
                if (shouldGrant && !grantId) {
                    // Need to add grant
                    promises.push(mutations.addMetricGrant(id, metricKey).then(() => void 0));
                }
                else if (!shouldGrant && grantId) {
                    // Need to remove grant
                    promises.push(mutations.removeMetricGrant(id, grantId).then(() => void 0));
                }
            }
            await Promise.all(promises);
            setPendingMetricChanges(new Map());
            refresh();
        }
        finally {
            setSavingMetrics(false);
        }
    };
    // Count of actual pending changes (changes that differ from current state)
    const pendingMetricChangeCount = useMemo(() => {
        let count = 0;
        for (const [key, desiredState] of pendingMetricChanges) {
            const currentlyGranted = metricGrantIdByKey.has(key);
            if (desiredState !== currentlyGranted)
                count++;
        }
        return count;
    }, [pendingMetricChanges, metricGrantIdByKey]);
    const pendingTotalChangeCount = pendingPagesActionsChangeCount + pendingMetricChangeCount;
    const anySaving = savingPagesActions || savingMetrics || mutations.loading;
    const discardAllChanges = () => {
        discardPagesActionsChanges();
        discardMetricChanges();
    };
    const saveAllChanges = async () => {
        if (anySaving)
            return;
        // Save pages/actions first (uses sequential calls), then metrics (batched).
        await savePagesActionsChanges();
        await saveMetricChanges();
    };
    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    if (loading || pagesLoading || actionsLoading || metricsLoading) {
        return (_jsx(Page, { title: "Loading...", breadcrumbs: [
                { label: 'Admin', href: '/admin' },
                { label: 'Security Groups', href: '/admin/security-groups' },
            ], onNavigate: navigate, children: _jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Spinner, {}) }) }));
    }
    if (error || !permissionSet) {
        return (_jsx(Page, { title: "Not Found", breadcrumbs: [
                { label: 'Admin', href: '/admin', icon: _jsx(Shield, { size: 14 }) },
                { label: 'Security Groups', href: '/admin/security-groups' },
            ], onNavigate: navigate, children: _jsx(Alert, { variant: "error", children: error?.message || 'Security group not found' }) }));
    }
    const breadcrumbs = [
        { label: 'Admin', href: '/admin', icon: _jsx(Shield, { size: 14 }) },
        { label: 'Security Groups', href: '/admin/security-groups', icon: _jsx(Lock, { size: 14 }) },
        { label: permissionSet.name },
    ];
    return (_jsxs(Page, { title: isEditing ? (_jsx(Input, { value: editName, onChange: setEditName, placeholder: "Group name" })) : (permissionSet.name), description: permissionSet.description || 'No description', breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsx("div", { className: "flex items-center gap-2", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", onClick: () => setIsEditing(false), children: [_jsx(X, { size: 16, className: "mr-1" }), " Cancel"] }), _jsxs(Button, { variant: "primary", onClick: () => handleSaveEdit().catch(() => void 0), disabled: !editName.trim(), children: [_jsx(Save, { size: 16, className: "mr-1" }), " Save"] })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: startEdit, children: [_jsx(Edit2, { size: 16, className: "mr-1" }), " Edit"] }), _jsxs(Button, { variant: "danger", onClick: () => setDeleteOpen(true), children: [_jsx(Trash2, { size: 16, className: "mr-1" }), " Delete"] })] })) }), children: [isEditing ? (_jsx(Card, { className: "mb-6", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Description" }), _jsx(Input, { value: editDescription, onChange: setEditDescription, placeholder: "Description (optional)" })] }), _jsx("div", { className: "text-xs text-gray-500", children: "Tip: name/description changes don\u2019t affect permissions; they just help organization." })] }) })) : null, _jsxs(Card, { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { size: 18, className: "text-gray-500" }), _jsx("h3", { className: "font-semibold", children: "Assigned To" }), _jsx(Badge, { variant: "default", children: assignments.length })] }), _jsxs(Button, { size: "sm", onClick: () => setAssignOpen(true), children: [_jsx(Plus, { size: 14, className: "mr-1" }), " Add"] })] }), assignments.length === 0 ? (_jsx("div", { className: "text-sm text-gray-500", children: "No assignments yet. Add roles, groups, or users." })) : (_jsx("div", { className: "flex flex-wrap gap-2", children: assignments.map((a) => {
                            const displayName = a.principal_type === 'group'
                                ? groupNameById.get(a.principal_id) || a.principal_id
                                : a.principal_id;
                            const Icon = a.principal_type === 'role' ? Crown : a.principal_type === 'group' ? UsersRound : UserCheck;
                            const variant = a.principal_type === 'role' ? 'info' : a.principal_type === 'group' ? 'warning' : 'success';
                            return (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm group", children: [_jsx(Icon, { size: 14, className: "text-gray-500" }), _jsx(Badge, { variant: variant, className: "text-xs", children: a.principal_type }), _jsx("span", { className: "font-medium", children: displayName }), _jsx("button", { onClick: () => handleRemoveAssignment(a.id).catch(() => void 0), className: "opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity", children: _jsx(X, { size: 14 }) })] }, a.id));
                        }) }))] }), _jsxs(Card, { children: [_jsx(Alert, { variant: "info", className: "mb-4", children: _jsxs("div", { className: "text-sm space-y-1", children: [_jsx("div", { children: _jsx("strong", { children: "Legend:" }) }), _jsxs("div", { className: "flex flex-wrap gap-4 mt-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-green-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default On" }), " ", _jsx("span", { className: "text-gray-500", children: "- enabled for all users by default" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-orange-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default Off" }), " ", _jsx("span", { className: "text-gray-500", children: "- requires explicit grant" })] })] }), _jsxs("div", { className: "text-gray-500 text-xs mt-2", children: ["\"Effective\" is read-only (includes inherited subtree grants like ", _jsx("code", { children: "/*" }), "). \"Grant\" toggles the explicit grant from THIS security group."] })] }) }), _jsxs("div", { className: "flex items-center justify-between mb-4 gap-4", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search pages, actions, metrics...", className: "w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: expandAll, disabled: anySaving, children: "Expand All" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: collapseAll, disabled: anySaving, children: "Collapse" }), pendingTotalChangeCount > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-4 w-px bg-gray-300 dark:bg-gray-600" }), _jsxs(Badge, { variant: "warning", className: "text-xs", children: [pendingTotalChangeCount, " unsaved change", pendingTotalChangeCount !== 1 ? 's' : ''] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: discardAllChanges, disabled: anySaving, children: "Discard" }), _jsxs(Button, { variant: "primary", size: "sm", onClick: () => saveAllChanges().catch(() => void 0), loading: anySaving, children: [_jsx(Save, { size: 14, className: "mr-1" }), " Save"] })] }))] })] }), _jsxs("div", { className: "space-y-2", children: [filteredPacks.map((pack) => {
                                const isExpanded = expandedPacks.has(pack.name);
                                const hasEffective = pack.effectivePages > 0 || pack.effectiveActions > 0 || pack.grantedMetrics > 0;
                                return (_jsxs("div", { className: "border rounded-lg overflow-hidden", children: [_jsxs("button", { onClick: () => togglePack(pack.name), className: `w-full flex items-center justify-between p-4 text-left transition-colors ${hasEffective ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [isExpanded ? _jsx(ChevronDown, { size: 18 }) : _jsx(ChevronRight, { size: 18 }), _jsx(Package, { size: 18, className: "text-gray-500" }), _jsx("span", { className: "font-semibold", children: pack.title || titleCase(pack.name) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs", children: [pack.pageCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(FileText, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.effectivePages > 0 ? 'text-blue-600 font-medium' : 'text-gray-500', children: [pack.effectivePages, "/", pack.pageCount] }), pack.explicitPages > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", pack.explicitPages, " explicit)"] })) : null] })), pack.actionCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(KeyRound, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.effectiveActions > 0 ? 'text-green-600 font-medium' : 'text-gray-500', children: [pack.effectiveActions, "/", pack.actionCount] }), pack.explicitActions > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", pack.explicitActions, " explicit)"] })) : null] })), pack.metricCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(BarChart3, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.grantedMetrics > 0 ? 'text-orange-600 font-medium' : 'text-gray-500', children: [pack.grantedMetrics, "/", pack.metricCount] })] }))] })] }), isExpanded && (_jsxs("div", { className: "border-t divide-y", children: [pack.pages.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(FileText, { size: 16, className: "text-blue-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Pages" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.pages.filter((p) => p.default_enabled).length, " default-on,", ' ', pack.pages.filter((p) => !p.default_enabled).length, " default-off)"] })] }), _jsx("div", { className: "space-y-1 ml-6", children: pack.pages.map((p) => (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${p.explicit ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "font-medium text-sm truncate", children: spacePascalCase(p.label) }), _jsx("span", { className: "text-xs text-gray-500 truncate", children: p.path }), p.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : (_jsx(Badge, { variant: "warning", className: "text-xs", children: "restricted" })), p.explicit ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "explicit" })) : (p.effective && p.via && p.via !== 'default') ? (_jsxs(Badge, { variant: "default", className: "text-xs", children: ["via ", p.via] })) : null] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Effective:" }), _jsx(Checkbox, { checked: Boolean(p.effective), disabled: true, onChange: () => void 0 })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Grant:" }), _jsx(Checkbox, { checked: p.explicit, onChange: () => togglePageGrantLocal(p.path), disabled: savingPagesActions || mutations.loading })] }), hasPendingPageChange(p.path) ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })) : null] })] }, p.path))) })] })), pack.actions.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(KeyRound, { size: 16, className: "text-green-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Actions" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.actions.filter((a) => a.default_enabled).length, " default-on,", ' ', pack.actions.filter((a) => !a.default_enabled).length, " default-off)"] })] }), (() => {
                                                            const grouped = new Map();
                                                            const other = [];
                                                            for (const a of pack.actions) {
                                                                const parsed = parseExclusiveActionModeGroup(a.key);
                                                                if (!parsed) {
                                                                    other.push(a);
                                                                    continue;
                                                                }
                                                                if (!grouped.has(parsed.groupKey)) {
                                                                    grouped.set(parsed.groupKey, { actions: [], values: new Map() });
                                                                }
                                                                grouped.get(parsed.groupKey).actions.push(a);
                                                                grouped.get(parsed.groupKey).values.set(parsed.value, a);
                                                            }
                                                            const groups = Array.from(grouped.entries()).map(([groupKey, g]) => {
                                                                // Fixed precedence (most restrictive -> least restrictive)
                                                                const precedenceValues = ['own', 'ldd', 'any'];
                                                                const options = precedenceValues
                                                                    .map((v) => {
                                                                    const item = g.values.get(v);
                                                                    if (!item)
                                                                        return null;
                                                                    return { key: item.key, value: v, label: item.label };
                                                                })
                                                                    .filter(Boolean);
                                                                const precedenceKeys = precedenceValues
                                                                    .map((v) => g.values.get(v)?.key)
                                                                    .filter(Boolean);
                                                                return {
                                                                    groupKey,
                                                                    label: titleFromGroupKey(groupKey),
                                                                    options,
                                                                    precedenceKeys,
                                                                };
                                                            });
                                                            // Determine explicit selection for a group (first explicit in precedence order; otherwise null).
                                                            function getExplicitSelectedKey(g) {
                                                                for (const k of g.precedenceKeys) {
                                                                    if (actionGrantSet.has(k))
                                                                        return k;
                                                                }
                                                                return null;
                                                            }
                                                            function optionValueForKey(g, key) {
                                                                if (!key)
                                                                    return '';
                                                                const opt = g.options.find((o) => o.key === key);
                                                                return opt?.value ?? '';
                                                            }
                                                            function labelForValue(v) {
                                                                if (v === 'any')
                                                                    return 'Any';
                                                                if (v === 'own')
                                                                    return 'Own';
                                                                if (v === 'ldd')
                                                                    return 'LDD';
                                                                return v;
                                                            }
                                                            function shortLabelForValue(v) {
                                                                if (!v)
                                                                    return '—';
                                                                if (v === 'any')
                                                                    return 'Any';
                                                                if (v === 'own')
                                                                    return 'Own';
                                                                if (v === 'ldd')
                                                                    return 'LDD';
                                                                return String(v);
                                                            }
                                                            const nodeById = new Map();
                                                            function getOrCreateNode(id, kind = 'base', verb) {
                                                                const existing = nodeById.get(id);
                                                                if (existing)
                                                                    return existing;
                                                                const seg = id.split('.').slice(-1)[0] || id;
                                                                const label = id === 'crm' ? 'CRM' : titleCase(seg);
                                                                const node = { id, kind, verb, label, children: [] };
                                                                nodeById.set(id, node);
                                                                return node;
                                                            }
                                                            function splitGroupKey(groupKey) {
                                                                const m = groupKey.match(/^(.*)\.(read|write|delete)\.scope$/);
                                                                if (!m)
                                                                    return null;
                                                                return { base: m[1], verb: m[2] };
                                                            }
                                                            function verbLabel(v) {
                                                                if (v === 'read')
                                                                    return 'Read Scope';
                                                                if (v === 'write')
                                                                    return 'Write Scope';
                                                                return 'Delete Scope';
                                                            }
                                                            // Attach groups to nodes (verb becomes a child node under its base)
                                                            for (const g of groups) {
                                                                const parts = splitGroupKey(g.groupKey);
                                                                if (!parts)
                                                                    continue;
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
                                                                if (id.endsWith('.read') || id.endsWith('.write') || id.endsWith('.delete'))
                                                                    continue;
                                                                const parts = id.split('.');
                                                                if (parts.length <= 1)
                                                                    continue;
                                                                const parentId = parts.slice(0, -1).join('.');
                                                                const parent = getOrCreateNode(parentId, 'base');
                                                                const child = getOrCreateNode(id, 'base');
                                                                if (!parent.children.some((c) => c.id === child.id)) {
                                                                    parent.children.push(child);
                                                                }
                                                            }
                                                            // Roots are base nodes without parents in the node map.
                                                            const roots = Array.from(nodeById.values()).filter((n) => {
                                                                if (n.kind !== 'base')
                                                                    return false;
                                                                const parts = n.id.split('.');
                                                                if (parts.length <= 1)
                                                                    return true;
                                                                const parentId = parts.slice(0, -1).join('.');
                                                                return !nodeById.has(parentId);
                                                            });
                                                            // Sort children for stable UI
                                                            for (const n of nodeById.values()) {
                                                                n.children.sort((a, b) => {
                                                                    // Verb nodes first (read/write/delete), then base nodes alpha.
                                                                    if (a.kind === 'verb' && b.kind === 'verb') {
                                                                        const order = { read: 0, write: 1, delete: 2 };
                                                                        return order[a.verb] - order[b.verb];
                                                                    }
                                                                    if (a.kind === 'verb')
                                                                        return -1;
                                                                    if (b.kind === 'verb')
                                                                        return 1;
                                                                    return a.label.localeCompare(b.label);
                                                                });
                                                            }
                                                            roots.sort((a, b) => a.label.localeCompare(b.label));
                                                            // Compute if a node has any explicit override (itself or descendants)
                                                            const explicitOverrideCache = new Map();
                                                            function nodeHasExplicitOverride(node) {
                                                                const cached = explicitOverrideCache.get(node.id);
                                                                if (cached !== undefined)
                                                                    return cached;
                                                                const selfExplicit = node.group ? Boolean(getExplicitSelectedKey(node.group)) : false;
                                                                const childExplicit = node.children.some(nodeHasExplicitOverride);
                                                                const v = selfExplicit || childExplicit;
                                                                explicitOverrideCache.set(node.id, v);
                                                                return v;
                                                            }
                                                            // Count explicit overrides within a subtree (used for closed-node summary)
                                                            const explicitOverrideCountCache = new Map();
                                                            function countExplicitOverrides(node) {
                                                                const cached = explicitOverrideCountCache.get(node.id);
                                                                if (cached !== undefined)
                                                                    return cached;
                                                                const self = node.group ? (getExplicitSelectedKey(node.group) ? 1 : 0) : 0;
                                                                const children = node.children.reduce((acc, c) => acc + countExplicitOverrides(c), 0);
                                                                const v = self + children;
                                                                explicitOverrideCountCache.set(node.id, v);
                                                                return v;
                                                            }
                                                            // Render
                                                            function renderVerbNode(node, depth, inheritedMode) {
                                                                const group = node.group;
                                                                const explicitKey = getExplicitSelectedKey(group);
                                                                const explicitValue = explicitKey ? optionValueForKey(group, explicitKey) : null;
                                                                const isSameAsInherited = Boolean(explicitValue && inheritedMode && explicitValue === inheritedMode);
                                                                const status = explicitValue && !isSameAsInherited ? 'override' : inheritedMode ? 'inherited' : 'default';
                                                                const rowStyle = status === 'override'
                                                                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
                                                                    : status === 'inherited'
                                                                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
                                                                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20';
                                                                const stripeStyle = status === 'override'
                                                                    ? 'bg-blue-500'
                                                                    : status === 'inherited'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-gray-300 dark:bg-gray-700';
                                                                const row = (_jsxs("div", { className: `flex items-center justify-between gap-3 px-3 py-1.5 rounded border ${rowStyle}`, style: { marginLeft: depth * 20 }, children: [_jsx("div", { className: `w-0.5 self-stretch rounded-full ${stripeStyle}` }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx("span", { className: "text-sm font-medium text-gray-700 dark:text-gray-200", children: group.label }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { className: "text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 min-w-[140px]", value: explicitValue ?? '', disabled: savingPagesActions || mutations.loading, onChange: (e) => {
                                                                                        const v = e.target.value;
                                                                                        // If user picks the same value as inherited, treat it as "inherit" (no explicit override).
                                                                                        if (v && inheritedMode && v === inheritedMode) {
                                                                                            setExclusiveActionModeLocal(group, null);
                                                                                            return;
                                                                                        }
                                                                                        const nextKey = v ? (group.options.find((o) => o.value === v)?.key ?? null) : null;
                                                                                        setExclusiveActionModeLocal(group, nextKey);
                                                                                    }, children: [_jsx("option", { value: "", children: inheritedMode ? `Inherit (${labelForValue(inheritedMode)})` : 'Default' }), group.options.map((o) => (_jsx("option", { value: o.value, children: labelForValue(o.value) }, o.key)))] }), _jsx(Badge, { variant: explicitValue ? 'info' : inheritedMode ? 'warning' : 'default', className: "text-xs w-16 justify-center", children: explicitValue ? (isSameAsInherited ? 'same' : 'override') : inheritedMode ? 'inherited' : 'default' })] })] }, node.id));
                                                                return row;
                                                            }
                                                            function renderBaseNode(node, depth, inherited) {
                                                                const canExpand = node.children.length > 0;
                                                                // Auto-expand root and nodes with overrides, but user can toggle
                                                                const autoExpand = depth === 0 || nodeHasExplicitOverride(node);
                                                                const userChoice = scopeNodeToggled.get(node.id);
                                                                const isExpanded = canExpand && (userChoice !== undefined ? userChoice : autoExpand);
                                                                const overrideCount = countExplicitOverrides(node);
                                                                // Compute effective summary (R/W/D) for this node, using:
                                                                // - explicit selections on this node's verb children
                                                                // - otherwise inherited from parent
                                                                const effectiveByVerb = { ...inherited };
                                                                for (const c of node.children) {
                                                                    if (c.kind !== 'verb' || !c.group || !c.verb)
                                                                        continue;
                                                                    const explicitKey = getExplicitSelectedKey(c.group);
                                                                    const explicitValue = explicitKey ? optionValueForKey(c.group, explicitKey) : null;
                                                                    if (explicitValue)
                                                                        effectiveByVerb[c.verb] = explicitValue;
                                                                }
                                                                const row = (_jsxs("div", { className: "flex items-center justify-between gap-3 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20", style: { marginLeft: depth * 20 }, children: [_jsx("div", { className: `w-0.5 self-stretch rounded-full ${overrideCount > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}` }), _jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [canExpand ? (_jsx("button", { type: "button", onClick: () => toggleScopeNode(node.id, isExpanded), className: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0", "aria-label": isExpanded ? 'Collapse' : 'Expand', children: isExpanded ? _jsx(ChevronDown, { size: 16 }) : _jsx(ChevronRight, { size: 16 }) })) : (_jsx("div", { className: "w-4 shrink-0" })), _jsx("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200 truncate", children: node.label })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0", children: [_jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["R: ", shortLabelForValue(effectiveByVerb.read)] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["W: ", shortLabelForValue(effectiveByVerb.write)] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["D: ", shortLabelForValue(effectiveByVerb.delete)] }), overrideCount > 0 ? (_jsxs("span", { className: "px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/10 dark:text-blue-200 dark:border-blue-800", children: [overrideCount, " override", overrideCount === 1 ? '' : 's'] })) : null] })] }, node.id));
                                                                if (!isExpanded)
                                                                    return row;
                                                                // Update inherited modes for children based on this base's verb nodes.
                                                                const nextInherited = { ...inherited };
                                                                for (const c of node.children) {
                                                                    if (c.kind !== 'verb' || !c.group || !c.verb)
                                                                        continue;
                                                                    const explicitKey = getExplicitSelectedKey(c.group);
                                                                    const explicitValue = explicitKey ? optionValueForKey(c.group, explicitKey) : null;
                                                                    nextInherited[c.verb] = explicitValue ?? inherited[c.verb] ?? null;
                                                                }
                                                                const verbChildren = node.children.filter((c) => c.kind === 'verb');
                                                                const baseChildren = node.children.filter((c) => c.kind === 'base');
                                                                return (_jsxs(React.Fragment, { children: [row, verbChildren.map((c) => renderVerbNode(c, depth + 1, inherited[c.verb] ?? null)), baseChildren.map((c) => renderBaseNode(c, depth + 1, nextInherited))] }, node.id));
                                                            }
                                                            return (_jsxs(_Fragment, { children: [groups.length > 0 && (_jsxs("div", { className: "ml-6 mb-4 space-y-1", children: [_jsx("div", { className: "text-xs text-gray-500 mb-2", children: "Scope Policy Tree \u2014 override any branch; collapsed nodes inherit from parents" }), roots.map((r) => renderBaseNode(r, 0, { read: null, write: null, delete: null }))] })), _jsx("div", { className: "space-y-1 ml-6", children: other.map((a) => {
                                                                            return (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${a.explicit && !a.default_enabled
                                                                                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                                                                                    : a.default_enabled
                                                                                        ? 'bg-green-50/30 dark:bg-green-900/5'
                                                                                        : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: a.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: a.key }), a.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : a.explicit ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "granted" })) : (_jsx(Badge, { variant: "warning", className: "text-xs", children: "restricted" }))] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Effective:" }), _jsx(Checkbox, { checked: Boolean(a.effective), disabled: true, onChange: () => void 0 })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Grant:" }), _jsx(Checkbox, { checked: a.explicit, onChange: () => toggleActionGrantLocal(a.key), disabled: savingPagesActions || mutations.loading })] }), hasPendingActionChange(a.key) ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })) : null] })] }, a.key));
                                                                        }) })] }));
                                                        })()] })), pack.metrics.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(BarChart3, { size: 16, className: "text-orange-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Metrics" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.grantedMetrics, " selected)"] })] }), _jsx("div", { className: "space-y-1 ml-6", children: pack.metrics.map((m) => (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${m.hasPendingChange
                                                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                                                                    : m.checked
                                                                        ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                                                                        : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: m.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: m.key }), _jsx(Badge, { variant: "default", className: "text-xs", children: m.unit }), m.category ? _jsx(Badge, { variant: "default", className: "text-xs", children: m.category }) : null, m.hasPendingChange ? _jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" }) : null] }), _jsx(Checkbox, { checked: Boolean(m.checked), onChange: () => toggleMetricLocal(m.key), disabled: anySaving })] }, m.key))) })] })), pack.pages.length === 0 && pack.actions.length === 0 && pack.metrics.length === 0 && (_jsx("div", { className: "p-4 text-sm text-gray-500", children: "No items in this pack" }))] }))] }, pack.name));
                            }), filteredPacks.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-500", children: search ? 'No matching items' : 'No feature packs found' }))] })] }), _jsx(Modal, { open: deleteOpen, onClose: () => setDeleteOpen(false), title: "Delete Security Group", children: _jsxs("div", { className: "space-y-4", children: [_jsxs(Alert, { variant: "warning", children: ["This will permanently delete ", _jsx("strong", { children: permissionSet.name }), " and revoke all permissions."] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: () => handleDelete().catch(() => void 0), loading: mutations.loading, children: "Delete" })] })] }) }), _jsx(Modal, { open: assignOpen, onClose: () => setAssignOpen(false), title: "Add Assignment", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg", children: ['role', 'group', 'user'].map((t) => (_jsx("button", { className: `flex-1 py-2 px-3 text-sm rounded-md transition-colors ${assignType === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`, onClick: () => { setAssignType(t); setAssignId(''); }, children: titleCase(t) }, t))) }), assignType === 'role' && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: roleSuggestions.map((r) => (_jsx(Button, { variant: assignId === r ? 'primary' : 'secondary', size: "sm", onClick: () => setAssignId(r), children: r }, r))) }), _jsx(Input, { value: assignId, onChange: setAssignId, placeholder: "Or type custom role..." })] })), assignType === 'group' && (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (groups || []).map((g) => (_jsxs("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === g.id ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(g.id), children: [_jsx("div", { className: "font-medium", children: g.name }), _jsx("div", { className: "text-xs text-gray-500", children: g.id })] }, g.id))) })), assignType === 'user' && (usersLoading ? _jsx(Spinner, {}) : (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (usersData?.items || []).map((u) => (_jsx("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === u.email ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(u.email), children: u.email }, u.email))) }))), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setAssignOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => handleAddAssignment().catch(() => void 0), disabled: !assignId.trim(), children: "Add" })] })] }) })] }));
}
//# sourceMappingURL=SecurityGroupDetail.js.map
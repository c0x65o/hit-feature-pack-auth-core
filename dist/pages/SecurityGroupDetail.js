'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from 'react';
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
    // Tab state for switching between Pages/Actions and Metrics
    const [activeTab, setActiveTab] = useState('pages_actions');
    const [metricsSearch, setMetricsSearch] = useState('');
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
                if (pageGrantSet.has(c)) {
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
            const explicit = actionGrantSet.has(a.key);
            const effective = Boolean(explicit);
            packs.get(pack).actions.push({ ...a, explicit, effective });
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
        const appMetrics = [];
        const fpMetrics = new Map();
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
                fpMetrics.get(packId).metrics.push(metricEntry);
            }
            else {
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
        if (!q)
            return metricsData;
        const filterMetrics = (arr) => arr.filter((m) => m.key.toLowerCase().includes(q) ||
            m.label.toLowerCase().includes(q) ||
            (m.category || '').toLowerCase().includes(q));
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
        if (!q)
            return packData;
        return packData.filter((pack) => {
            if (pack.name.toLowerCase().includes(q))
                return true;
            if (pack.pages.some((p) => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)))
                return true;
            if (pack.actions.some((a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)))
                return true;
            return false;
        });
    }, [packData, search]);
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
    const togglePageGrant = async (path) => {
        const normalized = normalizePath(path);
        if (pageGrantSet.has(normalized)) {
            const gid = pageGrantIdByPath.get(normalized);
            if (gid)
                await mutations.removePageGrant(id, gid);
        }
        else {
            await mutations.addPageGrant(id, normalized);
        }
        refresh();
    };
    const toggleActionGrant = async (actionKey) => {
        if (actionGrantSet.has(actionKey)) {
            const gid = actionGrantIdByKey.get(actionKey);
            if (gid)
                await mutations.removeActionGrant(id, gid);
        }
        else {
            await mutations.addActionGrant(id, actionKey);
        }
        refresh();
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
                        }) }))] }), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4", children: [_jsxs("button", { className: `flex-1 py-2 px-4 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'pages_actions' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`, onClick: () => setActiveTab('pages_actions'), children: [_jsx(Package, { size: 16 }), "Pages & Actions"] }), _jsxs("button", { className: `flex-1 py-2 px-4 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'metrics' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`, onClick: () => setActiveTab('metrics'), children: [_jsx(BarChart3, { size: 16 }), "Metrics", metricsData.grantedCount > 0 && (_jsxs(Badge, { variant: "info", className: "text-xs", children: [metricsData.grantedCount, "/", metricsData.totalCount] }))] })] }), activeTab === 'pages_actions' && (_jsxs(_Fragment, { children: [_jsx(Alert, { variant: "info", className: "mb-4", children: _jsxs("div", { className: "text-sm space-y-1", children: [_jsx("div", { children: _jsx("strong", { children: "Legend:" }) }), _jsxs("div", { className: "flex flex-wrap gap-4 mt-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-green-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default On" }), " ", _jsx("span", { className: "text-gray-500", children: "- enabled for all users by default" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-orange-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default Off" }), " ", _jsx("span", { className: "text-gray-500", children: "- requires explicit grant" })] })] }), _jsxs("div", { className: "text-gray-500 text-xs mt-2", children: ["\"Effective\" is read-only (includes inherited subtree grants like ", _jsx("code", { children: "/*" }), "). \"Grant\" toggles the explicit grant from THIS security group."] })] }) }), _jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search pages, actions...", className: "w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2 ml-4", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: expandAll, children: "Expand All" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: collapseAll, children: "Collapse" })] })] }), _jsxs("div", { className: "space-y-2", children: [filteredPacks.map((pack) => {
                                        const isExpanded = expandedPacks.has(pack.name);
                                        const hasEffective = pack.effectivePages > 0 || pack.effectiveActions > 0;
                                        return (_jsxs("div", { className: "border rounded-lg overflow-hidden", children: [_jsxs("button", { onClick: () => togglePack(pack.name), className: `w-full flex items-center justify-between p-4 text-left transition-colors ${hasEffective ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [isExpanded ? _jsx(ChevronDown, { size: 18 }) : _jsx(ChevronRight, { size: 18 }), _jsx(Package, { size: 18, className: "text-gray-500" }), _jsx("span", { className: "font-semibold", children: pack.title || titleCase(pack.name) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs", children: [pack.pageCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(FileText, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.effectivePages > 0 ? 'text-blue-600 font-medium' : 'text-gray-500', children: [pack.effectivePages, "/", pack.pageCount] }), pack.explicitPages > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", pack.explicitPages, " explicit)"] })) : null] })), pack.actionCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(KeyRound, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.effectiveActions > 0 ? 'text-green-600 font-medium' : 'text-gray-500', children: [pack.effectiveActions, "/", pack.actionCount] }), pack.explicitActions > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", pack.explicitActions, " explicit)"] })) : null] }))] })] }), isExpanded && (_jsxs("div", { className: "border-t divide-y", children: [pack.pages.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(FileText, { size: 16, className: "text-blue-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Pages" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.pages.filter(p => p.default_enabled).length, " default-on,", ' ', pack.pages.filter(p => !p.default_enabled).length, " default-off)"] })] }), _jsx("div", { className: "space-y-1 ml-6", children: pack.pages.map((p) => (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${p.explicit ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800' : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "font-medium text-sm truncate", children: p.label }), _jsx("span", { className: "text-xs text-gray-500 truncate", children: p.path }), p.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : (_jsx(Badge, { variant: "warning", className: "text-xs", children: "restricted" })), p.explicit ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "explicit" })) : (p.effective && p.via && p.via !== 'default') ? (_jsxs(Badge, { variant: "default", className: "text-xs", children: ["via ", p.via] })) : null] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Effective:" }), _jsx(Checkbox, { checked: Boolean(p.effective), disabled: true, onChange: () => void 0 })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Grant:" }), _jsx(Checkbox, { checked: p.explicit, onChange: () => togglePageGrant(p.path).catch(() => void 0), disabled: mutations.loading })] })] })] }, p.path))) })] })), pack.actions.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(KeyRound, { size: 16, className: "text-green-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Actions" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.actions.filter(a => a.default_enabled).length, " default-on,", ' ', pack.actions.filter(a => !a.default_enabled).length, " default-off)"] })] }), _jsx("div", { className: "space-y-1 ml-6", children: pack.actions.map((a) => {
                                                                        return (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${a.explicit && !a.default_enabled
                                                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                                                                                : a.default_enabled
                                                                                    ? 'bg-green-50/30 dark:bg-green-900/5'
                                                                                    : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: a.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: a.key }), a.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : a.explicit ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "granted" })) : (_jsx(Badge, { variant: "warning", className: "text-xs", children: "restricted" }))] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Effective:" }), _jsx(Checkbox, { checked: Boolean(a.effective), disabled: true, onChange: () => void 0 })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Grant:" }), _jsx(Checkbox, { checked: a.explicit, onChange: () => toggleActionGrant(a.key).catch(() => void 0), disabled: mutations.loading })] })] })] }, a.key));
                                                                    }) })] })), pack.pages.length === 0 && pack.actions.length === 0 && (_jsx("div", { className: "p-4 text-sm text-gray-500", children: "No items in this pack" }))] }))] }, pack.name));
                                    }), filteredPacks.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-500", children: search ? 'No matching items' : 'No feature packs found' }))] })] })), activeTab === 'metrics' && (_jsxs(_Fragment, { children: [_jsx(Alert, { variant: "info", className: "mb-4", children: _jsxs("div", { className: "text-sm", children: [_jsx("strong", { children: "All metrics are default-deny." }), " Toggle checkboxes to select which metrics this security group can access, then click Save.", _jsxs("div", { className: "text-gray-500 text-xs mt-1", children: ["Tip: the built-in ", _jsx("strong", { children: "System Admin" }), " security group has access to all metrics by default."] })] }) }), _jsxs("div", { className: "flex items-center justify-between mb-4 gap-4", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: metricsSearch, onChange: (e) => setMetricsSearch(e.target.value), placeholder: "Search metrics...", className: "w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: enableAllMetrics, disabled: savingMetrics, children: "Enable All" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: disableAllMetrics, disabled: savingMetrics, children: "Disable All" }), pendingMetricChangeCount > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-4 w-px bg-gray-300 dark:bg-gray-600" }), _jsxs(Badge, { variant: "warning", className: "text-xs", children: [pendingMetricChangeCount, " unsaved change", pendingMetricChangeCount !== 1 ? 's' : ''] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: discardMetricChanges, disabled: savingMetrics, children: "Discard" }), _jsxs(Button, { variant: "primary", size: "sm", onClick: () => saveMetricChanges().catch(() => void 0), loading: savingMetrics, children: [_jsx(Save, { size: 14, className: "mr-1" }), " Save"] })] }))] })] }), filteredMetricsData.appMetrics.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(BarChart3, { size: 18, className: "text-orange-500" }), _jsx("h4", { className: "font-semibold", children: "App Metrics" }), _jsxs(Badge, { variant: "default", className: "text-xs", children: [metricsData.appMetrics.filter((m) => m.checked).length, "/", metricsData.appMetrics.length, " selected"] })] }), _jsx("div", { className: "space-y-1 border rounded-lg p-3", children: filteredMetricsData.appMetrics.map((m) => (_jsxs("div", { className: `flex items-center justify-between py-2 px-3 rounded ${m.hasPendingChange
                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                                                : m.checked
                                                    ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                                                    : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: m.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: m.key }), _jsx(Badge, { variant: "default", className: "text-xs", children: m.unit }), m.hasPendingChange && _jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })] }), _jsx(Checkbox, { checked: m.checked, onChange: () => toggleMetricLocal(m.key), disabled: savingMetrics })] }, m.key))) })] })), filteredMetricsData.featurePackMetrics.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Package, { size: 18, className: "text-blue-500" }), _jsx("h4", { className: "font-semibold", children: "Feature Pack Metrics" })] }), _jsx("div", { className: "space-y-4", children: filteredMetricsData.featurePackMetrics.map((fp) => {
                                            const selectedInPack = fp.metrics.filter((m) => m.checked).length;
                                            return (_jsxs("div", { className: "border rounded-lg overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Package, { size: 16, className: "text-gray-500" }), _jsx("span", { className: "font-medium", children: titleCase(fp.packId) })] }), _jsxs(Badge, { variant: selectedInPack > 0 ? 'info' : 'default', className: "text-xs", children: [selectedInPack, "/", fp.metrics.length, " selected"] })] }), _jsx("div", { className: "p-3 space-y-1", children: fp.metrics.map((m) => (_jsxs("div", { className: `flex items-center justify-between py-2 px-3 rounded ${m.hasPendingChange
                                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                                                                : m.checked
                                                                    ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                                                                    : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: m.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: m.key }), _jsx(Badge, { variant: "default", className: "text-xs", children: m.unit }), m.hasPendingChange && _jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })] }), _jsx(Checkbox, { checked: m.checked, onChange: () => toggleMetricLocal(m.key), disabled: savingMetrics })] }, m.key))) })] }, fp.packId));
                                        }) })] })), filteredMetricsData.appMetrics.length === 0 && filteredMetricsData.featurePackMetrics.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-500", children: metricsSearch ? 'No matching metrics' : (_jsxs("div", { children: [_jsx("div", { className: "mb-2", children: "No metrics available." }), _jsxs("div", { className: "text-xs", children: ["Run ", _jsx("code", { className: "bg-gray-100 dark:bg-gray-800 px-1 rounded", children: "hit run" }), " to generate the metrics catalog."] })] })) }))] }))] }), _jsx(Modal, { open: deleteOpen, onClose: () => setDeleteOpen(false), title: "Delete Security Group", children: _jsxs("div", { className: "space-y-4", children: [_jsxs(Alert, { variant: "warning", children: ["This will permanently delete ", _jsx("strong", { children: permissionSet.name }), " and revoke all permissions."] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: () => handleDelete().catch(() => void 0), loading: mutations.loading, children: "Delete" })] })] }) }), _jsx(Modal, { open: assignOpen, onClose: () => setAssignOpen(false), title: "Add Assignment", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg", children: ['role', 'group', 'user'].map((t) => (_jsx("button", { className: `flex-1 py-2 px-3 text-sm rounded-md transition-colors ${assignType === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`, onClick: () => { setAssignType(t); setAssignId(''); }, children: titleCase(t) }, t))) }), assignType === 'role' && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: roleSuggestions.map((r) => (_jsx(Button, { variant: assignId === r ? 'primary' : 'secondary', size: "sm", onClick: () => setAssignId(r), children: r }, r))) }), _jsx(Input, { value: assignId, onChange: setAssignId, placeholder: "Or type custom role..." })] })), assignType === 'group' && (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (groups || []).map((g) => (_jsxs("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === g.id ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(g.id), children: [_jsx("div", { className: "font-medium", children: g.name }), _jsx("div", { className: "text-xs text-gray-500", children: g.id })] }, g.id))) })), assignType === 'user' && (usersLoading ? _jsx(Spinner, {}) : (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (usersData?.items || []).map((u) => (_jsx("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === u.email ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(u.email), children: u.email }, u.email))) }))), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setAssignOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => handleAddAssignment().catch(() => void 0), disabled: !assignId.trim(), children: "Add" })] })] }) })] }));
}
//# sourceMappingURL=SecurityGroupDetail.js.map
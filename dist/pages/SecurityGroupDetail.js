'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Lock, Shield, Users, ChevronRight, ChevronDown, Trash2, Edit2, Save, X, Plus, Search, Package, KeyRound, BarChart3, Crown, UsersRound, UserCheck, } from 'lucide-react';
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
async function loadFeaturePackRoutes() {
    try {
        const routesMod = await import('@/.hit/generated/routes').catch(() => null);
        const featurePackRoutes = Array.isArray(routesMod?.featurePackRoutes)
            ? routesMod.featurePackRoutes
            : [];
        return featurePackRoutes
            .map((r) => ({
            path: normalizePath(String(r?.path || '')),
            packName: String(r?.packName || ''),
            packTitle: typeof r?.packTitle === 'string' ? String(r.packTitle) : null,
            componentName: String(r?.componentName || ''),
            shell: Boolean(r?.shell),
            authz: r?.authz ? r.authz : undefined,
        }))
            .filter((r) => Boolean(r.path) && Boolean(r.packName));
    }
    catch {
        return [];
    }
}
function parseExclusiveActionModeGroup(actionKey) {
    const m = String(actionKey || '').trim().match(/^([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*)\.(read|write|delete)\.scope\.(none|own|location|department|division|all)$/);
    if (!m)
        return null;
    const basePrefix = m[1];
    const verb = m[2];
    const value = m[3];
    return { groupKey: `${basePrefix}.${verb}.scope`, value, basePrefix, verb };
}
function baseIdFromScopeBasePrefix(prefix) {
    return String(prefix || '').trim().toLowerCase();
}
function baseIdFromActionKey(key) {
    const k = String(key || '').trim().toLowerCase();
    if (!k)
        return null;
    // {pack}.{create|update|delete} -> attach to pack root
    const mPackVerb = k.match(/^([a-z][a-z0-9_-]*)\.(create|update|delete)$/);
    if (mPackVerb)
        return `${mPackVerb[1]}`;
    // {pack}.{entity}.{create|update|delete} -> attach to pack.entity
    const mEntityVerb = k.match(/^([a-z][a-z0-9_-]*)\.([a-z0-9_-]+)\.(create|update|delete)$/);
    if (mEntityVerb)
        return `${mEntityVerb[1]}.${mEntityVerb[2]}`;
    return null;
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
function scopeValueForKey(key) {
    const m = String(key || '').match(/\.scope\.(none|own|location|department|division|all)$/);
    return m ? m[1] : null;
}
// Pages are derived-gated from `authz` + actions and are not edited directly in the Security Groups UI.
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
    const [routes, setRoutes] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(true);
    // Scope tree UI state (Actions) - track user's explicit expand/collapse choices
    const [scopeNodeToggled, setScopeNodeToggled] = useState(new Map());
    // Pending action changes (batch editing like Metrics)
    // Map of key -> desired explicit grant (true=grant, false=revoke)
    const [pendingActionChanges, setPendingActionChanges] = useState(new Map());
    const [savingPagesActions, setSavingPagesActions] = useState(false);
    // Pending metric changes (batch editing)
    // Map of metricKey -> desired state (true = grant, false = revoke)
    const [pendingMetricChanges, setPendingMetricChanges] = useState(new Map());
    const [savingMetrics, setSavingMetrics] = useState(false);
    const permissionSet = detail?.permission_set ?? null;
    const assignments = (detail?.assignments ?? []);
    const actionGrants = (detail?.action_grants ?? []);
    const metricGrants = (detail?.metric_grants ?? []);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    // Load route metadata once (read-only) so we can show which pages are derived by a node.
    useEffect(() => {
        let cancelled = false;
        setRoutesLoading(true);
        loadFeaturePackRoutes()
            .then((xs) => {
            if (cancelled)
                return;
            setRoutes(xs);
        })
            .finally(() => {
            if (!cancelled)
                setRoutesLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // Template default for scope-mode dropdowns:
    // - Admin template: ANY by default (admins are full-access by default; overrides restrict)
    // - User template: OWN by default
    // - Non-template groups: NONE until explicitly granted
    const templateRoleEffective = (() => {
        const tr = String(permissionSet?.template_role || '').trim().toLowerCase();
        if (tr === 'admin' || tr === 'user')
            return tr;
        const name = String(permissionSet?.name || '').trim().toLowerCase();
        if (name === 'system admin')
            return 'admin';
        if (name === 'default access')
            return 'user';
        return null;
    })();
    const defaultScopeMode = templateRoleEffective === 'admin' ? 'all' : templateRoleEffective === 'user' ? 'own' : 'none';
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
    const pendingActionChangeCount = useMemo(() => {
        let n = 0;
        for (const [key, desired] of pendingActionChanges.entries()) {
            const cur = actionGrantSet.has(key);
            if (cur !== desired)
                n++;
        }
        return n;
    }, [pendingActionChanges, actionGrantSet]);
    const pendingPagesActionsChangeCount = pendingActionChangeCount;
    const isActionExplicitEffective = useCallback((actionKey) => {
        const key = String(actionKey || '').trim();
        const pending = pendingActionChanges.get(key);
        if (pending !== undefined)
            return pending;
        return actionGrantSet.has(key);
    }, [pendingActionChanges, actionGrantSet]);
    const packRootScopeSummaryByPack = useMemo(() => {
        const precedence = ['none', 'own', 'location', 'department', 'division', 'all'];
        // index: pack -> verb -> present scope modes
        const present = new Map();
        for (const a of actionCatalog) {
            const k = String(a.key || '').trim().toLowerCase();
            const m = k.match(/^([a-z][a-z0-9_-]*)\.(read|write|delete)\.scope\.(none|own|location|department|division|all)$/);
            if (!m)
                continue;
            const pack = m[1];
            const verb = m[2];
            const mode = m[3];
            if (!present.has(pack))
                present.set(pack, { read: new Set(), write: new Set(), delete: new Set() });
            present.get(pack)[verb].add(mode);
        }
        function baseDefaultForVerb(pack, verb) {
            const modes = present.get(pack)?.[verb];
            const allowed = modes ? Array.from(modes.values()) : [];
            const isOnOffOnly = allowed.includes('none') &&
                allowed.includes('all') &&
                !allowed.includes('own') &&
                !allowed.includes('location') &&
                !allowed.includes('department') &&
                !allowed.includes('division');
            if (isOnOffOnly)
                return templateRoleEffective === 'admin' ? 'all' : 'none';
            return defaultScopeMode;
        }
        function pick(pack, verb) {
            const modes = present.get(pack)?.[verb];
            if (!modes || modes.size === 0)
                return baseDefaultForVerb(pack, verb);
            for (const mode of precedence) {
                if (!modes.has(mode))
                    continue;
                const key = `${pack}.${verb}.scope.${mode}`;
                if (isActionExplicitEffective(key))
                    return mode;
            }
            return baseDefaultForVerb(pack, verb);
        }
        const out = new Map();
        for (const pack of present.keys()) {
            out.set(pack, { read: pick(pack, 'read'), write: pick(pack, 'write'), delete: pick(pack, 'delete') });
        }
        return out;
    }, [actionCatalog, isActionExplicitEffective, defaultScopeMode, templateRoleEffective]);
    const hasPendingActionChange = useCallback((actionKey) => {
        const key = String(actionKey || '').trim();
        const pending = pendingActionChanges.get(key);
        if (pending === undefined)
            return false;
        return actionGrantSet.has(key) !== pending;
    }, [pendingActionChanges, actionGrantSet]);
    // Group actions by feature pack (pages are derived-gated and not edited here)
    const packData = useMemo(() => {
        const packs = new Map();
        // Add actions
        for (const a of actionCatalog) {
            const pack = a.pack_name || a.key.split('.')[0] || 'unknown';
            if (!packs.has(pack))
                packs.set(pack, { title: a.pack_title, actions: [] });
            else if (!packs.get(pack).title && a.pack_title)
                packs.get(pack).title = a.pack_title;
            const explicit = isActionExplicitEffective(a.key);
            const effective = Boolean(explicit);
            packs.get(pack).actions.push({ ...a, explicit, effective });
        }
        // Sort packs and filter out empty ones
        return Array.from(packs.entries())
            .filter(([, data]) => data.actions.length > 0)
            .map(([name, data]) => ({
            name,
            ...data,
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
    }, [actionCatalog, isActionExplicitEffective]);
    // Metrics organized by owner type (App vs Feature Pack)
    const metricRowsByPack = useMemo(() => {
        const byPack = new Map();
        const APP_PACK_ID = '__app__';
        for (const m of metricsCatalog || []) {
            const dra = Array.isArray(m?.default_roles_allow)
                ? m.default_roles_allow
                    .map((x) => String(x || '').trim().toLowerCase())
                    .filter(Boolean)
                : Array.isArray(m?.defaultRolesAllow)
                    ? m.defaultRolesAllow
                        .map((x) => String(x || '').trim().toLowerCase())
                        .filter(Boolean)
                    : [];
            const roleKey = String(templateRoleEffective || '').trim().toLowerCase();
            const defaultOn = roleKey === 'admin'
                ? dra.includes('admin')
                : roleKey === 'user'
                    ? dra.includes('user')
                    : false;
            // Metrics are allow-only today: "effective" should include template defaults (admin/user),
            // not just explicit DB grants. This keeps override counts consistent with user expectations.
            const currentlyGranted = metricGrantIdByKey.has(m.key);
            const baselineEffective = Boolean(currentlyGranted || defaultOn);
            const pendingState = pendingMetricChanges.get(m.key);
            const effectiveState = pendingState !== undefined ? Boolean(pendingState) : baselineEffective;
            const hasPendingChange = pendingState !== undefined && Boolean(pendingState) !== baselineEffective;
            const isOverride = Boolean(effectiveState) !== Boolean(defaultOn);
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
                defaultOn,
                isOverride,
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
    }, [metricsCatalog, metricGrantIdByKey, pendingMetricChanges, templateRoleEffective]);
    // Filter by search (pages and actions only)
    const filteredPacks = useMemo(() => {
        const q = search.trim().toLowerCase();
        const APP_PACK_ID = metricRowsByPack.APP_PACK_ID;
        const metricsByPack = metricRowsByPack.byPack;
        const packById = new Map();
        function ensurePack(id, name, title) {
            if (!packById.has(id)) {
                packById.set(id, { id, name, title, actions: [], metrics: [] });
            }
            else if (!packById.get(id).title && title) {
                packById.get(id).title = title;
            }
            return packById.get(id);
        }
        // App root first
        ensurePack(APP_PACK_ID, 'app', 'App');
        // Actions (existing)
        for (const p of packData) {
            const pid = p.name || 'unknown';
            const node = ensurePack(pid, p.name, p.title || null);
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
            actionCount: p.actions.length,
            effectiveActions: p.actions.filter((x) => x.effective).length,
            explicitActions: p.actions.filter((x) => x.explicit).length,
            metricCount: p.metrics.length,
            grantedMetrics: p.metrics.filter((x) => x.checked).length,
            metricOverrides: p.metrics.filter((x) => x.isOverride).length,
        }))
            .filter((p) => p.actionCount > 0 || p.metricCount > 0);
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
            if (pack.actions.some((a) => a.key.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)))
                return true;
            if (pack.metrics.some((m) => m.key.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)))
                return true;
            return false;
        });
    }, [packData, metricRowsByPack, search]);
    // V2 header counts:
    // - total: number of user-facing "items" (scope dropdown groups + create toggles + derived-page access toggles)
    // - effective: how many are effectively allowed (direct or inherited/template default)
    // - overrides: how many differ from the default/inherited value (not "explicit rows exist")
    const computePackAccessSummary = useCallback((pack) => {
        const packName = String(pack?.name || '').trim().toLowerCase();
        if (!packName)
            return { total: 0, effective: 0, overrides: 0 };
        const isAdminTemplate = templateRoleEffective === 'admin';
        const grouped = new Map();
        const other = [];
        for (const a of (pack.actions || [])) {
            const parsed = parseExclusiveActionModeGroup(a.key);
            if (!parsed) {
                other.push(a);
                continue;
            }
            if (!grouped.has(parsed.groupKey))
                grouped.set(parsed.groupKey, { actions: [], values: new Map() });
            grouped.get(parsed.groupKey).actions.push(a);
            grouped.get(parsed.groupKey).values.set(parsed.value, a);
        }
        const precedenceValues = ['none', 'own', 'location', 'department', 'division', 'all'];
        function getDeclaredModes(rows) {
            const out = new Set();
            let saw = false;
            for (const r of rows) {
                const ms = r?.scope_modes;
                if (!Array.isArray(ms))
                    continue;
                saw = true;
                for (const x of ms) {
                    const v = String(x || '').trim().toLowerCase();
                    if (v === 'none' ||
                        v === 'own' ||
                        v === 'location' ||
                        v === 'department' ||
                        v === 'division' ||
                        v === 'all') {
                        out.add(v);
                    }
                }
            }
            return saw ? Array.from(out.values()) : null;
        }
        function buildGroup(groupKey, g) {
            const declaredModes = getDeclaredModes(g.actions);
            // Infer allowed values from what keys actually exist, so `none/all`-only groups
            // don't get misclassified as L/D/D (which would make `all` look like an override).
            const presentValues = Array.from(precedenceValues).filter((v) => g.values.has(v));
            const allowedValues = declaredModes && declaredModes.length
                ? declaredModes.filter((v) => g.values.has(v))
                : presentValues;
            const precedenceKeys = allowedValues.map((v) => g.values.get(v)?.key).filter(Boolean);
            return { groupKey, values: g.values, actions: g.actions, allowedValues, precedenceKeys };
        }
        const groups = Array.from(grouped.entries()).map(([groupKey, g]) => buildGroup(groupKey, g));
        function splitGroupKey(groupKey) {
            const m = String(groupKey || '').match(/^(.*)\.(read|write|delete)\.scope$/);
            if (!m)
                return null;
            return { base: m[1], verb: m[2] };
        }
        function effectiveModeForGroupKey(groupKey) {
            const g = groups.find((x) => x.groupKey === groupKey);
            if (!g)
                return 'none';
            // Explicit selection (first in precedence order; local state includes pending changes)
            let explicitKey = null;
            for (const k of g.precedenceKeys) {
                if (isActionExplicitEffective(k)) {
                    explicitKey = k;
                    break;
                }
            }
            const explicitMode = (() => {
                if (!explicitKey)
                    return null;
                for (const v of precedenceValues) {
                    if (g.values.get(v)?.key === explicitKey)
                        return v;
                }
                return null;
            })();
            const parts = splitGroupKey(groupKey);
            const verb = parts?.verb;
            const base = parts?.base || '';
            const isOnOffOnly = g.allowedValues.includes('none') &&
                g.allowedValues.includes('all') &&
                !g.allowedValues.includes('own') &&
                !g.allowedValues.includes('location') &&
                !g.allowedValues.includes('department') &&
                !g.allowedValues.includes('division');
            const baseDefault = isOnOffOnly ? (isAdminTemplate ? 'all' : 'none') : defaultScopeMode;
            // Walk up base ancestry to find inherited value for this verb (pack-root -> entity -> ...).
            const findInherited = () => {
                if (!verb || !base)
                    return null;
                const segs = base.split('.');
                for (let i = segs.length - 1; i >= 1; i--) {
                    const parentBase = segs.slice(0, i).join('.');
                    const k = `${parentBase}.${verb}.scope`;
                    if (groups.some((x) => x.groupKey === k))
                        return effectiveModeForGroupKey(k);
                }
                return null;
            };
            const inherited = findInherited();
            // If parent inherits a mode not supported by this group (e.g. parent=own, child is none/all-only),
            // treat it as "no inheritance" and fall back to baseDefault.
            const inheritedModeSafe = inherited && g.allowedValues.includes(inherited) ? inherited : null;
            const inheritedOrDefault = inheritedModeSafe ?? baseDefault;
            return (explicitMode ?? inheritedOrDefault);
        }
        function isOverrideForGroupKey(groupKey) {
            const g = groups.find((x) => x.groupKey === groupKey);
            if (!g)
                return false;
            let explicitKey = null;
            for (const k of g.precedenceKeys) {
                if (isActionExplicitEffective(k)) {
                    explicitKey = k;
                    break;
                }
            }
            if (!explicitKey)
                return false;
            const explicitMode = (() => {
                for (const v of precedenceValues) {
                    if (g.values.get(v)?.key === explicitKey)
                        return v;
                }
                return null;
            })();
            if (!explicitMode)
                return false;
            const parts = splitGroupKey(groupKey);
            const verb = parts?.verb;
            const base = parts?.base || '';
            const isOnOffOnly = g.allowedValues.includes('none') &&
                g.allowedValues.includes('all') &&
                !g.allowedValues.includes('own') &&
                !g.allowedValues.includes('location') &&
                !g.allowedValues.includes('department') &&
                !g.allowedValues.includes('division');
            const baseDefault = isOnOffOnly ? (isAdminTemplate ? 'all' : 'none') : defaultScopeMode;
            const findInherited = () => {
                if (!verb || !base)
                    return null;
                const segs = base.split('.');
                for (let i = segs.length - 1; i >= 1; i--) {
                    const parentBase = segs.slice(0, i).join('.');
                    const k = `${parentBase}.${verb}.scope`;
                    if (groups.some((x) => x.groupKey === k))
                        return effectiveModeForGroupKey(k);
                }
                return null;
            };
            const inherited = findInherited();
            // If parent inherits a mode not supported by this group (e.g. parent=own, child is none/all-only),
            // treat it as "no inheritance" and fall back to baseDefault.
            const inheritedModeSafe = inherited && g.allowedValues.includes(inherited) ? inherited : null;
            const inheritedOrDefault = inheritedModeSafe ?? baseDefault;
            return explicitMode !== inheritedOrDefault;
        }
        // Scope dropdowns (one per groupKey)
        const scopeTotal = groups.length;
        const scopeEffective = groups.filter((g) => effectiveModeForGroupKey(g.groupKey) !== 'none').length;
        const scopeOverrides = groups.filter((g) => isOverrideForGroupKey(g.groupKey)).length;
        // Toggle actions: treat {pack}.{entity}.{create|update|delete} as one item each (template-aware default).
        const toggleActions = other.filter((a) => baseIdFromActionKey(a.key) !== null);
        const createTotal = toggleActions.length;
        const createEffective = toggleActions.filter((a) => {
            const defaultOn = isAdminTemplate ? true : Boolean(a.default_enabled);
            return Boolean(isActionExplicitEffective(a.key) || defaultOn);
        }).length;
        const createOverrides = toggleActions.filter((a) => {
            const defaultOn = isAdminTemplate ? true : Boolean(a.default_enabled);
            const effectiveNow = Boolean(isActionExplicitEffective(a.key) || defaultOn);
            return effectiveNow !== defaultOn;
        }).length;
        // Derived-page access toggles (require_action + show_pages)
        const derivedToggleKeys = [];
        for (const r of routes) {
            const pn = String(r?.packName || '').trim().toLowerCase();
            if (pn !== packName)
                continue;
            if (!r?.authz?.show_pages)
                continue;
            const req = String(r?.authz?.require_action || r?.authz?.requireAction || '').trim();
            if (req)
                derivedToggleKeys.push(req);
        }
        const derivedTotal = derivedToggleKeys.length;
        const derivedEffective = derivedToggleKeys.filter((k) => Boolean(isActionExplicitEffective(k) || (isAdminTemplate ? true : false))).length;
        const derivedOverrides = derivedToggleKeys.filter((k) => {
            const defaultOn = isAdminTemplate ? true : false;
            const effectiveNow = Boolean(isActionExplicitEffective(k) || defaultOn);
            return effectiveNow !== defaultOn;
        }).length;
        return {
            total: scopeTotal + createTotal + derivedTotal,
            effective: scopeEffective + createEffective + derivedEffective,
            overrides: scopeOverrides + createOverrides + derivedOverrides,
        };
    }, [defaultScopeMode, isActionExplicitEffective, templateRoleEffective, routes]);
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
            const wasExpanded = next.has(packName);
            if (wasExpanded)
                next.delete(packName);
            else
                next.add(packName);
            // UX: expanding CRM should jump you directly into the CRM scope tree section.
            if (!wasExpanded && String(packName || '').toLowerCase() === 'crm') {
                setScopeNodeToggled((m) => {
                    const nm = new Map(m);
                    nm.set('crm', true);
                    return nm;
                });
                // Best-effort scroll to the CRM root node.
                setTimeout(() => {
                    const el = document.getElementById('scope-node-crm');
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }
                }, 0);
            }
            return next;
        });
    };
    const expandAll = () => {
        setExpandedPacks(new Set(packData.map((p) => p.name)));
    };
    const collapseAll = () => {
        setExpandedPacks(new Set());
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
    const setActionGrantLocal = (actionKey, desired) => {
        const key = String(actionKey || '').trim();
        if (!key)
            return;
        setPendingActionChanges((prev) => {
            const next = new Map(prev);
            const current = actionGrantSet.has(key);
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
        setPendingActionChanges(new Map());
    };
    const savePagesActionsChanges = async () => {
        if (savingPagesActions)
            return;
        setSavingPagesActions(true);
        try {
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
    const templateRole = permissionSet?.template_role;
    const isTemplate = templateRole === 'admin' || templateRole === 'user';
    // QoL: for template groups, quickly clear scope overrides (e.g. accidental `.scope.none`) back to defaults.
    // This only changes pending state; user still clicks Save.
    const clearScopeOverridesByPrefix = useCallback((prefix) => {
        const pfx = String(prefix || '').trim();
        if (!pfx)
            return;
        const re = new RegExp(`^${pfx.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\.[a-z0-9_-]+)*\\.(read|write|delete)\\.scope\\.(none|own|location|department|division|all)$`, 'i');
        setPendingActionChanges((prev) => {
            const next = new Map(prev);
            // Revoke any currently granted scope-mode key matching the prefix
            for (const k of actionGrantSet) {
                if (!re.test(String(k)))
                    continue;
                next.set(String(k), false);
            }
            // If user had pending changes on those keys, clear them too (let the revoke win)
            for (const [k] of Array.from(next.entries())) {
                if (re.test(String(k)) && !actionGrantSet.has(String(k))) {
                    // key wasn't granted; pending revoke is unnecessary
                    next.delete(String(k));
                }
            }
            return next;
        });
    }, [actionGrantSet]);
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
    if (loading || actionsLoading || metricsLoading || routesLoading) {
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
    return (_jsxs(Page, { title: isEditing ? (_jsx(Input, { value: editName, onChange: setEditName, placeholder: "Group name" })) : (permissionSet.name), description: permissionSet.description || 'No description', breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsx("div", { className: "flex items-center gap-2", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", onClick: () => setIsEditing(false), children: [_jsx(X, { size: 16, className: "mr-1" }), " Cancel"] }), _jsxs(Button, { variant: "primary", onClick: () => handleSaveEdit().catch(() => void 0), disabled: !editName.trim(), children: [_jsx(Save, { size: 16, className: "mr-1" }), " Save"] })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "secondary", onClick: startEdit, children: [_jsx(Edit2, { size: 16, className: "mr-1" }), " Edit"] }), _jsxs(Button, { variant: "danger", onClick: () => setDeleteOpen(true), children: [_jsx(Trash2, { size: 16, className: "mr-1" }), " Delete"] })] })) }), children: [isTemplate ? (_jsx(Card, { className: "mb-6", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Crown, { size: 18, className: "text-amber-600 mt-0.5" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "font-semibold", children: "Template Security Group" }), _jsx(Badge, { variant: "warning", className: "text-xs", children: templateRole === 'admin' ? 'admin defaults' : 'user defaults' })] }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-300 mt-1", children: ["This group is treated as the default template for ", _jsx("strong", { children: templateRole }), ". Any explicit scope overrides here can break large parts of the app (e.g. setting a pack scope to ", _jsx("code", { children: "None" }), ")."] })] })] }), _jsxs("div", { className: "flex flex-col gap-2 items-end", children: [_jsx(Button, { size: "sm", variant: "secondary", disabled: anySaving, onClick: () => clearScopeOverridesByPrefix('crm'), title: "Clear all CRM scope overrides (Read/Write/Delete) back to defaults (no explicit scope mode grants).", children: "Clear CRM scope overrides" }), _jsxs("div", { className: "text-xs text-gray-500", children: ["This updates pending changes only \u2014 click ", _jsx("strong", { children: "Save Changes" }), " to apply."] })] })] }) })) : null, isEditing ? (_jsx(Card, { className: "mb-6", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Description" }), _jsx(Input, { value: editDescription, onChange: setEditDescription, placeholder: "Description (optional)" })] }), _jsx("div", { className: "text-xs text-gray-500", children: "Tip: name/description changes don\u2019t affect permissions; they just help organization." })] }) })) : null, _jsxs(Card, { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { size: 18, className: "text-gray-500" }), _jsx("h3", { className: "font-semibold", children: "Assigned To" }), _jsx(Badge, { variant: "default", children: assignments.length })] }), _jsxs(Button, { size: "sm", onClick: () => setAssignOpen(true), children: [_jsx(Plus, { size: 14, className: "mr-1" }), " Add"] })] }), assignments.length === 0 ? (_jsx("div", { className: "text-sm text-gray-500", children: "No assignments yet. Add roles, groups, or users." })) : (_jsx("div", { className: "flex flex-wrap gap-2", children: assignments.map((a) => {
                            const displayName = a.principal_type === 'group'
                                ? groupNameById.get(a.principal_id) || a.principal_id
                                : a.principal_id;
                            const Icon = a.principal_type === 'role' ? Crown : a.principal_type === 'group' ? UsersRound : UserCheck;
                            const variant = a.principal_type === 'role' ? 'info' : a.principal_type === 'group' ? 'warning' : 'success';
                            return (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm group", children: [_jsx(Icon, { size: 14, className: "text-gray-500" }), _jsx(Badge, { variant: variant, className: "text-xs", children: a.principal_type }), _jsx("span", { className: "font-medium", children: displayName }), _jsx("button", { onClick: () => handleRemoveAssignment(a.id).catch(() => void 0), className: "opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity", children: _jsx(X, { size: 14 }) })] }, a.id));
                        }) }))] }), _jsxs(Card, { children: [_jsx(Alert, { variant: "info", className: "mb-4", children: _jsxs("div", { className: "text-sm space-y-1", children: [_jsx("div", { children: _jsx("strong", { children: "Legend:" }) }), _jsxs("div", { className: "flex flex-wrap gap-4 mt-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-green-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default On" }), " ", _jsx("span", { className: "text-gray-500", children: "- enabled for all users by default" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-orange-500", children: "\u25CF" }), " ", _jsx("span", { children: "Default Off" }), " ", _jsx("span", { className: "text-gray-500", children: "- requires explicit grant" })] })] }), _jsxs("div", { className: "text-gray-500 text-xs mt-2", children: ["\"Effective\" is read-only (includes inherited subtree grants like ", _jsx("code", { children: "/*" }), "). \"Grant\" toggles the explicit grant from THIS security group."] })] }) }), _jsxs("div", { className: "flex items-center justify-between mb-4 gap-4", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search pages, actions, metrics...", className: "w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: expandAll, disabled: anySaving, children: "Expand All" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: collapseAll, disabled: anySaving, children: "Collapse" }), pendingTotalChangeCount > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-4 w-px bg-gray-300 dark:bg-gray-600" }), _jsxs(Badge, { variant: "warning", className: "text-xs", children: [pendingTotalChangeCount, " unsaved change", pendingTotalChangeCount !== 1 ? 's' : ''] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: discardAllChanges, disabled: anySaving, children: "Discard" }), _jsxs(Button, { variant: "primary", size: "sm", onClick: () => saveAllChanges().catch(() => void 0), loading: anySaving, children: [_jsx(Save, { size: 14, className: "mr-1" }), " Save"] })] }))] })] }), _jsxs("div", { className: "space-y-2", children: [filteredPacks.map((pack) => {
                                const isExpanded = expandedPacks.has(pack.name);
                                const accessSummary = computePackAccessSummary(pack);
                                const hasEffective = accessSummary.effective > 0 || pack.grantedMetrics > 0;
                                const packKey = String(pack.name || '').trim().toLowerCase();
                                const rootSummary = packRootScopeSummaryByPack.get(packKey);
                                return (_jsxs("div", { className: "border rounded-lg overflow-hidden", children: [_jsxs("button", { onClick: () => togglePack(pack.name), className: `w-full flex items-center justify-between p-4 text-left transition-colors ${hasEffective ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [isExpanded ? _jsx(ChevronDown, { size: 18 }) : _jsx(ChevronRight, { size: 18 }), _jsx(Package, { size: 18, className: "text-gray-500" }), _jsx("span", { className: "font-semibold", children: pack.title || titleCase(pack.name) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs", children: [rootSummary && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0", children: [_jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["R:", ' ', rootSummary.read === 'none'
                                                                            ? 'None'
                                                                            : rootSummary.read === 'all'
                                                                                ? 'All'
                                                                                : rootSummary.read === 'division'
                                                                                    ? 'Division'
                                                                                    : rootSummary.read === 'department'
                                                                                        ? 'Department'
                                                                                        : rootSummary.read === 'location'
                                                                                            ? 'Location'
                                                                                            : 'Own'] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["W:", ' ', rootSummary.write === 'none'
                                                                            ? 'None'
                                                                            : rootSummary.write === 'all'
                                                                                ? 'All'
                                                                                : rootSummary.write === 'division'
                                                                                    ? 'Division'
                                                                                    : rootSummary.write === 'department'
                                                                                        ? 'Department'
                                                                                        : rootSummary.write === 'location'
                                                                                            ? 'Location'
                                                                                            : 'Own'] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["D:", ' ', rootSummary.delete === 'none'
                                                                            ? 'None'
                                                                            : rootSummary.delete === 'all'
                                                                                ? 'All'
                                                                                : rootSummary.delete === 'division'
                                                                                    ? 'Division'
                                                                                    : rootSummary.delete === 'department'
                                                                                        ? 'Department'
                                                                                        : rootSummary.delete === 'location'
                                                                                            ? 'Location'
                                                                                            : 'Own'] })] })), pack.actionCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(KeyRound, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: accessSummary.effective > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500', children: [accessSummary.effective, "/", accessSummary.total] }), accessSummary.overrides > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", accessSummary.overrides, " override", accessSummary.overrides === 1 ? '' : 's', ")"] })) : null] })), pack.metricCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(BarChart3, { size: 14, className: "text-gray-400" }), _jsxs("span", { className: pack.grantedMetrics > 0 ? 'text-amber-600 font-medium' : 'text-gray-500', children: [pack.grantedMetrics, "/", pack.metricCount] }), pack.metricOverrides > 0 ? (_jsxs("span", { className: "text-gray-400", children: ["(", pack.metricOverrides, " override", pack.metricOverrides === 1 ? '' : 's', ")"] })) : null] }))] })] }), isExpanded && (_jsxs("div", { className: "border-t divide-y", children: [pack.actions.length > 0 && (_jsx("div", { className: "p-4", children: (() => {
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
                                                            const precedenceValues = ['none', 'own', 'location', 'department', 'division', 'all'];
                                                            // Optional: restrict options based on action metadata (scope_modes on any option wins).
                                                            const declaredModes = (() => {
                                                                const anyOpt = Array.from(g.values.values()).find((x) => Array.isArray(x.scope_modes));
                                                                const ms = anyOpt?.scope_modes;
                                                                if (!Array.isArray(ms) || ms.length === 0)
                                                                    return null;
                                                                const norm = ms.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
                                                                const allowed = norm.filter((x) => ['none', 'own', 'location', 'department', 'division', 'all'].includes(x));
                                                                return allowed.length ? allowed : null;
                                                            })();
                                                            const valuesToUse = declaredModes ? declaredModes : precedenceValues;
                                                            const options = valuesToUse
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
                                                        // IMPORTANT: use the effective local state (includes pending changes), not just persisted grants.
                                                        function getExplicitSelectedKey(g) {
                                                            for (const k of g.precedenceKeys) {
                                                                if (isActionExplicitEffective(k))
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
                                                            if (v === 'none')
                                                                return 'None';
                                                            if (v === 'own')
                                                                return 'Own';
                                                            if (v === 'location')
                                                                return 'Location';
                                                            if (v === 'department')
                                                                return 'Department';
                                                            if (v === 'division')
                                                                return 'Division';
                                                            if (v === 'all')
                                                                return 'All';
                                                            return v;
                                                        }
                                                        function shortLabelForValue(v, fallback) {
                                                            if (!v)
                                                                return shortLabelForValue(fallback, fallback);
                                                            if (v === 'none')
                                                                return 'None';
                                                            if (v === 'own')
                                                                return 'Own';
                                                            if (v === 'location')
                                                                return 'Loc';
                                                            if (v === 'department')
                                                                return 'Dept';
                                                            if (v === 'division')
                                                                return 'Div';
                                                            if (v === 'all')
                                                                return 'All';
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
                                                        // Attach attachable non-scope actions (like `{pack}.create` / `{pack}.{entity}.create`)
                                                        // under derived base nodes for any pack that has a scope tree, so we avoid per-pack hardcoding.
                                                        for (const a of other) {
                                                            const baseId = baseIdFromActionKey(a.key);
                                                            if (!baseId)
                                                                continue;
                                                            const n = getOrCreateNode(baseId, 'base');
                                                            if (!n.actions)
                                                                n.actions = [];
                                                            n.actions.push(a);
                                                        }
                                                        for (const n of nodeById.values()) {
                                                            if (n.actions && n.actions.length > 0) {
                                                                n.actions.sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
                                                            }
                                                        }
                                                        // Attach derived-gated pages (read-only) under nodes using route authz metadata.
                                                        for (const r of routes) {
                                                            if (!r?.authz?.entity || !r?.authz?.verb)
                                                                continue;
                                                            // Only show pages that opt-in via YAML (keeps activities/contacts/etc clean; setup can show its 4 routes).
                                                            if (!r?.authz?.show_pages)
                                                                continue;
                                                            const packName = String(r.packName || '').trim().toLowerCase();
                                                            if (!packName || packName !== String(pack.name || '').trim().toLowerCase())
                                                                continue;
                                                            const entity = String(r.authz.entity || '').trim().toLowerCase();
                                                            if (!entity)
                                                                continue;
                                                            const baseId = entity.startsWith(`${packName}.`) ? entity : `${packName}.${entity}`;
                                                            const n = getOrCreateNode(baseId, 'base');
                                                            if (!n.pages)
                                                                n.pages = [];
                                                            n.pages.push({
                                                                path: String(r.path),
                                                                label: r.componentName || r.path,
                                                                default_enabled: false,
                                                                explicit: false,
                                                                effective: false,
                                                                require_action: r?.authz?.require_action || r?.authz?.requireAction,
                                                            });
                                                        }
                                                        for (const n of nodeById.values()) {
                                                            if (n.pages && n.pages.length > 0) {
                                                                n.pages.sort((a, b) => a.path.localeCompare(b.path));
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
                                                        function explicitValueForGroup(g) {
                                                            const k = getExplicitSelectedKey(g);
                                                            return k ? optionValueForKey(g, k) : null;
                                                        }
                                                        // Render
                                                        function renderVerbNode(node, depth, inheritedMode) {
                                                            const group = node.group;
                                                            const explicitValue = explicitValueForGroup(group);
                                                            const allowedModes = group.options
                                                                .map((o) => o.value)
                                                                .filter((x) => ['none', 'own', 'location', 'department', 'division', 'all'].includes(String(x)));
                                                            const isOnOffOnly = allowedModes.includes('none') &&
                                                                allowedModes.includes('all') &&
                                                                !allowedModes.includes('own') &&
                                                                !allowedModes.includes('location') &&
                                                                !allowedModes.includes('department') &&
                                                                !allowedModes.includes('division');
                                                            // For non-LDD entities (none/all only), do NOT inherit "own" from pack/global scope.
                                                            // Admin templates default to ALL (on). User templates default to NONE (off).
                                                            const baseDefault = isOnOffOnly
                                                                ? (templateRoleEffective === 'admin' ? 'all' : 'none')
                                                                : defaultScopeMode;
                                                            const inheritedModeSafe = inheritedMode && allowedModes.includes(inheritedMode) ? inheritedMode : null;
                                                            const baselineValue = inheritedModeSafe ?? baseDefault;
                                                            const effectiveValue = explicitValue ?? baselineValue;
                                                            const isSameAsBaseline = Boolean(explicitValue && explicitValue === baselineValue);
                                                            const status = explicitValue
                                                                ? (isSameAsBaseline ? 'same' : 'override')
                                                                : inheritedModeSafe
                                                                    ? 'inherited'
                                                                    : 'default';
                                                            const rowStyle = status === 'override'
                                                                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
                                                                : status === 'inherited'
                                                                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'
                                                                    : status === 'same'
                                                                        ? 'border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20'
                                                                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/20';
                                                            const stripeStyle = status === 'override'
                                                                ? 'bg-blue-500'
                                                                : status === 'inherited'
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-gray-300 dark:bg-gray-700';
                                                            const row = (_jsxs("div", { className: `flex items-center justify-between gap-3 px-3 py-1.5 rounded border ${rowStyle}`, style: { marginLeft: depth * 20 }, children: [_jsx("div", { className: `w-0.5 self-stretch rounded-full ${stripeStyle}` }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx("span", { className: "text-sm font-medium text-gray-700 dark:text-gray-200", children: group.label }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("select", { className: "text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 min-w-[140px]", value: effectiveValue, disabled: savingPagesActions || mutations.loading, onChange: (e) => {
                                                                                    const v = e.target.value;
                                                                                    const inheritedOrDefault = inheritedModeSafe ?? baseDefault;
                                                                                    // If user picks the same value as inherited/default, treat it as "inherit" (no explicit override).
                                                                                    if (v && v === inheritedOrDefault) {
                                                                                        setExclusiveActionModeLocal(group, null);
                                                                                        return;
                                                                                    }
                                                                                    const nextKey = v ? (group.options.find((o) => o.value === v)?.key ?? null) : null;
                                                                                    setExclusiveActionModeLocal(group, nextKey);
                                                                                }, children: group.options.map((o) => (_jsx("option", { value: o.value, children: labelForValue(o.value) }, o.key))) }), _jsx(Button, { size: "sm", variant: "ghost", disabled: savingPagesActions || mutations.loading || !explicitValue, onClick: () => setExclusiveActionModeLocal(group, null), title: "Clear this override (inherit/default).", children: "Clear" }), _jsx(Badge, { variant: status === 'override' ? 'info' : status === 'inherited' ? 'warning' : 'default', className: "text-xs w-16 justify-center", children: status === 'override' ? 'override' : status === 'same' ? 'same' : status === 'inherited' ? 'inherited' : 'default' })] })] }, node.id));
                                                            return row;
                                                        }
                                                        function renderBaseNode(node, depth, inherited) {
                                                            const canExpand = node.children.length > 0 ||
                                                                (Array.isArray(node.pages) && node.pages.length > 0) ||
                                                                (Array.isArray(node.actions) && node.actions.length > 0);
                                                            // Count overrides with inheritance awareness (explicit == inherited is NOT an override).
                                                            function countOverridesWithInheritance(n, inh) {
                                                                let self = 0;
                                                                if (n.kind === 'verb' && n.group && n.verb) {
                                                                    const group = n.group;
                                                                    const verb = n.verb;
                                                                    const explicit = explicitValueForGroup(group);
                                                                    const allowedModes = group.options
                                                                        .map((o) => o.value)
                                                                        .filter((x) => x === 'none' ||
                                                                        x === 'own' ||
                                                                        x === 'location' ||
                                                                        x === 'department' ||
                                                                        x === 'division' ||
                                                                        x === 'all');
                                                                    const isOnOffOnly = allowedModes.includes('none') &&
                                                                        allowedModes.includes('all') &&
                                                                        !allowedModes.includes('own') &&
                                                                        !allowedModes.includes('location') &&
                                                                        !allowedModes.includes('department') &&
                                                                        !allowedModes.includes('division');
                                                                    const baseDefault = isOnOffOnly
                                                                        ? (templateRoleEffective === 'admin' ? 'all' : 'none')
                                                                        : defaultScopeMode;
                                                                    const inheritedModeSafe = inh[verb] && allowedModes.includes(inh[verb]) ? inh[verb] : null;
                                                                    const baseline = inheritedModeSafe ?? baseDefault;
                                                                    if (explicit && explicit !== baseline)
                                                                        self = 1;
                                                                    return self;
                                                                }
                                                                // base node: derive next inherited using its verb children (explicit overrides win)
                                                                const nextInherited = { ...inh };
                                                                for (const c of n.children) {
                                                                    if (c.kind !== 'verb' || !c.group || !c.verb)
                                                                        continue;
                                                                    const explicit = explicitValueForGroup(c.group);
                                                                    const group = c.group;
                                                                    const verb = c.verb;
                                                                    const allowedModes = group.options
                                                                        .map((o) => o.value)
                                                                        .filter((x) => x === 'none' ||
                                                                        x === 'own' ||
                                                                        x === 'location' ||
                                                                        x === 'department' ||
                                                                        x === 'division' ||
                                                                        x === 'all');
                                                                    const isOnOffOnly = allowedModes.includes('none') &&
                                                                        allowedModes.includes('all') &&
                                                                        !allowedModes.includes('own') &&
                                                                        !allowedModes.includes('location') &&
                                                                        !allowedModes.includes('department') &&
                                                                        !allowedModes.includes('division');
                                                                    const baseDefault = isOnOffOnly
                                                                        ? (templateRoleEffective === 'admin' ? 'all' : 'none')
                                                                        : defaultScopeMode;
                                                                    const inheritedModeSafe = inh[verb] && allowedModes.includes(inh[verb]) ? inh[verb] : null;
                                                                    const baseline = inheritedModeSafe ?? baseDefault;
                                                                    nextInherited[verb] = explicit ?? baseline;
                                                                }
                                                                let total = 0;
                                                                for (const c of n.children) {
                                                                    if (c.kind === 'verb')
                                                                        total += countOverridesWithInheritance(c, inh);
                                                                    else
                                                                        total += countOverridesWithInheritance(c, nextInherited);
                                                                }
                                                                return total;
                                                            }
                                                            const overrideCount = countOverridesWithInheritance(node, inherited);
                                                            function collectVerbGroups(n) {
                                                                const out = [];
                                                                const walk = (x) => {
                                                                    if (x.kind === 'verb' && x.group)
                                                                        out.push(x.group);
                                                                    for (const c of x.children)
                                                                        walk(c);
                                                                };
                                                                walk(n);
                                                                return out;
                                                            }
                                                            // Auto-expand root and nodes with overrides, but user can toggle
                                                            const autoExpand = depth === 0 || overrideCount > 0;
                                                            const userChoice = scopeNodeToggled.get(node.id);
                                                            const isExpanded = canExpand && (userChoice !== undefined ? userChoice : autoExpand);
                                                            // Compute effective summary (R/W/D) for this node, using:
                                                            // - explicit selections on this node's verb children
                                                            // - otherwise inherited from parent
                                                            const effectiveByVerb = { ...inherited };
                                                            for (const c of node.children) {
                                                                if (c.kind !== 'verb' || !c.group || !c.verb)
                                                                    continue;
                                                                const explicit = explicitValueForGroup(c.group);
                                                                const group = c.group;
                                                                const verb = c.verb;
                                                                const allowedModes = group.options
                                                                    .map((o) => o.value)
                                                                    .filter((x) => x === 'none' ||
                                                                    x === 'own' ||
                                                                    x === 'location' ||
                                                                    x === 'department' ||
                                                                    x === 'division' ||
                                                                    x === 'all');
                                                                const isOnOffOnly = allowedModes.includes('none') &&
                                                                    allowedModes.includes('all') &&
                                                                    !allowedModes.includes('own') &&
                                                                    !allowedModes.includes('location') &&
                                                                    !allowedModes.includes('department') &&
                                                                    !allowedModes.includes('division');
                                                                const baseDefault = isOnOffOnly
                                                                    ? (templateRoleEffective === 'admin' ? 'all' : 'none')
                                                                    : defaultScopeMode;
                                                                const inheritedModeSafe = inherited[verb] && allowedModes.includes(inherited[verb]) ? inherited[verb] : null;
                                                                const baseline = inheritedModeSafe ?? baseDefault;
                                                                effectiveByVerb[verb] = explicit ?? baseline;
                                                            }
                                                            const domId = depth === 0 ? `scope-node-${node.id.replace(/\./g, '-')}` : undefined;
                                                            const row = (_jsxs("div", { id: domId, className: "flex items-center justify-between gap-3 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20", style: { marginLeft: depth * 20 }, children: [_jsx("div", { className: `w-0.5 self-stretch rounded-full ${overrideCount > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}` }), _jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [canExpand ? (_jsx("button", { type: "button", onClick: () => toggleScopeNode(node.id, isExpanded), className: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0", "aria-label": isExpanded ? 'Collapse' : 'Expand', children: isExpanded ? _jsx(ChevronDown, { size: 16 }) : _jsx(ChevronRight, { size: 16 }) })) : (_jsx("div", { className: "w-4 shrink-0" })), _jsx("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200 truncate", children: node.label })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0", children: [_jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["R: ", shortLabelForValue(effectiveByVerb.read, defaultScopeMode)] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["W: ", shortLabelForValue(effectiveByVerb.write, defaultScopeMode)] }), _jsxs("span", { className: "px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800", children: ["D: ", shortLabelForValue(effectiveByVerb.delete, defaultScopeMode)] }), overrideCount > 0 ? (_jsx(Button, { size: "sm", variant: "ghost", disabled: savingPagesActions || mutations.loading, onClick: () => {
                                                                                    const gs = collectVerbGroups(node);
                                                                                    for (const g of gs)
                                                                                        setExclusiveActionModeLocal(g, null);
                                                                                }, title: "Clear all scope overrides under this branch (inherit/default).", children: "Clear branch" })) : null, overrideCount > 0 ? (_jsxs("span", { className: "px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/10 dark:text-blue-200 dark:border-blue-800", children: [overrideCount, " override", overrideCount === 1 ? '' : 's'] })) : null] })] }, node.id));
                                                            if (!isExpanded)
                                                                return row;
                                                            // Update inherited modes for children based on this base's verb nodes.
                                                            const nextInherited = { ...inherited };
                                                            for (const c of node.children) {
                                                                if (c.kind !== 'verb' || !c.group || !c.verb)
                                                                    continue;
                                                                const v = explicitValueForGroup(c.group);
                                                                nextInherited[c.verb] = v ?? inherited[c.verb] ?? null;
                                                            }
                                                            const verbChildren = node.children.filter((c) => c.kind === 'verb');
                                                            const baseChildren = node.children.filter((c) => c.kind === 'base');
                                                            return (_jsxs(React.Fragment, { children: [row, verbChildren.map((c) => renderVerbNode(c, depth + 1, inherited[c.verb] ?? defaultScopeMode)), Array.isArray(node.pages) && node.pages.length > 0 && (_jsxs("div", { style: { marginLeft: (depth + 1) * 20 }, className: "mt-2 space-y-1", children: [_jsx("div", { className: "text-xs font-semibold text-gray-500", children: "Derived Pages" }), node.pages.map((p) => (_jsxs("div", { className: "flex items-center justify-between gap-3 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 dark:text-gray-200 truncate", children: spacePascalCase(p.label) }), _jsx("div", { className: "text-xs text-gray-500 truncate", children: p.path })] }), p.require_action ? ((() => {
                                                                                        const k = String(p.require_action || '').trim();
                                                                                        const isAdminTemplate = permissionSet?.template_role === 'admin';
                                                                                        const defaultOn = isAdminTemplate ? true : false;
                                                                                        const effectiveNow = Boolean(k && (isActionExplicitEffective(k) || defaultOn));
                                                                                        const pending = pendingActionChanges.get(k);
                                                                                        const persistedExplicit = actionGrantSet.has(k);
                                                                                        const isOverrideNow = Boolean(effectiveNow) !== Boolean(defaultOn);
                                                                                        const isInherited = !isOverrideNow && pending === undefined;
                                                                                        return (_jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Access:" }), _jsxs("select", { className: "text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 min-w-[110px]", value: effectiveNow ? 'on' : 'off', disabled: anySaving, onChange: (e) => setActionGrantLocal(k, String(e.target.value) === 'on'), children: [_jsx("option", { value: "on", children: "On" }), _jsx("option", { value: "off", children: "Off" })] }), isInherited ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "inherited" })) : isOverrideNow ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "override" })) : null, (pending !== undefined || persistedExplicit) ? (_jsx(Button, { size: "sm", variant: "ghost", disabled: anySaving, onClick: () => setActionGrantLocal(k, false), title: "Clear (remove explicit grant; fall back to template default)", children: "Clear" })) : null] }));
                                                                                    })()) : null] }, p.path)))] })), Array.isArray(node.actions) && node.actions.length > 0 && (_jsx("div", { style: { marginLeft: (depth + 1) * 20 }, className: "mt-2 space-y-1", children: node.actions.map((a) => (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${a.explicit && !a.default_enabled
                                                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                                                                                : a.default_enabled
                                                                                    ? 'bg-green-50/30 dark:bg-green-900/5'
                                                                                    : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: a.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: a.key }), a.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : null] }), _jsxs("div", { className: "flex items-center gap-4", children: [(/\.(create|update|delete)$/i.test(String(a.key || '').trim()) && !String(a.key || '').includes('.scope.')) ? ((() => {
                                                                                            const key = String(a.key || '').trim();
                                                                                            const verb = key.split('.').slice(-1)[0] || 'action';
                                                                                            const pending = pendingActionChanges.get(key);
                                                                                            const persistedExplicit = actionGrantSet.has(key);
                                                                                            const explicitNow = pending !== undefined ? pending : persistedExplicit;
                                                                                            const isAdminTemplate = templateRoleEffective === 'admin';
                                                                                            const defaultOn = isAdminTemplate ? true : Boolean(a.default_enabled);
                                                                                            const effectiveNow = Boolean(explicitNow || defaultOn);
                                                                                            const isOverrideNow = Boolean(effectiveNow) !== Boolean(defaultOn);
                                                                                            const showClear = pending !== undefined || persistedExplicit;
                                                                                            return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs text-gray-400", children: [titleCase(verb), ":"] }), _jsxs("select", { className: "text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 min-w-[110px]", value: effectiveNow ? 'on' : 'off', disabled: anySaving, onChange: (e) => {
                                                                                                            const v = String(e.target.value || '');
                                                                                                            setActionGrantLocal(key, v === 'on');
                                                                                                        }, children: [_jsx("option", { value: "on", children: "On" }), _jsx("option", { value: "off", children: "Off" })] }), !isOverrideNow && pending === undefined ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "inherited" })) : isOverrideNow ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "override" })) : null, showClear ? (_jsx(Button, { size: "sm", variant: "ghost", disabled: anySaving, onClick: () => setActionGrantLocal(key, false), title: "Clear (remove explicit grant; fall back to template/default)", children: "Clear" })) : null] }));
                                                                                        })()) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Enabled:" }), _jsx(Checkbox, { checked: Boolean(a.explicit || a.default_enabled), onChange: () => toggleActionGrantLocal(a.key), disabled: anySaving })] })), hasPendingActionChange(a.key) ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })) : null] })] }, a.key))) })), baseChildren.map((c) => renderBaseNode(c, depth + 1, nextInherited))] }, node.id));
                                                        }
                                                        return (_jsxs(_Fragment, { children: [groups.length > 0 && (_jsxs("div", { className: "ml-6 mb-4 space-y-1", children: [_jsx("div", { className: "text-xs text-gray-500 mb-2", children: "Scope Policy Tree \u2014 override any branch; collapsed nodes inherit from parents" }), roots.map((r) => renderBaseNode(r, 0, { read: null, write: null, delete: null }))] })), other.filter((a) => baseIdFromActionKey(a.key) === null).length > 0 && (_jsx("div", { className: "space-y-1 ml-6", children: other.filter((a) => baseIdFromActionKey(a.key) === null).map((a) => {
                                                                        return (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${a.explicit && !a.default_enabled
                                                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                                                                                : a.default_enabled
                                                                                    ? 'bg-green-50/30 dark:bg-green-900/5'
                                                                                    : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: a.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: a.key }), a.default_enabled ? (_jsx(Badge, { variant: "success", className: "text-xs", children: "default" })) : a.explicit ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "granted" })) : (_jsx(Badge, { variant: "warning", className: "text-xs", children: "restricted" }))] }), _jsxs("div", { className: "flex items-center gap-4", children: [(/\.(create|update|delete)$/i.test(String(a.key || '').trim()) && !String(a.key || '').includes('.scope.')) ? ((() => {
                                                                                            const key = String(a.key || '').trim();
                                                                                            const verb = key.split('.').slice(-1)[0] || 'action';
                                                                                            const pending = pendingActionChanges.get(key);
                                                                                            const persistedExplicit = actionGrantSet.has(key);
                                                                                            const explicitNow = pending !== undefined ? pending : persistedExplicit;
                                                                                            const isAdminTemplate = templateRoleEffective === 'admin';
                                                                                            const defaultOn = isAdminTemplate ? true : Boolean(a.default_enabled);
                                                                                            const effectiveNow = Boolean(explicitNow || defaultOn);
                                                                                            const isOverrideNow = Boolean(effectiveNow) !== Boolean(defaultOn);
                                                                                            const showClear = pending !== undefined || persistedExplicit;
                                                                                            return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs text-gray-400", children: [titleCase(verb), ":"] }), _jsxs("select", { className: "text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 min-w-[110px]", value: effectiveNow ? 'on' : 'off', disabled: savingPagesActions || mutations.loading, onChange: (e) => {
                                                                                                            const v = String(e.target.value || '');
                                                                                                            setActionGrantLocal(key, v === 'on');
                                                                                                        }, children: [_jsx("option", { value: "on", children: "On" }), _jsx("option", { value: "off", children: "Off" })] }), !isOverrideNow && pending === undefined ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "inherited" })) : isOverrideNow ? (_jsx(Badge, { variant: "info", className: "text-xs", children: "override" })) : null, showClear ? (_jsx(Button, { size: "sm", variant: "ghost", disabled: savingPagesActions || mutations.loading, onClick: () => setActionGrantLocal(key, false), title: "Clear (remove explicit grant; fall back to template/default)", children: "Clear" })) : null] }));
                                                                                        })()) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-400", children: "Enabled:" }), _jsx(Checkbox, { checked: Boolean(a.explicit || a.default_enabled), onChange: () => toggleActionGrantLocal(a.key), disabled: savingPagesActions || mutations.loading })] })), hasPendingActionChange(a.key) ? (_jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" })) : null] })] }, a.key));
                                                                    }) }))] }));
                                                    })() })), pack.metrics.length > 0 && (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(BarChart3, { size: 16, className: "text-orange-500" }), _jsx("span", { className: "text-sm font-medium text-gray-600", children: "Metrics" }), pack.metricOverrides > 0 ? (_jsxs("span", { className: "text-xs text-gray-400", children: ["(", pack.metricOverrides, " override", pack.metricOverrides === 1 ? '' : 's', ")"] })) : null] }), _jsx("div", { className: "space-y-1 ml-6", children: pack.metrics.map((m) => (_jsxs("div", { className: `flex items-center justify-between py-1.5 px-2 rounded ${m.hasPendingChange
                                                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                                                                    : m.checked
                                                                        ? 'bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
                                                                        : ''} hover:bg-gray-50 dark:hover:bg-gray-800`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("span", { className: "font-medium text-sm truncate", children: m.label }), _jsx("span", { className: "text-xs text-gray-500 font-mono truncate", children: m.key }), _jsx(Badge, { variant: "default", className: "text-xs", children: m.unit }), m.category ? _jsx(Badge, { variant: "default", className: "text-xs", children: m.category }) : null, m.hasPendingChange ? _jsx(Badge, { variant: "warning", className: "text-xs", children: "unsaved" }) : null] }), _jsx(Checkbox, { checked: Boolean(m.checked), onChange: () => toggleMetricLocal(m.key), disabled: anySaving })] }, m.key))) })] })), pack.actions.length === 0 && pack.metrics.length === 0 && (_jsx("div", { className: "p-4 text-sm text-gray-500", children: "No items in this pack" }))] }))] }, pack.name));
                            }), filteredPacks.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-500", children: search ? 'No matching items' : 'No feature packs found' }))] })] }), _jsx(Modal, { open: deleteOpen, onClose: () => setDeleteOpen(false), title: "Delete Security Group", children: _jsxs("div", { className: "space-y-4", children: [_jsxs(Alert, { variant: "warning", children: ["This will permanently delete ", _jsx("strong", { children: permissionSet.name }), " and revoke all permissions."] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Button, { variant: "ghost", onClick: () => setDeleteOpen(false), children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: () => handleDelete().catch(() => void 0), loading: mutations.loading, children: "Delete" })] })] }) }), _jsx(Modal, { open: assignOpen, onClose: () => setAssignOpen(false), title: "Add Assignment", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg", children: ['role', 'group', 'user'].map((t) => (_jsx("button", { className: `flex-1 py-2 px-3 text-sm rounded-md transition-colors ${assignType === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`, onClick: () => { setAssignType(t); setAssignId(''); }, children: titleCase(t) }, t))) }), assignType === 'role' && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: roleSuggestions.map((r) => (_jsx(Button, { variant: assignId === r ? 'primary' : 'secondary', size: "sm", onClick: () => setAssignId(r), children: r }, r))) }), _jsx(Input, { value: assignId, onChange: setAssignId, placeholder: "Or type custom role..." })] })), assignType === 'group' && (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (groups || []).map((g) => (_jsxs("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === g.id ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(g.id), children: [_jsx("div", { className: "font-medium", children: g.name }), _jsx("div", { className: "text-xs text-gray-500", children: g.id })] }, g.id))) })), assignType === 'user' && (usersLoading ? _jsx(Spinner, {}) : (_jsx("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: (usersData?.items || []).map((u) => (_jsx("button", { className: `w-full text-left p-3 rounded-lg border ${assignId === u.email ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setAssignId(u.email), children: u.email }, u.email))) }))), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setAssignOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => handleAddAssignment().catch(() => void 0), disabled: !assignId.trim(), children: "Add" })] })] }) })] }));
}
//# sourceMappingURL=SecurityGroupDetail.js.map
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Plus, Trash2, Lock, Users as UsersIcon, KeyRound, BarChart3 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useUsers, useGroups, usePermissionActions, usePermissionSets, usePermissionSet, usePermissionSetMutations, } from '../hooks/useAuthAdmin';
export default function SecurityGroupsPage(props) {
    return _jsx(SecurityGroups, { ...props });
}
export function SecurityGroups({ onNavigate }) {
    const { Page, Card, Button, Badge, Modal, Input, Alert, Spinner, Tabs } = useUi();
    const [selectedSetId, setSelectedSetId] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const { data: sets, loading: setsLoading, error: setsError, refresh: refreshSets } = usePermissionSets();
    const { data: detail, loading: detailLoading, error: detailError, refresh: refreshDetail } = usePermissionSet(selectedSetId);
    const mutations = usePermissionSetMutations();
    const selected = detail?.permission_set ?? null;
    const detailNonNull = detail || null;
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const canCreate = newName.trim().length > 0;
    const handleCreate = async () => {
        if (!canCreate)
            return;
        await mutations.createPermissionSet({ name: newName.trim(), description: newDescription.trim() || undefined });
        setNewName('');
        setNewDescription('');
        setCreateOpen(false);
        refreshSets();
    };
    const handleDelete = async (psId) => {
        const ok = typeof window !== 'undefined'
            ? window.confirm('Delete this security group? This cannot be undone.')
            : false;
        if (!ok)
            return;
        await mutations.deletePermissionSet(psId);
        if (selectedSetId === psId)
            setSelectedSetId(null);
        refreshSets();
    };
    return (_jsxs(Page, { title: "Security Groups", description: "Permission Sets: assign page/action/metric grants to users, groups (static/dynamic), and roles. Effective access is the union.", children: [_jsxs("div", { className: "grid grid-cols-12 gap-6 mt-6", children: [_jsx("div", { className: "col-span-12 lg:col-span-4", children: _jsxs(Card, { className: "h-full", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Lock, { size: 18 }), _jsx("h3", { className: "text-lg font-semibold", children: "Permission Sets" })] }), _jsxs(Button, { size: "sm", onClick: () => setCreateOpen(true), children: [_jsx(Plus, { size: 16, className: "mr-1" }), " New"] })] }), setsLoading ? (_jsx(Spinner, {})) : setsError ? (_jsx(Alert, { variant: "error", children: setsError.message })) : (sets && sets.length > 0) ? (_jsx("div", { className: "space-y-2", children: sets.map((s) => (_jsxs("div", { className: `p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between group ${selectedSetId === s.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`, onClick: () => setSelectedSetId(s.id), children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: s.name }), s.description ? _jsx("div", { className: "text-xs text-gray-500 truncate", children: s.description }) : null] }), _jsx("div", { className: "opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(Button, { variant: "ghost", size: "sm", className: "text-red-500 hover:text-red-600 p-1 h-auto", onClick: (e) => {
                                                        e.stopPropagation();
                                                        handleDelete(s.id).catch(() => void 0);
                                                    }, children: _jsx(Trash2, { size: 14 }) }) })] }, s.id))) })) : (_jsx(Alert, { variant: "info", children: "No security groups yet." }))] }) }), _jsx("div", { className: "col-span-12 lg:col-span-8", children: !selectedSetId ? (_jsxs(Card, { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx(Lock, { size: 48, className: "text-gray-300 mb-4" }), _jsx("h3", { className: "text-xl font-medium text-gray-500", children: "Select a security group" }), _jsx("p", { className: "text-gray-400 mt-2 max-w-xs", children: "Create and configure permission sets, then assign them to users, groups, or roles." })] })) : detailLoading ? (_jsx(Card, { children: _jsx(Spinner, {}) })) : detailError ? (_jsx(Card, { children: _jsx(Alert, { variant: "error", children: detailError.message }) })) : selected ? (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { children: _jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h2", { className: "text-2xl font-bold truncate", children: selected.name }), _jsx("div", { className: "text-gray-500 text-sm", children: selected.description || 'No description.' })] }), _jsx(Badge, { variant: "info", children: "Security Group" })] }) }), _jsx(Tabs, { tabs: [
                                        {
                                            id: 'assignments',
                                            label: 'Assignments',
                                            content: (_jsx("div", { className: "mt-4 space-y-4", children: _jsx(AssignmentManager, { psId: selected.id, assignments: detailNonNull.assignments, onChanged: refreshDetail }) })),
                                        },
                                        {
                                            id: 'pages',
                                            label: 'Page Grants',
                                            content: (_jsx("div", { className: "mt-4 space-y-4", children: _jsx(GrantsManager, { kind: "page", psId: selected.id, grants: detailNonNull.page_grants, onChanged: refreshDetail }) })),
                                        },
                                        {
                                            id: 'actions',
                                            label: 'Action Grants',
                                            content: (_jsx("div", { className: "mt-4 space-y-4", children: _jsx(GrantsManager, { kind: "action", psId: selected.id, grants: detailNonNull.action_grants, onChanged: refreshDetail }) })),
                                        },
                                        {
                                            id: 'metrics',
                                            label: 'Metric Grants',
                                            content: (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsx(Alert, { variant: "warning", children: "Metric ACL is 0.9 mode: metrics are default-allow until at least one metric grant exists for that key." }), _jsx(GrantsManager, { kind: "metric", psId: selected.id, grants: detailNonNull.metric_grants, onChanged: refreshDetail })] })),
                                        },
                                    ] })] })) : (_jsx(Card, { children: _jsx(Alert, { variant: "error", children: "Security group not found." }) })) })] }), _jsx(Modal, { open: createOpen, onClose: () => setCreateOpen(false), title: "Create Security Group", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name" }), _jsx(Input, { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "e.g. Finance Managers" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Description" }), _jsx(Input, { value: newDescription, onChange: (e) => setNewDescription(e.target.value), placeholder: "Optional" })] }), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => handleCreate().catch(() => void 0), disabled: !canCreate, children: "Create" })] })] }) })] }));
}
function AssignmentManager({ psId, assignments, onChanged, }) {
    const { Card, Button, Badge, Modal, Alert, Spinner, Input } = useUi();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState('role');
    const [principalId, setPrincipalId] = useState('');
    const { data: groups } = useGroups();
    const { data: users, loading: usersLoading } = useUsers({ page: 1, pageSize: 1000 });
    const { addAssignment, removeAssignment } = usePermissionSetMutations();
    const roleSuggestions = useMemo(() => {
        const roles = new Set();
        roles.add('admin');
        roles.add('user');
        for (const u of (users?.items || [])) {
            const r = u?.role;
            if (typeof r === 'string' && r.trim())
                roles.add(r.trim());
        }
        return Array.from(roles).sort((a, b) => a.localeCompare(b));
    }, [users]);
    const add = async () => {
        const id = principalId.trim();
        if (!id)
            return;
        await addAssignment(psId, type, id);
        setPrincipalId('');
        setOpen(false);
        onChanged();
    };
    return (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(UsersIcon, { size: 18 }), _jsx("h3", { className: "text-lg font-semibold", children: "Assigned To" })] }), _jsxs(Button, { size: "sm", onClick: () => setOpen(true), children: [_jsx(Plus, { size: 16, className: "mr-1" }), " Add"] })] }), assignments.length === 0 ? (_jsx(Alert, { variant: "info", children: "No assignments yet." })) : (_jsx("div", { className: "border rounded-lg divide-y bg-white dark:bg-gray-900", children: assignments.map((a) => (_jsxs("div", { className: "p-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx(Badge, { variant: a.principal_type === 'role' ? 'info' : a.principal_type === 'group' ? 'warning' : 'success', children: a.principal_type.toUpperCase() }), _jsx("span", { className: "font-medium truncate", children: a.principal_id })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-red-500", onClick: () => removeAssignment(psId, a.id).then(onChanged).catch(() => void 0), children: _jsx(Trash2, { size: 14 }) })] }, a.id))) })), _jsx(Modal, { open: open, onClose: () => setOpen(false), title: "Add Assignment", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg", children: ['role', 'group', 'user'].map((t) => (_jsx("button", { className: `flex-1 py-1 text-sm rounded-md transition-colors ${type === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'}`, onClick: () => { setType(t); setPrincipalId(''); }, children: t.charAt(0).toUpperCase() + t.slice(1) }, t))) }), type === 'role' ? (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: roleSuggestions.slice(0, 12).map((r) => (_jsx(Button, { variant: principalId === r ? 'primary' : 'ghost', onClick: () => setPrincipalId(r), children: r }, r))) }), _jsx(Input, { value: principalId, onChange: (e) => setPrincipalId(e.target.value), placeholder: "Or type a custom role\u2026" })] })) : null, type === 'group' ? (_jsxs("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: [(groups || []).map((g) => (_jsxs("div", { className: `p-2 border rounded cursor-pointer ${principalId === g.id ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setPrincipalId(g.id), children: [_jsx("div", { className: "font-medium", children: g.name }), _jsx("div", { className: "text-xs text-gray-500", children: g.id })] }, g.id))), !groups || groups.length === 0 ? _jsx(Alert, { variant: "info", children: "No groups found." }) : null] })) : null, type === 'user' ? (usersLoading ? (_jsx(Spinner, {})) : (_jsxs("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: [(users?.items || []).map((u) => (_jsx("div", { className: `p-2 border rounded cursor-pointer ${principalId === u.email ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setPrincipalId(u.email), children: u.email }, u.email))), !users || users.items.length === 0 ? _jsx(Alert, { variant: "info", children: "No users found." }) : null] }))) : null, _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx(Button, { variant: "ghost", onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => add().catch(() => void 0), disabled: !principalId.trim(), children: "Add" })] })] }) })] }));
}
function GrantsManager({ kind, psId, grants, onChanged, }) {
    const { Card, Button, Badge, Modal, Input, Alert, Spinner } = useUi();
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const { data: actions, loading: actionsLoading } = usePermissionActions();
    const mutations = usePermissionSetMutations();
    const label = kind === 'page' ? 'Page Path' : kind === 'action' ? 'Action Key' : 'Metric Key';
    const icon = kind === 'page' ? _jsx(Lock, { size: 18 }) : kind === 'action' ? _jsx(KeyRound, { size: 18 }) : _jsx(BarChart3, { size: 18 });
    const remove = async (grantId) => {
        if (kind === 'page')
            await mutations.removePageGrant(psId, grantId);
        else if (kind === 'action')
            await mutations.removeActionGrant(psId, grantId);
        else
            await mutations.removeMetricGrant(psId, grantId);
        onChanged();
    };
    const add = async () => {
        const v = value.trim();
        if (!v)
            return;
        if (kind === 'page')
            await mutations.addPageGrant(psId, v);
        else if (kind === 'action')
            await mutations.addActionGrant(psId, v);
        else
            await mutations.addMetricGrant(psId, v);
        setValue('');
        setOpen(false);
        onChanged();
    };
    return (_jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [icon, _jsxs("h3", { className: "text-lg font-semibold", children: [label, "s"] })] }), _jsxs(Button, { size: "sm", onClick: () => setOpen(true), children: [_jsx(Plus, { size: 16, className: "mr-1" }), " Add"] })] }), grants.length === 0 ? (_jsxs(Alert, { variant: "info", children: ["No ", label.toLowerCase(), " grants yet."] })) : (_jsx("div", { className: "border rounded-lg divide-y bg-white dark:bg-gray-900", children: grants.map((g) => (_jsxs("div", { className: "p-3 flex items-center justify-between", children: [_jsxs("div", { className: "min-w-0 flex items-center gap-3", children: [_jsx(Badge, { variant: "info", children: kind.toUpperCase() }), _jsx("span", { className: "font-medium truncate", children: g.page_path || g.action_key || g.metric_key })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-red-500", onClick: () => remove(g.id).catch(() => void 0), children: _jsx(Trash2, { size: 14 }) })] }, g.id))) })), _jsx(Modal, { open: open, onClose: () => setOpen(false), title: `Add ${label}`, children: _jsxs("div", { className: "space-y-4", children: [kind === 'action' ? (actionsLoading ? (_jsx(Spinner, {})) : (_jsxs("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: [(actions || []).slice(0, 200).map((a) => (_jsxs("div", { className: `p-2 border rounded cursor-pointer ${value === a.key ? 'border-blue-500 bg-blue-50' : ''}`, onClick: () => setValue(a.key), children: [_jsx("div", { className: "font-medium", children: a.key }), a.label ? _jsx("div", { className: "text-xs text-gray-500", children: a.label }) : null] }, a.key))), !actions || actions.length === 0 ? _jsx(Alert, { variant: "info", children: "No actions found." }) : null] }))) : (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: label }), _jsx(Input, { value: value, onChange: (e) => setValue(e.target.value), placeholder: kind === 'page' ? '/crm/companies/[id]' : kind === 'metric' ? 'projects.gross_revenue' : 'crm.company.create_prospect' })] })), _jsxs("div", { className: "flex justify-end gap-3 mt-6", children: [_jsx(Button, { variant: "ghost", onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => add().catch(() => void 0), disabled: !value.trim(), children: "Add" })] })] }) })] }));
}
//# sourceMappingURL=SecurityGroups.js.map
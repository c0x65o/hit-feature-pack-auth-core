'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Plus, Lock, Shield } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { usePermissionSets, usePermissionSetMutations } from '../hooks/useAuthAdmin';
export default function SecurityGroupsListPage(props) {
    return _jsx(SecurityGroupsList, { ...props });
}
export function SecurityGroupsList({ onNavigate }) {
    const { Page, Card, Button, DataTable, Modal, Input, Alert, Spinner } = useUi();
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const { data: sets, loading, error, refresh } = usePermissionSets();
    const mutations = usePermissionSetMutations();
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const rows = useMemo(() => {
        return sets || [];
    }, [sets]);
    const canCreate = newName.trim().length > 0;
    const handleCreate = async () => {
        if (!canCreate)
            return;
        try {
            const created = await mutations.createPermissionSet({
                name: newName.trim(),
                description: newDescription.trim() || undefined,
            });
            setNewName('');
            setNewDescription('');
            setCreateOpen(false);
            refresh();
            // Navigate to the new group
            if (created?.id) {
                navigate(`/admin/security-groups/${created.id}`);
            }
        }
        catch (e) {
            console.error('Failed to create security group:', e);
        }
    };
    const breadcrumbs = [
        { label: 'Admin', href: '/admin', icon: _jsx(Shield, { size: 14 }) },
        { label: 'Security Groups' },
    ];
    return (_jsxs(Page, { title: "Security Groups", description: "Permission Sets control access to pages, actions, and metrics. Assign them to users, groups, or roles.", breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsxs(Button, { onClick: () => setCreateOpen(true), children: [_jsx(Plus, { size: 16, className: "mr-2" }), "New Security Group"] }), children: [error && _jsx(Alert, { variant: "error", children: error.message }), _jsx(Card, { children: _jsx(DataTable, { columns: [
                        {
                            key: 'name',
                            label: 'Security Group',
                            sortable: true,
                            render: (_, row) => (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => navigate(`/admin/security-groups/${row.id}`), children: [_jsx(Lock, { size: 14, className: "mr-2" }), String(row.name || '')] })),
                        },
                        {
                            key: 'description',
                            label: 'Description',
                            sortable: false,
                            render: (value) => (_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: value ? String(value) : '—' })),
                        },
                        {
                            key: 'updated_at',
                            label: 'Updated',
                            sortable: true,
                            render: (value) => (_jsx("span", { className: "text-gray-500 dark:text-gray-400", children: value ? String(value) : '—' })),
                        },
                    ], data: rows, emptyMessage: "No security groups found. Create your first security group to get started.", loading: loading, searchable: true, exportable: true, showColumnVisibility: true, pageSize: 25, tableId: "admin.security-groups" }) }), _jsx(Modal, { open: createOpen, onClose: () => setCreateOpen(false), title: "Create Security Group", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name" }), _jsx(Input, { value: newName, onChange: setNewName, placeholder: "e.g. Finance Managers" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Description" }), _jsx(Input, { value: newDescription, onChange: setNewDescription, placeholder: "Optional description..." })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "ghost", onClick: () => setCreateOpen(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => handleCreate().catch(() => void 0), disabled: !canCreate || mutations.loading, loading: mutations.loading, children: "Create" })] })] }) })] }));
}
//# sourceMappingURL=SecurityGroupsList.js.map
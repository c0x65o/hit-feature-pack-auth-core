'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, Edit2, Building2 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useDivisions, useDivisionMutations, } from '../hooks/useOrgDimensions';
import { useUsers } from '../hooks/useAuthAdmin';
export function Divisions({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select } = useUi();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedDivision, setSelectedDivision] = useState(null);
    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    const [managerUserKey, setManagerUserKey] = useState('');
    const [isActive, setIsActive] = useState(true);
    const { data: divisions, loading, error, refresh } = useDivisions();
    const { create, update, remove, loading: mutating, error: mutationError } = useDivisionMutations();
    const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
    const resetForm = () => {
        setName('');
        setCode('');
        setDescription('');
        setParentId('');
        setManagerUserKey('');
        setIsActive(true);
    };
    const handleCreate = async () => {
        try {
            await create({
                name,
                code: code || null,
                description: description || null,
                parentId: parentId || null,
                managerUserKey: managerUserKey || null,
                isActive,
            });
            setCreateModalOpen(false);
            resetForm();
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleUpdate = async () => {
        if (!selectedDivision)
            return;
        try {
            await update(selectedDivision.id, {
                name,
                code: code || null,
                description: description || null,
                parentId: parentId || null,
                managerUserKey: managerUserKey || null,
                isActive,
            });
            setEditModalOpen(false);
            setSelectedDivision(null);
            resetForm();
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDelete = async () => {
        if (!selectedDivision)
            return;
        try {
            await remove(selectedDivision.id);
            setDeleteModalOpen(false);
            setSelectedDivision(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const openEditModal = (division) => {
        setSelectedDivision(division);
        setName(division.name);
        setCode(division.code || '');
        setDescription(division.description || '');
        setParentId(division.parentId || '');
        setManagerUserKey(division.managerUserKey || '');
        setIsActive(division.isActive);
        setEditModalOpen(true);
    };
    const openDeleteModal = (division) => {
        setSelectedDivision(division);
        setDeleteModalOpen(true);
    };
    if (loading) {
        return (_jsx(Page, { title: "Divisions", children: _jsx(Card, { children: _jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }) }));
    }
    if (error) {
        return (_jsx(Page, { title: "Divisions", children: _jsxs(Alert, { variant: "error", title: "Error", children: ["Failed to load divisions: ", error.message] }) }));
    }
    // Build parent options (exclude current division if editing)
    const parentOptions = [
        { value: '', label: '(No parent)' },
        ...divisions
            .filter((d) => !selectedDivision || d.id !== selectedDivision.id)
            .map((d) => ({ value: d.id, label: d.name })),
    ];
    // Build manager options
    const managerOptions = [
        { value: '', label: '(No manager)' },
        ...(allUsers?.items || []).map((u) => ({
            value: u.email,
            label: u.email,
        })),
    ];
    return (_jsxs(Page, { title: "Divisions", actions: _jsxs(Button, { onClick: () => setCreateModalOpen(true), children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Create Division"] }), children: [mutationError && (_jsx(Alert, { variant: "error", title: "Error", className: "mb-4", children: mutationError.message })), _jsx(Card, { children: _jsx(DataTable, { data: divisions, columns: [
                        {
                            key: 'name',
                            label: 'Name',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Building2, { className: "w-4 h-4 text-muted-foreground" }), _jsx("span", { className: "font-medium", children: row.name })] })),
                        },
                        {
                            key: 'code',
                            label: 'Code',
                            render: (_value, row) => row.code || '-',
                        },
                        {
                            key: 'managerUserKey',
                            label: 'Manager',
                            render: (_value, row) => row.managerUserKey || '-',
                        },
                        {
                            key: 'isActive',
                            label: 'Status',
                            render: (_value, row) => (_jsx(Badge, { variant: row.isActive ? 'success' : 'secondary', children: row.isActive ? 'Active' : 'Inactive' })),
                        },
                        {
                            key: 'createdAt',
                            label: 'Created',
                            render: (_value, row) => formatDate(row.createdAt),
                        },
                        {
                            key: 'actions',
                            label: '',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEditModal(row), children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openDeleteModal(row), children: _jsx(Trash2, { className: "w-4 h-4 text-danger" }) })] })),
                        },
                    ], emptyMessage: "No divisions found. Create your first division to get started." }) }), _jsx(Modal, { open: createModalOpen, onClose: () => {
                    setCreateModalOpen(false);
                    resetForm();
                }, title: "Create Division", description: "Create a new organizational division", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., North America", required: true }), _jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., NA" }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 3 }), _jsx(Select, { label: "Parent Division", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setCreateModalOpen(false); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleCreate, disabled: !name || mutating, children: mutating ? 'Creating...' : 'Create' })] })] }) }), _jsx(Modal, { open: editModalOpen, onClose: () => {
                    setEditModalOpen(false);
                    setSelectedDivision(null);
                    resetForm();
                }, title: "Edit Division", description: "Update division details", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., North America", required: true }), _jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., NA" }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 3 }), _jsx(Select, { label: "Parent Division", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsx(Select, { label: "Status", value: isActive ? 'true' : 'false', onChange: (v) => setIsActive(v === 'true'), options: [
                                { value: 'true', label: 'Active' },
                                { value: 'false', label: 'Inactive' },
                            ] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setEditModalOpen(false); setSelectedDivision(null); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleUpdate, disabled: !name || mutating, children: mutating ? 'Saving...' : 'Save Changes' })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => {
                    setDeleteModalOpen(false);
                    setSelectedDivision(null);
                }, title: "Delete Division", description: `Are you sure you want to delete "${selectedDivision?.name}"? This action cannot be undone.`, children: _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setDeleteModalOpen(false); setSelectedDivision(null); }, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: mutating, children: mutating ? 'Deleting...' : 'Delete' })] }) })] }));
}
export default Divisions;
//# sourceMappingURL=Divisions.js.map
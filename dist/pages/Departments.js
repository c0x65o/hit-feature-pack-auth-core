'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, Edit2, Network } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useDepartments, useDepartmentMutations, } from '../hooks/useOrgDimensions';
import { useUsers } from '../hooks/useAuthAdmin';
export function Departments({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select } = useUi();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    const [managerUserKey, setManagerUserKey] = useState('');
    const [isActive, setIsActive] = useState(true);
    const { data: departments, loading, error, refresh } = useDepartments();
    const { create, update, remove, loading: mutating, error: mutationError } = useDepartmentMutations();
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
        if (!selectedDepartment)
            return;
        try {
            await update(selectedDepartment.id, {
                name,
                code: code || null,
                description: description || null,
                parentId: parentId || null,
                managerUserKey: managerUserKey || null,
                isActive,
            });
            setEditModalOpen(false);
            setSelectedDepartment(null);
            resetForm();
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDelete = async () => {
        if (!selectedDepartment)
            return;
        try {
            await remove(selectedDepartment.id);
            setDeleteModalOpen(false);
            setSelectedDepartment(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const openEditModal = (department) => {
        setSelectedDepartment(department);
        setName(department.name);
        setCode(department.code || '');
        setDescription(department.description || '');
        setParentId(department.parentId || '');
        setManagerUserKey(department.managerUserKey || '');
        setIsActive(department.isActive);
        setEditModalOpen(true);
    };
    const openDeleteModal = (department) => {
        setSelectedDepartment(department);
        setDeleteModalOpen(true);
    };
    if (loading) {
        return (_jsx(Page, { title: "Departments", children: _jsx(Card, { children: _jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }) }));
    }
    if (error) {
        return (_jsx(Page, { title: "Departments", children: _jsxs(Alert, { variant: "error", title: "Error", children: ["Failed to load departments: ", error.message] }) }));
    }
    // Build parent department options (exclude current department if editing)
    const parentOptions = [
        { value: '', label: '(No parent)' },
        ...departments
            .filter((d) => !selectedDepartment || d.id !== selectedDepartment.id)
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
    return (_jsxs(Page, { title: "Departments", actions: _jsxs(Button, { onClick: () => setCreateModalOpen(true), children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Create Department"] }), children: [mutationError && (_jsx(Alert, { variant: "error", title: "Error", className: "mb-4", children: mutationError.message })), _jsx(Card, { children: _jsx(DataTable, { data: departments, columns: [
                        {
                            key: 'name',
                            label: 'Name',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { className: "w-4 h-4 text-muted-foreground" }), _jsx("span", { className: "font-medium", children: row.name })] })),
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
                    ], emptyMessage: "No departments found. Create your first department to get started." }) }), _jsx(Modal, { open: createModalOpen, onClose: () => {
                    setCreateModalOpen(false);
                    resetForm();
                }, title: "Create Department", description: "Create a new organizational department", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., Engineering", required: true }), _jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., ENG" }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 3 }), _jsx(Select, { label: "Parent Department", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setCreateModalOpen(false); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleCreate, disabled: !name || mutating, children: mutating ? 'Creating...' : 'Create' })] })] }) }), _jsx(Modal, { open: editModalOpen, onClose: () => {
                    setEditModalOpen(false);
                    setSelectedDepartment(null);
                    resetForm();
                }, title: "Edit Department", description: "Update department details", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., Engineering", required: true }), _jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., ENG" }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 3 }), _jsx(Select, { label: "Parent Department", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsx(Select, { label: "Status", value: isActive ? 'true' : 'false', onChange: (v) => setIsActive(v === 'true'), options: [
                                { value: 'true', label: 'Active' },
                                { value: 'false', label: 'Inactive' },
                            ] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setEditModalOpen(false); setSelectedDepartment(null); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleUpdate, disabled: !name || mutating, children: mutating ? 'Saving...' : 'Save Changes' })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => {
                    setDeleteModalOpen(false);
                    setSelectedDepartment(null);
                }, title: "Delete Department", description: `Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`, children: _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setDeleteModalOpen(false); setSelectedDepartment(null); }, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: mutating, children: mutating ? 'Deleting...' : 'Delete' })] }) })] }));
}
export default Departments;
//# sourceMappingURL=Departments.js.map
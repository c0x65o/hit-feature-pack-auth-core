'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, UserCog } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { formatDate } from '@hit/sdk';
import { useUserOrgAssignments, useUserOrgAssignmentMutations, useDivisions, useDepartments, useLocations, } from '../hooks/useOrgDimensions';
import { useUsers } from '../hooks/useAuthAdmin';
export function OrgAssignments({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, Spinner, Select } = useUi();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    // Filters
    const [filterUserKey, setFilterUserKey] = useState('');
    const [filterDivisionId, setFilterDivisionId] = useState('');
    // Form state
    const [userKey, setUserKey] = useState('');
    const [divisionId, setDivisionId] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [locationId, setLocationId] = useState('');
    const { data: assignments, loading, error, refresh } = useUserOrgAssignments({
        userKey: filterUserKey || undefined,
        divisionId: filterDivisionId || undefined,
    });
    const { data: divisions } = useDivisions();
    const { data: departments } = useDepartments();
    const { data: locations } = useLocations();
    const { create, remove, loading: mutating, error: mutationError } = useUserOrgAssignmentMutations();
    const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
    const resetForm = () => {
        setUserKey('');
        setDivisionId('');
        setDepartmentId('');
        setLocationId('');
    };
    const handleCreate = async () => {
        try {
            await create({
                userKey,
                divisionId: divisionId || null,
                departmentId: departmentId || null,
                locationId: locationId || null,
            });
            setCreateModalOpen(false);
            resetForm();
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDelete = async () => {
        if (!selectedAssignment)
            return;
        try {
            await remove(selectedAssignment.id);
            setDeleteModalOpen(false);
            setSelectedAssignment(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const openDeleteModal = (assignment) => {
        setSelectedAssignment(assignment);
        setDeleteModalOpen(true);
    };
    if (loading) {
        return (_jsx(Page, { title: "Org Assignments", children: _jsx(Card, { children: _jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }) }));
    }
    if (error) {
        return (_jsx(Page, { title: "Org Assignments", children: _jsxs(Alert, { variant: "error", title: "Error", children: ["Failed to load assignments: ", error.message] }) }));
    }
    // Build user options
    const userOptions = [
        { value: '', label: 'Select a user' },
        ...(allUsers?.items || []).map((u) => ({
            value: u.email,
            label: u.email,
        })),
    ];
    // Build division options
    const divisionOptions = [
        { value: '', label: '(No division)' },
        ...divisions.map((d) => ({ value: d.id, label: d.name })),
    ];
    // Build department options (standalone - no division filtering)
    const departmentOptions = [
        { value: '', label: '(No department)' },
        ...departments.map((d) => ({ value: d.id, label: d.name })),
    ];
    // Build location options (standalone - same as divisions)
    const locationOptions = [
        { value: '', label: '(No location)' },
        ...locations.map((l) => ({ value: l.id, label: l.name })),
    ];
    return (_jsxs(Page, { title: "Org Assignments", actions: _jsxs(Button, { onClick: () => setCreateModalOpen(true), children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Create Assignment"] }), children: [mutationError && (_jsx(Alert, { variant: "error", title: "Error", className: "mb-4", children: mutationError.message })), _jsx(Card, { className: "mb-4", children: _jsxs("div", { className: "flex gap-4 items-end", children: [_jsx("div", { className: "flex-1", children: _jsx(Select, { label: "Filter by User", value: filterUserKey, onChange: (v) => {
                                    setFilterUserKey(v);
                                    refresh();
                                }, options: [{ value: '', label: 'All users' }, ...userOptions.slice(1)] }) }), _jsx("div", { className: "flex-1", children: _jsx(Select, { label: "Filter by Division", value: filterDivisionId, onChange: (v) => {
                                    setFilterDivisionId(v);
                                    refresh();
                                }, options: [{ value: '', label: 'All divisions' }, ...divisionOptions.slice(1)] }) })] }) }), _jsx(Card, { children: _jsx(DataTable, { data: assignments, columns: [
                        {
                            key: 'userKey',
                            label: 'User',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(UserCog, { className: "w-4 h-4 text-muted-foreground" }), _jsx("span", { className: "font-medium", children: row.userKey })] })),
                        },
                        {
                            key: 'divisionName',
                            label: 'Division',
                            render: (_value, row) => row.divisionName || '-',
                        },
                        {
                            key: 'departmentName',
                            label: 'Department',
                            render: (_value, row) => row.departmentName || '-',
                        },
                        {
                            key: 'locationName',
                            label: 'Location',
                            render: (_value, row) => row.locationName || (row.locationId ? row.locationId.slice(0, 8) + '...' : '-'),
                        },
                        {
                            key: 'createdAt',
                            label: 'Created',
                            render: (_value, row) => formatDate(row.createdAt),
                        },
                        {
                            key: 'actions',
                            label: '',
                            render: (_value, row) => (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openDeleteModal(row), children: _jsx(Trash2, { className: "w-4 h-4 text-danger" }) })),
                        },
                    ], emptyMessage: "No assignments found. Create your first org assignment to get started." }) }), _jsx(Modal, { open: createModalOpen, onClose: () => {
                    setCreateModalOpen(false);
                    resetForm();
                }, title: "Create Org Assignment", description: "Assign a user to organizational units", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Select, { label: "User", value: userKey, onChange: setUserKey, options: userOptions, required: true }), _jsx(Select, { label: "Division", value: divisionId, onChange: setDivisionId, options: divisionOptions }), _jsx(Select, { label: "Department", value: departmentId, onChange: setDepartmentId, options: departmentOptions }), _jsx(Select, { label: "Location", value: locationId, onChange: setLocationId, options: locationOptions }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setCreateModalOpen(false); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleCreate, disabled: !userKey || (!divisionId && !departmentId && !locationId) || mutating, children: mutating ? 'Creating...' : 'Create' })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => {
                    setDeleteModalOpen(false);
                    setSelectedAssignment(null);
                }, title: "Delete Assignment", description: `Are you sure you want to remove this org assignment for "${selectedAssignment?.userKey}"? This action cannot be undone.`, children: _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setDeleteModalOpen(false); setSelectedAssignment(null); }, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: mutating, children: mutating ? 'Deleting...' : 'Delete' })] }) })] }));
}
export default OrgAssignments;
//# sourceMappingURL=OrgAssignments.js.map
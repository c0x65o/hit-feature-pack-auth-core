'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Trash2, Plus, Edit2, MapPin } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useLocations, useLocationMutations, useLocationTypes, } from '../hooks/useOrgDimensions';
import { useUsers } from '../hooks/useAuthAdmin';
export function Locations({ onNavigate }) {
    const { Page, Card, Button, Badge, DataTable, Modal, Input, Alert, TextArea, Spinner, Select } = useUi();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [parentId, setParentId] = useState('');
    const [locationTypeId, setLocationTypeId] = useState('');
    const [managerUserKey, setManagerUserKey] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const { data: locations, loading, error, refresh } = useLocations();
    const { data: locationTypes } = useLocationTypes();
    const { create, update, remove, loading: mutating, error: mutationError } = useLocationMutations();
    const { data: allUsers } = useUsers({ page: 1, pageSize: 1000 });
    const resetForm = () => {
        setName('');
        setCode('');
        setDescription('');
        setAddress('');
        setCity('');
        setState('');
        setPostalCode('');
        setCountry('');
        setParentId('');
        setLocationTypeId('');
        setManagerUserKey('');
        setIsPrimary(false);
        setIsActive(true);
    };
    const handleCreate = async () => {
        try {
            await create({
                name,
                code: code || null,
                description: description || null,
                address: address || null,
                city: city || null,
                state: state || null,
                postalCode: postalCode || null,
                country: country || null,
                parentId: parentId || null,
                locationTypeId: locationTypeId || null,
                managerUserKey: managerUserKey || null,
                isPrimary,
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
        if (!selectedLocation)
            return;
        try {
            await update(selectedLocation.id, {
                name,
                code: code || null,
                description: description || null,
                address: address || null,
                city: city || null,
                state: state || null,
                postalCode: postalCode || null,
                country: country || null,
                parentId: parentId || null,
                locationTypeId: locationTypeId || null,
                managerUserKey: managerUserKey || null,
                isPrimary,
                isActive,
            });
            setEditModalOpen(false);
            setSelectedLocation(null);
            resetForm();
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const handleDelete = async () => {
        if (!selectedLocation)
            return;
        try {
            await remove(selectedLocation.id);
            setDeleteModalOpen(false);
            setSelectedLocation(null);
            refresh();
        }
        catch {
            // Error handled by hook
        }
    };
    const openEditModal = (location) => {
        setSelectedLocation(location);
        setName(location.name);
        setCode(location.code || '');
        setDescription(location.description || '');
        setAddress(location.address || '');
        setCity(location.city || '');
        setState(location.state || '');
        setPostalCode(location.postalCode || '');
        setCountry(location.country || '');
        setParentId(location.parentId || '');
        setLocationTypeId(location.locationTypeId || '');
        setManagerUserKey(location.managerUserKey || '');
        setIsPrimary(location.isPrimary);
        setIsActive(location.isActive);
        setEditModalOpen(true);
    };
    const openDeleteModal = (location) => {
        setSelectedLocation(location);
        setDeleteModalOpen(true);
    };
    if (loading) {
        return (_jsx(Page, { title: "Locations", children: _jsx(Card, { children: _jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Spinner, { size: "lg" }) }) }) }));
    }
    if (error) {
        return (_jsx(Page, { title: "Locations", children: _jsxs(Alert, { variant: "error", title: "Error", children: ["Failed to load locations: ", error.message] }) }));
    }
    // Build parent options (exclude current location if editing)
    const parentOptions = [
        { value: '', label: '(No parent)' },
        ...locations
            .filter((l) => !selectedLocation || l.id !== selectedLocation.id)
            .map((l) => ({ value: l.id, label: l.name })),
    ];
    // Build type options
    const typeOptions = [
        { value: '', label: '(No type)' },
        ...locationTypes.map((t) => ({ value: t.id, label: t.name })),
    ];
    // Build manager options
    const managerOptions = [
        { value: '', label: '(No manager)' },
        ...(allUsers?.items || []).map((u) => ({
            value: u.email,
            label: u.email,
        })),
    ];
    return (_jsxs(Page, { title: "Locations", actions: _jsxs(Button, { onClick: () => setCreateModalOpen(true), children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Create Location"] }), children: [mutationError && (_jsx(Alert, { variant: "error", title: "Error", className: "mb-4", children: mutationError.message })), _jsx(Card, { children: _jsx(DataTable, { data: locations, columns: [
                        {
                            key: 'name',
                            label: 'Name',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MapPin, { className: "w-4 h-4 text-muted-foreground" }), _jsx("span", { className: "font-medium", children: row.name }), row.isPrimary && (_jsx(Badge, { variant: "success", className: "ml-1", children: "HQ" }))] })),
                        },
                        {
                            key: 'code',
                            label: 'Code',
                            render: (_value, row) => row.code || '-',
                        },
                        {
                            key: 'locationTypeName',
                            label: 'Type',
                            render: (_value, row) => row.locationTypeName || '-',
                        },
                        {
                            key: 'city',
                            label: 'City',
                            render: (_value, row) => row.city || '-',
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
                            key: 'actions',
                            label: '',
                            render: (_value, row) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => openEditModal(row), children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => openDeleteModal(row), children: _jsx(Trash2, { className: "w-4 h-4 text-danger" }) })] })),
                        },
                    ], emptyMessage: "No locations found. Create your first location to get started." }) }), _jsx(Modal, { open: createModalOpen, onClose: () => {
                    setCreateModalOpen(false);
                    resetForm();
                }, title: "Create Location", description: "Create a new physical or virtual location", children: _jsxs("div", { className: "space-y-4 max-h-[60vh] overflow-y-auto", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., NYC Office", required: true }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., NYC" }), _jsx(Select, { label: "Type", value: locationTypeId, onChange: setLocationTypeId, options: typeOptions })] }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 2 }), _jsx(Input, { label: "Address", value: address, onChange: setAddress, placeholder: "Street address" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "City", value: city, onChange: setCity }), _jsx(Input, { label: "State", value: state, onChange: setState })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Postal Code", value: postalCode, onChange: setPostalCode }), _jsx(Input, { label: "Country", value: country, onChange: setCountry })] }), _jsx(Select, { label: "Parent Location", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsx(Select, { label: "Primary/HQ", value: isPrimary ? 'true' : 'false', onChange: (v) => setIsPrimary(v === 'true'), options: [
                                { value: 'false', label: 'No' },
                                { value: 'true', label: 'Yes (Headquarters)' },
                            ] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setCreateModalOpen(false); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleCreate, disabled: !name || mutating, children: mutating ? 'Creating...' : 'Create' })] })] }) }), _jsx(Modal, { open: editModalOpen, onClose: () => {
                    setEditModalOpen(false);
                    setSelectedLocation(null);
                    resetForm();
                }, title: "Edit Location", description: "Update location details", children: _jsxs("div", { className: "space-y-4 max-h-[60vh] overflow-y-auto", children: [_jsx(Input, { label: "Name", value: name, onChange: setName, placeholder: "e.g., NYC Office", required: true }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Code", value: code, onChange: setCode, placeholder: "e.g., NYC" }), _jsx(Select, { label: "Type", value: locationTypeId, onChange: setLocationTypeId, options: typeOptions })] }), _jsx(TextArea, { label: "Description", value: description, onChange: setDescription, placeholder: "Optional description", rows: 2 }), _jsx(Input, { label: "Address", value: address, onChange: setAddress, placeholder: "Street address" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "City", value: city, onChange: setCity }), _jsx(Input, { label: "State", value: state, onChange: setState })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Postal Code", value: postalCode, onChange: setPostalCode }), _jsx(Input, { label: "Country", value: country, onChange: setCountry })] }), _jsx(Select, { label: "Parent Location", value: parentId, onChange: setParentId, options: parentOptions }), _jsx(Select, { label: "Manager", value: managerUserKey, onChange: setManagerUserKey, options: managerOptions }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Select, { label: "Primary/HQ", value: isPrimary ? 'true' : 'false', onChange: (v) => setIsPrimary(v === 'true'), options: [
                                        { value: 'false', label: 'No' },
                                        { value: 'true', label: 'Yes (Headquarters)' },
                                    ] }), _jsx(Select, { label: "Status", value: isActive ? 'true' : 'false', onChange: (v) => setIsActive(v === 'true'), options: [
                                        { value: 'true', label: 'Active' },
                                        { value: 'false', label: 'Inactive' },
                                    ] })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setEditModalOpen(false); setSelectedLocation(null); resetForm(); }, children: "Cancel" }), _jsx(Button, { onClick: handleUpdate, disabled: !name || mutating, children: mutating ? 'Saving...' : 'Save Changes' })] })] }) }), _jsx(Modal, { open: deleteModalOpen, onClose: () => {
                    setDeleteModalOpen(false);
                    setSelectedLocation(null);
                }, title: "Delete Location", description: `Are you sure you want to delete "${selectedLocation?.name}"? This action cannot be undone.`, children: _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { variant: "secondary", onClick: () => { setDeleteModalOpen(false); setSelectedLocation(null); }, children: "Cancel" }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: mutating, children: mutating ? 'Deleting...' : 'Delete' })] }) })] }));
}
export default Locations;
//# sourceMappingURL=Locations.js.map
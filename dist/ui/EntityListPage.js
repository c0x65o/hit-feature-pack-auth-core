'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useServerDataTableState } from '@hit/ui-kit/hooks/useServerDataTableState';
import { useEntityUiSpec } from './useHitUiSpecs';
import { useEntityDataTableColumns } from './entityTable';
import { useEntityDataSource } from './entityDataSources';
export function EntityListPage({ entityKey, onNavigate, useListData, customRenderers, renderRowActions, emptyMessage, }) {
    const { Page, Card, Button, DataTable, Modal, AlertDialog, Alert, Spinner } = useUi();
    const alertDialog = useAlertDialog();
    const uiSpec = useEntityUiSpec(entityKey);
    const dataSource = useEntityDataSource(entityKey);
    const [isMobile, setIsMobile] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
            return;
        const mql = window.matchMedia('(max-width: 640px)');
        const onChange = () => setIsMobile(Boolean(mql.matches));
        onChange();
        try {
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        }
        catch {
            // eslint-disable-next-line deprecation/deprecation
            mql.addListener(onChange);
            // eslint-disable-next-line deprecation/deprecation
            return () => mql.removeListener(onChange);
        }
    }, []);
    if (!uiSpec)
        return _jsx(Spinner, {});
    const listSpec = uiSpec?.list && typeof uiSpec.list === 'object' ? uiSpec.list : null;
    if (!listSpec) {
        return (_jsxs(Alert, { variant: "error", title: `Missing ${entityKey} list spec`, children: ["UI schema for `", entityKey, ".list` is missing. Run `hit ui generate` and ensure your entity YAML provides a `list` block."] }));
    }
    const meta = uiSpec?.meta || {};
    const routes = meta?.routes || {};
    const actionsMeta = meta?.actions || {};
    const pageTitle = String(meta.titlePlural || entityKey);
    const pageDescription = String(meta.descriptionPlural || '');
    const createLabel = String(actionsMeta.createLabel || 'New');
    const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
    const deleteLabel = String(actionsMeta.deleteLabel || 'Delete');
    const deleteConfirmTitle = String(actionsMeta.deleteConfirmTitle || `Delete ${String(meta.titleSingular || 'Item')}`);
    const deleteConfirmBodyTpl = String(actionsMeta.deleteConfirmBody || 'Are you sure you want to delete "{name}"? This action cannot be undone.');
    const tableId = String(listSpec.tableId || entityKey);
    const uiStateVersion = String(listSpec.uiStateVersion || '').trim();
    const uiStateKey = uiStateVersion ? `${tableId}@v${uiStateVersion}` : tableId;
    const serverTable = useServerDataTableState({
        tableId,
        pageSize: Number(listSpec.pageSize || 25),
        initialSort: listSpec.initialSort || { sortBy: 'id', sortOrder: 'desc' },
        sortWhitelist: Array.isArray(listSpec.sortWhitelist) ? listSpec.sortWhitelist : undefined,
    });
    const effectiveUseListData = useListData || dataSource?.useList;
    if (!effectiveUseListData) {
        return (_jsxs(Alert, { variant: "error", title: `Missing data source for ${entityKey}`, children: ["No list data source is registered for `", entityKey, "`. Add it to `src/ui/entityDataSources.tsx` (or pass `useListData`)."] }));
    }
    const { data, loading, refetch, deleteItem } = effectiveUseListData({
        page: serverTable.query.page,
        pageSize: serverTable.query.pageSize,
        search: serverTable.query.search,
        filters: serverTable.query.filters,
        filterMode: serverTable.query.filterMode,
        sortBy: serverTable.query.sortBy,
        sortOrder: serverTable.query.sortOrder,
    });
    const items = data?.items || [];
    const pagination = data?.pagination;
    const onRequestDelete = (args) => setDeleteConfirm(args);
    const dsRenderers = dataSource?.useListCustomRenderers ? dataSource.useListCustomRenderers() : {};
    const effectiveRowActions = renderRowActions || dataSource?.renderRowActions;
    const columns = useEntityDataTableColumns({
        listSpec: listSpec,
        isMobile,
        customRenderers: useMemo(() => {
            const base = { ...(dsRenderers || {}), ...(customRenderers || {}) };
            if (effectiveRowActions) {
                base.actions = (_, row) => effectiveRowActions({ row, onRequestDelete, ui: { Button } });
            }
            return base;
        }, [customRenderers, dsRenderers, effectiveRowActions, Button]),
    });
    const effectiveInitialColumnVisibility = useMemo(() => {
        const init = listSpec.initialColumnVisibility || {};
        const mode = Boolean(listSpec.defaultVisibleOnly);
        if (!mode)
            return init;
        const vis = {};
        for (const c of columns || []) {
            const key = c?.key ? String(c.key) : '';
            if (!key)
                continue;
            vis[key] = init[key] === true;
        }
        return vis;
    }, [listSpec.initialColumnVisibility, listSpec.defaultVisibleOnly, columns]);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const newHref = String(routes.new || `/${entityKey}/new`);
    const detailHref = (id) => String(routes.detail || `/${entityKey}/{id}`).replace('{id}', encodeURIComponent(id));
    const handleDelete = async () => {
        if (!deleteConfirm || !deleteItem)
            return;
        setIsDeleting(true);
        try {
            await deleteItem(deleteConfirm.id);
            await refetch();
            setDeleteConfirm(null);
        }
        catch (error) {
            console.error('Failed to delete item:', error);
            await alertDialog.showAlert(error?.message || 'Failed to delete item', {
                variant: 'error',
                title: 'Delete Failed',
            });
        }
        finally {
            setIsDeleting(false);
        }
    };
    return (_jsxs(Page, { title: pageTitle, description: pageDescription, actions: _jsxs(Button, { variant: "primary", onClick: () => navigate(newHref), children: [_jsx(Plus, { size: 16, className: "mr-2" }), createLabel] }), children: [_jsx(Card, { children: _jsx(DataTable, { columns: columns, data: items, loading: loading, emptyMessage: emptyMessage || 'No items yet.', onRowClick: (row) => {
                        navigate(detailHref(String(row.id)));
                    }, onRefresh: refetch, refreshing: loading, total: pagination?.total, ...serverTable.dataTable, searchDebounceMs: 400, tableId: tableId, uiStateKey: uiStateKey, enableViews: true, showColumnVisibility: true, initialColumnVisibility: effectiveInitialColumnVisibility, initialSorting: listSpec.initialSorting }) }), deleteConfirm && deleteItem && (_jsx(Modal, { open: true, onClose: () => setDeleteConfirm(null), title: deleteConfirmTitle, children: _jsxs("div", { style: { padding: '16px' }, children: [_jsx("p", { style: { marginBottom: '16px' }, children: deleteConfirmBodyTpl.replace('{name}', deleteConfirm.name) }), _jsxs("div", { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleteConfirm(null), disabled: isDeleting, children: cancelLabel }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: isDeleting, children: isDeleting ? 'Deleting...' : deleteLabel })] })] }) })), _jsx(AlertDialog, { ...alertDialog.props })] }));
}
//# sourceMappingURL=EntityListPage.js.map
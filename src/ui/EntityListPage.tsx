'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useServerDataTableState } from '@hit/ui-kit';
import { useEntityDataTableColumns, type DataTableColumn } from '@hit/ui-kit';
import { useEntityUiSpec } from './useHitUiSpecs';
import { useEntityDataSource, type ListQueryArgs as DsListQueryArgs } from './entityDataSources';

type ListSpec = {
  tableId?: string;
  uiStateVersion?: number | string;
  pageSize?: number;
  initialSort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' };
  sortWhitelist?: string[];
  defaultVisibleOnly?: boolean;
  initialColumnVisibility?: Record<string, boolean>;
  initialSorting?: Array<{ id: string; desc?: boolean }>;
  columns?: any;
};

type ListQueryArgs = {
  page: number;
  pageSize: number;
  search?: string;
  filters?: any[];
  filterMode?: 'all' | 'any';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export function EntityListPage({
  entityKey,
  onNavigate,
  useListData,
  customRenderers,
  renderRowActions,
  emptyMessage,
}: {
  entityKey: string;
  onNavigate?: (path: string) => void;
  useListData?: (args: ListQueryArgs) => {
    data: any;
    loading: boolean;
    refetch: () => Promise<any> | void;
    deleteItem?: (id: string) => Promise<any>;
  };
  customRenderers?: Record<string, DataTableColumn['render']>;
  renderRowActions?: (args: {
    row: Record<string, unknown>;
    onRequestDelete: (args: { id: string; name: string }) => void;
    ui: { Button: any };
  }) => React.ReactNode;
  emptyMessage?: string;
}) {
  const { Page, Card, Button, DataTable, Modal, AlertDialog, Alert, Spinner } = useUi();
  const alertDialog = useAlertDialog();

  const uiSpec = useEntityUiSpec(entityKey);
  const dataSource = useEntityDataSource(entityKey);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(Boolean(mql.matches));
    onChange();
    try {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } catch {
      // eslint-disable-next-line deprecation/deprecation
      mql.addListener(onChange);
      // eslint-disable-next-line deprecation/deprecation
      return () => mql.removeListener(onChange);
    }
  }, []);

  if (!uiSpec) return <Spinner />;

  const listSpec: ListSpec | null =
    (uiSpec as any)?.list && typeof (uiSpec as any).list === 'object' ? ((uiSpec as any).list as any) : null;

  if (!listSpec) {
    return (
      <Alert variant="error" title={`Missing ${entityKey} list spec`}>
        UI schema for `{entityKey}.list` is missing. Run `hit ui generate` and ensure your entity YAML provides a `list`
        block.
      </Alert>
    );
  }

  const meta: any = (uiSpec as any)?.meta || {};
  const routes = meta?.routes || {};
  const actionsMeta: any = meta?.actions || {};

  const pageTitle = String(meta.titlePlural || entityKey);
  const pageDescription = String(meta.descriptionPlural || '');
  const createLabel = String(actionsMeta.createLabel || 'New');
  const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
  const deleteLabel = String(actionsMeta.deleteLabel || 'Delete');
  const deleteConfirmTitle = String(actionsMeta.deleteConfirmTitle || `Delete ${String(meta.titleSingular || 'Item')}`);
  const deleteConfirmBodyTpl = String(
    actionsMeta.deleteConfirmBody || 'Are you sure you want to delete "{name}"? This action cannot be undone.'
  );

  const tableId = String(listSpec.tableId || entityKey);
  const uiStateVersion = String(listSpec.uiStateVersion || '').trim();
  const uiStateKey = uiStateVersion ? `${tableId}@v${uiStateVersion}` : tableId;

  const serverTable = useServerDataTableState({
    tableId,
    pageSize: Number(listSpec.pageSize || 25),
    initialSort: (listSpec.initialSort as any) || { sortBy: 'id', sortOrder: 'desc' },
    sortWhitelist: Array.isArray(listSpec.sortWhitelist) ? listSpec.sortWhitelist : undefined,
  });

  const effectiveUseListData = useListData || (dataSource?.useList as any);
  if (!effectiveUseListData) {
    return (
      <Alert variant="error" title={`Missing data source for ${entityKey}`}>
        No list data source is registered for `{entityKey}`. Add it to `src/ui/entityDataSources.tsx` (or pass `useListData`).
      </Alert>
    );
  }

  const { data, loading, refetch, deleteItem } = effectiveUseListData({
    page: serverTable.query.page,
    pageSize: serverTable.query.pageSize,
    search: serverTable.query.search,
    filters: serverTable.query.filters as any,
    filterMode: serverTable.query.filterMode,
    sortBy: serverTable.query.sortBy,
    sortOrder: serverTable.query.sortOrder,
  } as DsListQueryArgs);

  const items = data?.items || [];
  const pagination = data?.pagination;

  const onRequestDelete = (args: { id: string; name: string }) => setDeleteConfirm(args);

  const dsRenderers = dataSource?.useListCustomRenderers ? dataSource.useListCustomRenderers() : {};
  const effectiveRowActions = renderRowActions || dataSource?.renderRowActions;

  const columns = useEntityDataTableColumns({
    listSpec: listSpec as any,
    fieldsMap: (uiSpec as any)?.fields || null,
    isMobile,
    customRenderers: useMemo(() => {
      const base = { ...(dsRenderers || {}), ...(customRenderers || {}) } as Record<string, DataTableColumn['render']>;
      if (effectiveRowActions) {
        base.actions = (_: unknown, row: Record<string, unknown>) =>
          effectiveRowActions({ row, onRequestDelete, ui: { Button } });
      }
      return base;
    }, [customRenderers, dsRenderers, effectiveRowActions, Button]),
  });

  const effectiveInitialColumnVisibility = useMemo(() => {
    const init = listSpec.initialColumnVisibility || {};
    const mode = Boolean((listSpec as any).defaultVisibleOnly);
    if (!mode) return init;
    const vis: Record<string, boolean> = {};
    for (const c of columns || []) {
      const key = c?.key ? String(c.key) : '';
      if (!key) continue;
      vis[key] = init[key] === true;
    }
    return vis;
  }, [listSpec.initialColumnVisibility, (listSpec as any).defaultVisibleOnly, columns]);

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const newHref = String(routes.new || `/${entityKey}/new`);
  const detailHref = (id: string) => String(routes.detail || `/${entityKey}/{id}`).replace('{id}', encodeURIComponent(id));

  const handleDelete = async () => {
    if (!deleteConfirm || !deleteItem) return;
    setIsDeleting(true);
    try {
      await deleteItem(deleteConfirm.id);
      await refetch();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      await alertDialog.showAlert(error?.message || 'Failed to delete item', {
        variant: 'error',
        title: 'Delete Failed',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Page
      title={pageTitle}
      description={pageDescription}
      actions={
        <Button variant="primary" onClick={() => navigate(newHref)}>
          <Plus size={16} className="mr-2" />
          {createLabel}
        </Button>
      }
    >
      <Card>
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage={emptyMessage || 'No items yet.'}
          onRowClick={(row: Record<string, unknown>) => {
            navigate(detailHref(String((row as any).id)));
          }}
          onRefresh={refetch}
          refreshing={loading}
          total={pagination?.total}
          {...serverTable.dataTable}
          searchDebounceMs={400}
          tableId={tableId}
          uiStateKey={uiStateKey}
          enableViews={true}
          showColumnVisibility={true}
          initialColumnVisibility={effectiveInitialColumnVisibility}
          initialSorting={listSpec.initialSorting}
        />
      </Card>

      {deleteConfirm && deleteItem && (
        <Modal open={true} onClose={() => setDeleteConfirm(null)} title={deleteConfirmTitle}>
          <div style={{ padding: '16px' }}>
            <p style={{ marginBottom: '16px' }}>{deleteConfirmBodyTpl.replace('{name}', deleteConfirm.name)}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                {cancelLabel}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : deleteLabel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <AlertDialog {...alertDialog.props} />
    </Page>
  );
}


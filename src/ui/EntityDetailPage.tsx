'use client';

import React, { useMemo, useState } from 'react';
import { Download, Globe, Mail, Phone, Trash2 } from 'lucide-react';
import type { BreadcrumbItem } from '@hit/ui-kit';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useEntityUiSpec } from './useHitUiSpecs';
import { useEntityDataSource } from './entityDataSources';
import { EntityDetailBody } from './EntityDetailBody';
import { getEntityActionHandler } from './entityActions';

export function EntityDetailPage({
  entityKey,
  id,
  onNavigate,
  useDetailData,
  resolve,
  renderHeaderActions,
  renderBody,
}: {
  entityKey: string;
  id: string;
  onNavigate?: (path: string) => void;
  useDetailData?: (args: { id: string }) => {
    record: any;
    loading: boolean;
    deleteItem?: (id: string) => Promise<any>;
  };
  resolve?: (args: { record: any }) => any;
  renderHeaderActions?: (args: {
    record: any;
    resolved: any;
    navigate: (path: string) => void;
    uiSpec: any;
    ui: { Button: any };
  }) => React.ReactNode;
  renderBody?: (args: { record: any; resolved: any; navigate: (path: string) => void; uiSpec: any }) => React.ReactNode;
}) {
  const { Page, Spinner, Alert, Button, Modal, AlertDialog } = useUi();
  const alertDialog = useAlertDialog();

  const uiSpec = useEntityUiSpec(entityKey);
  const dataSource = useEntityDataSource(entityKey);
  const effectiveUseDetail = useDetailData || (dataSource?.useDetail as any);
  if (!effectiveUseDetail) {
    return (
      <Alert variant="error" title={`Missing data source for ${entityKey}`}>
        No detail data source is registered for `{entityKey}`. Add it to `src/ui/entityDataSources.tsx` (or pass `useDetailData`).
      </Alert>
    );
  }

  const { record, loading, deleteItem } = effectiveUseDetail({ id });
  const resolved = resolve ? resolve({ record }) : null;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const meta: any = (uiSpec as any)?.meta || {};
  const routes = meta?.routes || {};
  const actionsMeta: any = meta?.actions || {};
  const headerActionsSpec: any[] = Array.isArray(meta?.headerActions) ? meta.headerActions : [];

  const listHref = String(routes.list || '/');
  const editHref = (rid: string) => String(routes.edit || '/{id}/edit').replace('{id}', encodeURIComponent(rid));

  const breadcrumbsBase: BreadcrumbItem[] = Array.isArray(meta?.breadcrumbs)
    ? meta.breadcrumbs
        .filter((b: any) => b && typeof b === 'object' && b.label && b.href)
        .map((b: any) => ({ label: String(b.label), href: String(b.href) }))
    : [];

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const name = record?.name ? String(record.name) : String(meta?.titleSingular || entityKey);
    return [...breadcrumbsBase, { label: name }];
  }, [breadcrumbsBase, record, meta?.titleSingular, entityKey]);

  const editLabel = String(actionsMeta.editLabel || 'Edit');
  const deleteLabel = String(actionsMeta.deleteLabel || 'Delete');
  const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
  const deleteConfirmTitle = String(actionsMeta.deleteConfirmTitle || `Delete ${String(meta?.titleSingular || 'Item')}`);
  const deleteConfirmBodyTpl = String(
    actionsMeta.deleteConfirmBody || 'Are you sure you want to delete "{name}"? This action cannot be undone.'
  );

  if (!uiSpec) return <Spinner />;
  if (loading) return <Spinner />;
  if (!record) {
    return (
      <Alert variant="error" title={`${String(meta?.titleSingular || 'Record')} not found`}>
        The record you're looking for doesn't exist.
      </Alert>
    );
  }

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await deleteItem(String(record.id));
      navigate(listHref);
    } catch (error: any) {
      console.error('Failed to delete:', error);
      await alertDialog.showAlert(error?.message || 'Failed to delete item', {
        variant: 'error',
        title: 'Delete Failed',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const pageTitle = record?.name ? String(record.name) : String(meta?.titleSingular || entityKey);

  const renderSpecHeaderActions = () => {
    if (!Array.isArray(headerActionsSpec) || headerActionsSpec.length === 0) return null;
    const nodes: React.ReactNode[] = [];
    for (const a of headerActionsSpec) {
      if (!a || typeof a !== 'object') continue;
      const kind = String((a as any).kind || '').trim();
      if (!kind) continue;

      if (kind === 'call') {
        const field = String((a as any).field || '').trim();
        const phone =
          (field ? (record as any)?.[field] : null) ||
          (record as any)?.phone ||
          (Array.isArray((record as any)?.phones) ? (record as any).phones?.[0]?.phone : null);
        if (!phone) continue;
        nodes.push(
          <Button
            key="call"
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.href = `tel:${String(phone)}`;
            }}
          >
            <Phone size={16} className="mr-1" />
            {String((a as any).label || actionsMeta.callLabel || 'Call')}
          </Button>
        );
        continue;
      }

      if (kind === 'email') {
        const field = String((a as any).field || '').trim();
        const email = (field ? (record as any)?.[field] : null) || (record as any)?.email;
        if (!email) continue;
        nodes.push(
          <Button
            key="email"
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.href = `mailto:${String(email)}`;
            }}
          >
            <Mail size={16} className="mr-1" />
            {String((a as any).label || actionsMeta.emailLabel || 'Email')}
          </Button>
        );
        continue;
      }

      if (kind === 'visit') {
        const field = String((a as any).field || 'website').trim();
        const website = (record as any)?.[field];
        if (!website) continue;
        const label = String((a as any).label || actionsMeta.visitLabel || 'Visit');
        nodes.push(
          <Button
            key="visit"
            variant="secondary"
            size="sm"
            onClick={() => {
              const raw = String(website);
              const href = raw.startsWith('http') ? raw : `https://${raw}`;
              window.open(href, '_blank');
            }}
          >
            <Globe size={16} className="mr-1" />
            {label}
          </Button>
        );
        continue;
      }

      if (kind === 'action') {
        const actionKey = String((a as any).actionKey || '').trim();
        if (!actionKey) continue;
        const handler = getEntityActionHandler(actionKey);
        if (!handler) continue;
        const label = String((a as any).label || actionKey);
        const icon = String((a as any).icon || '').trim().toLowerCase();
        nodes.push(
          <Button
            key={actionKey}
            variant="secondary"
            size="sm"
            onClick={async () => {
              await handler({ entityKey, record });
            }}
          >
            {icon === 'download' ? <Download size={16} className="mr-1" /> : null}
            {label}
          </Button>
        );
        continue;
      }
    }
    return nodes.length > 0 ? <>{nodes}</> : null;
  };

  return (
    <Page
      title={pageTitle}
      breadcrumbs={breadcrumbs}
      onNavigate={navigate}
      actions={
        <div className="flex items-center gap-2">
          {renderHeaderActions ? renderHeaderActions({ record, resolved, navigate, uiSpec, ui: { Button } }) : renderSpecHeaderActions()}
          <Button variant="primary" onClick={() => navigate(editHref(String(record.id)))}>
            {editLabel}
          </Button>
          {deleteItem ? (
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
              <Trash2 size={16} className="mr-2" />
              {deleteLabel}
            </Button>
          ) : null}
        </div>
      }
    >
      {renderBody ? renderBody({ record, resolved, navigate, uiSpec }) : <EntityDetailBody entityKey={entityKey} uiSpec={uiSpec} record={record} navigate={navigate} />}

      {showDeleteConfirm && deleteItem && (
        <Modal open={true} onClose={() => setShowDeleteConfirm(false)} title={deleteConfirmTitle}>
          <div style={{ padding: '16px' }}>
            <p style={{ marginBottom: '16px' }}>
              {deleteConfirmBodyTpl.replace('{name}', String(record?.name || record?.id || ''))}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
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


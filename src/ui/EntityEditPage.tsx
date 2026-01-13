'use client';

import React, { useMemo } from 'react';
import type { BreadcrumbItem } from '@hit/ui-kit';
import { useUi } from '@hit/ui-kit';
import { useEntityUiSpec } from './useHitUiSpecs';

export function EntityEditPage({
  entityKey,
  id,
  onNavigate,
  loading,
  submitting,
  error,
  clearError,
  onSubmit,
  children,
}: {
  entityKey: string;
  id?: string;
  onNavigate?: (path: string) => void;
  loading?: boolean;
  submitting?: boolean;
  error?: { message?: string } | null;
  clearError?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const { Page, Card, Button, Spinner, Alert } = useUi();
  const uiSpec = useEntityUiSpec(entityKey);

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  if (!uiSpec) return <Spinner />;

  const meta: any = (uiSpec as any)?.meta || {};
  const routes = meta?.routes || {};
  const actionsMeta: any = meta?.actions || {};

  const titleSingular = String(meta.titleSingular || entityKey);
  const listHref = String(routes.list || '/');
  const detailHref = (rid: string) => String(routes.detail || '/{id}').replace('{id}', encodeURIComponent(rid));

  const breadcrumbsBase: BreadcrumbItem[] = Array.isArray(meta?.breadcrumbs)
    ? meta.breadcrumbs
        .filter((b: any) => b && typeof b === 'object' && b.label && b.href)
        .map((b: any) => ({ label: String(b.label), href: String(b.href) }))
    : [];

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    return [...breadcrumbsBase, { label: id ? `Edit ${titleSingular}` : `New ${titleSingular}` }];
  }, [breadcrumbsBase, id, titleSingular]);

  const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
  const saveCreateLabel = String(actionsMeta.saveCreateLabel || `Create ${titleSingular}`);
  const saveUpdateLabel = String(actionsMeta.saveUpdateLabel || `Update ${titleSingular}`);

  const pageTitle = id ? `Edit ${titleSingular}` : `New ${titleSingular}`;

  if (loading) return <Spinner />;

  const onCancel = () => navigate(id ? detailHref(id) : listHref);

  return (
    <Page title={pageTitle} breadcrumbs={breadcrumbs} onNavigate={navigate}>
      {error ? (
        <Alert variant="error" title="Error" onClose={clearError}>
          {String(error.message || 'Something went wrong')}
        </Alert>
      ) : null}

      <Card>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}

          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-800">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={Boolean(submitting)}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary" disabled={Boolean(submitting)}>
              {submitting ? 'Saving...' : id ? saveUpdateLabel : saveCreateLabel}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}


'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Download, Globe, Mail, Phone, Trash2 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAlertDialog } from '@hit/ui-kit/hooks/useAlertDialog';
import { useEntityUiSpec } from './useHitUiSpecs';
import { useEntityDataSource } from './entityDataSources';
import { EntityDetailBody } from './EntityDetailBody';
import { getEntityActionHandler } from './entityActions';
export function EntityDetailPage({ entityKey, id, onNavigate, useDetailData, resolve, renderHeaderActions, renderBody, }) {
    const { Page, Spinner, Alert, Button, Modal, AlertDialog } = useUi();
    const alertDialog = useAlertDialog();
    const uiSpec = useEntityUiSpec(entityKey);
    const dataSource = useEntityDataSource(entityKey);
    const effectiveUseDetail = useDetailData || dataSource?.useDetail;
    if (!effectiveUseDetail) {
        return (_jsxs(Alert, { variant: "error", title: `Missing data source for ${entityKey}`, children: ["No detail data source is registered for `", entityKey, "`. Add it to `src/ui/entityDataSources.tsx` (or pass `useDetailData`)."] }));
    }
    const { record, loading, deleteItem } = effectiveUseDetail({ id });
    const resolved = resolve ? resolve({ record }) : null;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // When using router.push() (via onNavigate), do NOT pre-encode the URL because
    // Next.js handles encoding for dynamic route segments. Pre-encoding causes double-encoding
    // (e.g., @ -> %40 -> %2540). Only encode when using window.location.href directly.
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const meta = uiSpec?.meta || {};
    const routes = meta?.routes || {};
    const actionsMeta = meta?.actions || {};
    const headerActionsSpec = Array.isArray(meta?.headerActions) ? meta.headerActions : [];
    const listHref = String(routes.list || '/');
    // Use raw (unencoded) id when onNavigate is provided (router.push), encoded otherwise
    const editHref = (rid) => {
        const tpl = String(routes.edit || '/{id}/edit');
        // When using router.push via onNavigate, don't encode to avoid double-encoding
        return tpl.replace('{id}', onNavigate ? rid : encodeURIComponent(rid));
    };
    const breadcrumbsBase = Array.isArray(meta?.breadcrumbs)
        ? meta.breadcrumbs
            .filter((b) => b && typeof b === 'object' && b.label && b.href)
            .map((b) => ({ label: String(b.label), href: String(b.href) }))
        : [];
    const breadcrumbs = useMemo(() => {
        const name = record?.name ? String(record.name) : String(meta?.titleSingular || entityKey);
        return [...breadcrumbsBase, { label: name }];
    }, [breadcrumbsBase, record, meta?.titleSingular, entityKey]);
    const editLabel = String(actionsMeta.editLabel || 'Edit');
    const deleteLabel = String(actionsMeta.deleteLabel || 'Delete');
    const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
    const deleteConfirmTitle = String(actionsMeta.deleteConfirmTitle || `Delete ${String(meta?.titleSingular || 'Item')}`);
    const deleteConfirmBodyTpl = String(actionsMeta.deleteConfirmBody || 'Are you sure you want to delete "{name}"? This action cannot be undone.');
    if (!uiSpec)
        return _jsx(Spinner, {});
    if (loading)
        return _jsx(Spinner, {});
    if (!record) {
        return (_jsx(Alert, { variant: "error", title: `${String(meta?.titleSingular || 'Record')} not found`, children: "The record you're looking for doesn't exist." }));
    }
    const handleDelete = async () => {
        if (!deleteItem)
            return;
        setIsDeleting(true);
        try {
            await deleteItem(String(record.id));
            navigate(listHref);
        }
        catch (error) {
            console.error('Failed to delete:', error);
            await alertDialog.showAlert(error?.message || 'Failed to delete item', {
                variant: 'error',
                title: 'Delete Failed',
            });
        }
        finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };
    const pageTitle = record?.name ? String(record.name) : String(meta?.titleSingular || entityKey);
    const passesWhen = (whenAny) => {
        const w = whenAny && typeof whenAny === 'object' ? whenAny : null;
        if (!w)
            return true;
        const field = typeof w.field === 'string' ? w.field.trim() : '';
        if (!field)
            return true;
        const raw = record?.[field];
        if ('equals' in w)
            return raw === w.equals;
        if ('notEquals' in w)
            return raw !== w.notEquals;
        if (w.truthy === true)
            return Boolean(raw);
        if (w.falsy === true)
            return !raw;
        return true;
    };
    const interpolate = (tpl) => {
        const s = String(tpl || '');
        return s.replace(/\{([^}]+)\}/g, (_m, key) => {
            const k = String(key || '').trim();
            if (!k)
                return '';
            const v = record?.[k];
            return v == null ? '' : String(v);
        });
    };
    const coerceAlertVariant = (v) => {
        const s = String(v || '').trim().toLowerCase();
        if (s === 'error' || s === 'success' || s === 'warning' || s === 'info')
            return s;
        return undefined;
    };
    const renderSpecHeaderActions = () => {
        if (!Array.isArray(headerActionsSpec) || headerActionsSpec.length === 0)
            return null;
        const nodes = [];
        for (const a of headerActionsSpec) {
            if (!a || typeof a !== 'object')
                continue;
            const kind = String(a.kind || '').trim();
            if (!kind)
                continue;
            if (a.listOnly === true)
                continue;
            if (!passesWhen(a.when))
                continue;
            if (kind === 'call') {
                const field = String(a.field || '').trim();
                const phone = (field ? record?.[field] : null) ||
                    record?.phone ||
                    (Array.isArray(record?.phones) ? record.phones?.[0]?.phone : null);
                if (!phone)
                    continue;
                nodes.push(_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => {
                        window.location.href = `tel:${String(phone)}`;
                    }, children: [_jsx(Phone, { size: 16, className: "mr-1" }), String(a.label || actionsMeta.callLabel || 'Call')] }, "call"));
                continue;
            }
            if (kind === 'email') {
                const field = String(a.field || '').trim();
                const email = (field ? record?.[field] : null) || record?.email;
                if (!email)
                    continue;
                nodes.push(_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => {
                        window.location.href = `mailto:${String(email)}`;
                    }, children: [_jsx(Mail, { size: 16, className: "mr-1" }), String(a.label || actionsMeta.emailLabel || 'Email')] }, "email"));
                continue;
            }
            if (kind === 'visit') {
                const field = String(a.field || 'website').trim();
                const website = record?.[field];
                if (!website)
                    continue;
                const label = String(a.label || actionsMeta.visitLabel || 'Visit');
                nodes.push(_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => {
                        const raw = String(website);
                        const href = raw.startsWith('http') ? raw : `https://${raw}`;
                        window.open(href, '_blank');
                    }, children: [_jsx(Globe, { size: 16, className: "mr-1" }), label] }, "visit"));
                continue;
            }
            if (kind === 'action') {
                const actionKey = String(a.actionKey || '').trim();
                if (!actionKey)
                    continue;
                const handler = getEntityActionHandler(actionKey);
                if (!handler)
                    continue;
                const label = String(a.label || actionKey);
                const icon = String(a.icon || '').trim().toLowerCase();
                nodes.push(_jsxs(Button, { variant: "secondary", size: "sm", onClick: async () => {
                        const confirm = a.confirm && typeof a.confirm === 'object' ? a.confirm : null;
                        if (confirm) {
                            const ok = await alertDialog.showConfirm(interpolate(String(confirm.body || 'Are you sure?')), {
                                title: interpolate(String(confirm.title || 'Confirm')),
                                variant: coerceAlertVariant(confirm.variant),
                            });
                            if (!ok)
                                return;
                        }
                        try {
                            await handler({ entityKey, record });
                        }
                        catch (e) {
                            const msg = e instanceof Error ? e.message : 'Action failed';
                            await alertDialog.showAlert(String(msg), { title: 'Action Failed', variant: 'error' });
                        }
                    }, children: [icon === 'download' ? _jsx(Download, { size: 16, className: "mr-1" }) : null, label] }, actionKey));
                continue;
            }
        }
        return nodes.length > 0 ? _jsx(_Fragment, { children: nodes }) : null;
    };
    return (_jsxs(Page, { title: pageTitle, breadcrumbs: breadcrumbs, onNavigate: navigate, actions: _jsxs("div", { className: "flex items-center gap-2", children: [renderHeaderActions ? renderHeaderActions({ record, resolved, navigate, uiSpec, ui: { Button } }) : renderSpecHeaderActions(), _jsx(Button, { variant: "primary", onClick: () => navigate(editHref(String(record.id))), children: editLabel }), deleteItem ? (_jsxs(Button, { variant: "danger", onClick: () => setShowDeleteConfirm(true), disabled: isDeleting, children: [_jsx(Trash2, { size: 16, className: "mr-2" }), deleteLabel] })) : null] }), children: [renderBody ? renderBody({ record, resolved, navigate, uiSpec }) : _jsx(EntityDetailBody, { entityKey: entityKey, uiSpec: uiSpec, record: record, navigate: navigate }), showDeleteConfirm && deleteItem && (_jsx(Modal, { open: true, onClose: () => setShowDeleteConfirm(false), title: deleteConfirmTitle, children: _jsxs("div", { style: { padding: '16px' }, children: [_jsx("p", { style: { marginBottom: '16px' }, children: deleteConfirmBodyTpl.replace('{name}', String(record?.name || record?.id || '')) }), _jsxs("div", { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "secondary", onClick: () => setShowDeleteConfirm(false), disabled: isDeleting, children: cancelLabel }), _jsx(Button, { variant: "danger", onClick: handleDelete, disabled: isDeleting, children: isDeleting ? 'Deleting...' : deleteLabel })] })] }) })), _jsx(AlertDialog, { ...alertDialog.props })] }));
}
//# sourceMappingURL=EntityDetailPage.js.map
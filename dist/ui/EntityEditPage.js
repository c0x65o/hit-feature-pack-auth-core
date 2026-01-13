'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useUi } from '@hit/ui-kit';
import { useEntityUiSpec } from './useHitUiSpecs';
export function EntityEditPage({ entityKey, id, onNavigate, loading, submitting, error, clearError, onSubmit, children, }) {
    const { Page, Card, Button, Spinner, Alert } = useUi();
    const uiSpec = useEntityUiSpec(entityKey);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    if (!uiSpec)
        return _jsx(Spinner, {});
    const meta = uiSpec?.meta || {};
    const routes = meta?.routes || {};
    const actionsMeta = meta?.actions || {};
    const titleSingular = String(meta.titleSingular || entityKey);
    const listHref = String(routes.list || '/');
    const detailHref = (rid) => String(routes.detail || '/{id}').replace('{id}', encodeURIComponent(rid));
    const breadcrumbsBase = Array.isArray(meta?.breadcrumbs)
        ? meta.breadcrumbs
            .filter((b) => b && typeof b === 'object' && b.label && b.href)
            .map((b) => ({ label: String(b.label), href: String(b.href) }))
        : [];
    const breadcrumbs = useMemo(() => {
        return [...breadcrumbsBase, { label: id ? `Edit ${titleSingular}` : `New ${titleSingular}` }];
    }, [breadcrumbsBase, id, titleSingular]);
    const cancelLabel = String(actionsMeta.cancelLabel || 'Cancel');
    const saveCreateLabel = String(actionsMeta.saveCreateLabel || `Create ${titleSingular}`);
    const saveUpdateLabel = String(actionsMeta.saveUpdateLabel || `Update ${titleSingular}`);
    const pageTitle = id ? `Edit ${titleSingular}` : `New ${titleSingular}`;
    if (loading)
        return _jsx(Spinner, {});
    const onCancel = () => navigate(id ? detailHref(id) : listHref);
    return (_jsxs(Page, { title: pageTitle, breadcrumbs: breadcrumbs, onNavigate: navigate, children: [error ? (_jsx(Alert, { variant: "error", title: "Error", onClose: clearError, children: String(error.message || 'Something went wrong') })) : null, _jsx(Card, { children: _jsxs("form", { onSubmit: onSubmit, className: "space-y-6", children: [children, _jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-800", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onCancel, disabled: Boolean(submitting), children: cancelLabel }), _jsx(Button, { type: "submit", variant: "primary", disabled: Boolean(submitting), children: submitting ? 'Saving...' : id ? saveUpdateLabel : saveCreateLabel })] })] }) })] }));
}
//# sourceMappingURL=EntityEditPage.js.map
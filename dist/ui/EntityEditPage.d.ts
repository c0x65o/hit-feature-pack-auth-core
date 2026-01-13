import React from 'react';
export declare function EntityEditPage({ entityKey, id, onNavigate, loading, submitting, error, clearError, onSubmit, children, }: {
    entityKey: string;
    id?: string;
    onNavigate?: (path: string) => void;
    loading?: boolean;
    submitting?: boolean;
    error?: {
        message?: string;
    } | null;
    clearError?: () => void;
    onSubmit: (e: React.FormEvent) => void;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EntityEditPage.d.ts.map
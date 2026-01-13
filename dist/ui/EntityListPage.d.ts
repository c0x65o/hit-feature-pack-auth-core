import React from 'react';
import { type DataTableColumn } from '@hit/ui-kit';
type ListQueryArgs = {
    page: number;
    pageSize: number;
    search?: string;
    filters?: any[];
    filterMode?: 'all' | 'any';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};
export declare function EntityListPage({ entityKey, onNavigate, useListData, customRenderers, renderRowActions, emptyMessage, }: {
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
        onRequestDelete: (args: {
            id: string;
            name: string;
        }) => void;
        ui: {
            Button: any;
        };
    }) => React.ReactNode;
    emptyMessage?: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EntityListPage.d.ts.map
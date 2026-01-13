import React from 'react';
import type { DataTableColumn } from '@hit/ui-kit';
export type ListQueryArgs = {
    page: number;
    pageSize: number;
    search?: string;
    filters?: any[];
    filterMode?: 'all' | 'any';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};
export type EntityListResult = {
    data: any;
    loading: boolean;
    refetch: () => Promise<any> | void;
    deleteItem?: (id: string) => Promise<any>;
};
export type EntityDetailResult = {
    record: any;
    loading: boolean;
    deleteItem?: (id: string) => Promise<any>;
};
export type EntityUpsertResult = {
    record: any;
    loading: boolean;
    create: (payload: any) => Promise<any>;
    update: (id: string, payload: any) => Promise<any>;
};
export type EntityFormRegistries = {
    optionSources: Record<string, any>;
    referenceRenderers: Record<string, any>;
    myOrgScope?: any;
    loading?: Record<string, boolean>;
};
export type EntityDataSource = {
    useList?: (args: ListQueryArgs) => EntityListResult;
    useDetail?: (args: {
        id: string;
    }) => EntityDetailResult;
    useUpsert?: (args: {
        id?: string;
    }) => EntityUpsertResult;
    useFormRegistries?: () => EntityFormRegistries;
    useListCustomRenderers?: () => Record<string, DataTableColumn['render']>;
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
};
export declare function useEntityDataSource(entityKey: string): EntityDataSource | null;
//# sourceMappingURL=entityDataSources.d.ts.map
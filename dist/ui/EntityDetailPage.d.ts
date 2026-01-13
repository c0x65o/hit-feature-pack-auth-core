import React from 'react';
export declare function EntityDetailPage({ entityKey, id, onNavigate, useDetailData, resolve, renderHeaderActions, renderBody, }: {
    entityKey: string;
    id: string;
    onNavigate?: (path: string) => void;
    useDetailData?: (args: {
        id: string;
    }) => {
        record: any;
        loading: boolean;
        deleteItem?: (id: string) => Promise<any>;
    };
    resolve?: (args: {
        record: any;
    }) => any;
    renderHeaderActions?: (args: {
        record: any;
        resolved: any;
        navigate: (path: string) => void;
        uiSpec: any;
        ui: {
            Button: any;
        };
    }) => React.ReactNode;
    renderBody?: (args: {
        record: any;
        resolved: any;
        navigate: (path: string) => void;
        uiSpec: any;
    }) => React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EntityDetailPage.d.ts.map
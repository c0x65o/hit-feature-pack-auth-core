export type EntityActionHandlerArgs = {
    entityKey: string;
    record: any;
    resolved?: Record<string, any>;
    relations?: Record<string, any[]>;
};
export type EntityActionHandler = (args: EntityActionHandlerArgs) => void | Promise<void>;
export declare function getEntityActionHandler(handlerId: string): EntityActionHandler | undefined;
//# sourceMappingURL=entityActions.d.ts.map
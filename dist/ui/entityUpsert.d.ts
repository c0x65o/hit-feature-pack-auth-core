export type PrepareEntityUpsertArgs = {
    uiSpec: any;
    values: Record<string, string>;
    relations: Record<string, any[]>;
};
export type PrepareEntityUpsertResult = {
    fieldErrors: Record<string, string>;
    payload: Record<string, any> | null;
    normalizedRelations: Record<string, any[]>;
};
export declare function prepareEntityUpsert({ uiSpec, values }: PrepareEntityUpsertArgs): PrepareEntityUpsertResult;
//# sourceMappingURL=entityUpsert.d.ts.map
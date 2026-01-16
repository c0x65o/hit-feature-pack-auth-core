import { type ScopeMode } from './scope-mode';
export type EntityAuthzOp = 'list' | 'detail' | 'new' | 'edit' | 'delete';
type RequireEntityAuthzArgs = {
    entityKey: string;
    op: EntityAuthzOp;
    supportedModes?: ScopeMode[];
    fallbackMode?: ScopeMode;
    logPrefix?: string;
};
export type EntityAuthzResult = {
    mode: ScopeMode;
};
export declare function requireEntityAuthz(request: Request, args: RequireEntityAuthzArgs): Promise<EntityAuthzResult | Response>;
export {};
//# sourceMappingURL=schema-authz.d.ts.map
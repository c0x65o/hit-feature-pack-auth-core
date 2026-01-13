export declare function useApplySchemaDefaults(args: {
    uiSpec: any;
    values: Record<string, string>;
    setValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
    appliedDefaultsRef: React.MutableRefObject<Set<string>>;
    searchParams: {
        get: (k: string) => string | null;
    } | null | undefined;
    optionSources: Record<string, {
        options: any[];
        loading?: boolean;
    } | undefined>;
    myOrgScope: any;
    loading: {
        myOrgScope?: boolean;
    };
}): void;
//# sourceMappingURL=useApplySchemaDefaults.d.ts.map
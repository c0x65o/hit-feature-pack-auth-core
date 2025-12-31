/**
 * Build-time generated routes (stub for feature-pack builds).
 *
 * In host apps (e.g. hit-dashboard), this module is generated to expose feature-pack routes.
 * When building the feature pack standalone, that generated file is not present — but the
 * Permissions admin page loads it client-side behind a try/catch.
 *
 * This stub keeps `tsc` happy and makes the client-side import resolve to an empty set.
 */
export type GeneratedRoute = {
    path: string;
    packName?: string;
    componentName?: string;
    shell?: boolean;
};
export declare const featurePackRoutes: GeneratedRoute[];
export declare const authRoutes: string[];
//# sourceMappingURL=routes.d.ts.map
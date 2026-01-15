/**
 * Build-time generated routes registry (stub for feature-pack builds).
 *
 * Host apps can generate this module to expose feature-pack route metadata.
 * When building the feature pack standalone, that generated file is not present.
 *
 * This stub keeps `tsc` happy and makes the client-side import resolve to an empty set.
 */

export type GeneratedRouteMeta = {
  path: string;
  packName?: string;
  roles?: string[];
  defaultRolesAllow?: string[];
  authz?: {
    entity?: string;
    verb?: 'read' | 'write' | 'delete';
    require_mode?: string;
    require_create?: boolean;
    require_action?: string;
  };
};

export const featurePackRoutes: GeneratedRouteMeta[] = [];


/**
 * Build-time generated action registry (stub for feature-pack builds).
 *
 * Host apps can generate this module to expose feature-pack action definitions.
 * When building the feature pack standalone, that generated file is not present.
 *
 * This stub keeps `tsc` happy and makes the client-side import resolve to an empty set.
 */

export type GeneratedAction = {
  key: string;
  packName?: string;
  label?: string;
  description?: string;
  defaultEnabled?: boolean;
};

export const featurePackActions: GeneratedAction[] = [];


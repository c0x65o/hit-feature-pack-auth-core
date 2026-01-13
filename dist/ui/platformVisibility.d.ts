export type HitPlatform = 'web' | 'mobile';
export declare function getHitPlatform(): HitPlatform;
/**
 * Recursively filters an entity UI spec object by platform.
 * Any object/array element may specify:
 * - `platforms: [web|mobile]` or
 * - `visibility: { platforms: [...] }`
 *
 * Default: visible on all platforms.
 */
export declare function filterUiSpecByPlatform<T = any>(spec: T, platform: HitPlatform): T;
//# sourceMappingURL=platformVisibility.d.ts.map
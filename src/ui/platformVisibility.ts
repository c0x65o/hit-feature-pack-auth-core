'use client';

export type HitPlatform = 'web' | 'mobile';

export function getHitPlatform(): HitPlatform {
  try {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
    const raw =
      (typeof process !== 'undefined' && (process as any)?.env?.NEXT_PUBLIC_HIT_PLATFORM) ||
      g.__HIT_PLATFORM__ ||
      g.HIT_PLATFORM;
    const v = String(raw || '').trim().toLowerCase();
    return v === 'mobile' ? 'mobile' : 'web';
  } catch {
    return 'web';
  }
}

function getPlatformsFlag(node: any): string[] | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray((node as any).platforms)) return (node as any).platforms;
  const vis = (node as any).visibility;
  if (vis && typeof vis === 'object' && Array.isArray((vis as any).platforms)) return (vis as any).platforms;
  return null;
}

function isVisibleOnPlatform(node: any, platform: HitPlatform): boolean {
  const ps = getPlatformsFlag(node);
  if (!ps) return true;
  const norm = ps.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
  if (norm.length === 0) return true;
  return norm.includes(platform);
}

/**
 * Recursively filters an entity UI spec object by platform.
 * Any object/array element may specify:
 * - `platforms: [web|mobile]` or
 * - `visibility: { platforms: [...] }`
 *
 * Default: visible on all platforms.
 */
export function filterUiSpecByPlatform<T = any>(spec: T, platform: HitPlatform): T {
  const walk = (node: any): any => {
    if (node == null) return node;
    if (Array.isArray(node)) {
      return node.map(walk).filter((x) => x !== undefined);
    }
    if (typeof node !== 'object') return node;
    if (!isVisibleOnPlatform(node, platform)) return undefined;

    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      const next = walk(v);
      if (next !== undefined) out[k] = next;
    }
    return out;
  };
  return walk(spec) as T;
}


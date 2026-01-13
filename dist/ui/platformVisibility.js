'use client';
export function getHitPlatform() {
    try {
        const g = typeof globalThis !== 'undefined' ? globalThis : {};
        const raw = (typeof process !== 'undefined' && process?.env?.NEXT_PUBLIC_HIT_PLATFORM) ||
            g.__HIT_PLATFORM__ ||
            g.HIT_PLATFORM;
        const v = String(raw || '').trim().toLowerCase();
        return v === 'mobile' ? 'mobile' : 'web';
    }
    catch {
        return 'web';
    }
}
function getPlatformsFlag(node) {
    if (!node || typeof node !== 'object')
        return null;
    if (Array.isArray(node.platforms))
        return node.platforms;
    const vis = node.visibility;
    if (vis && typeof vis === 'object' && Array.isArray(vis.platforms))
        return vis.platforms;
    return null;
}
function isVisibleOnPlatform(node, platform) {
    const ps = getPlatformsFlag(node);
    if (!ps)
        return true;
    const norm = ps.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
    if (norm.length === 0)
        return true;
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
export function filterUiSpecByPlatform(spec, platform) {
    const walk = (node) => {
        if (node == null)
            return node;
        if (Array.isArray(node)) {
            return node.map(walk).filter((x) => x !== undefined);
        }
        if (typeof node !== 'object')
            return node;
        if (!isVisibleOnPlatform(node, platform))
            return undefined;
        const out = {};
        for (const [k, v] of Object.entries(node)) {
            const next = walk(v);
            if (next !== undefined)
                out[k] = next;
        }
        return out;
    };
    return walk(spec);
}
//# sourceMappingURL=platformVisibility.js.map
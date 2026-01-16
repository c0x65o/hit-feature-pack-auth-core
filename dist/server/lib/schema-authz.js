import { requireActionPermission } from './action-check';
import { resolveScopeMode } from './scope-mode';
import fs from 'node:fs';
import path from 'node:path';
function json(data, init) {
    return new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: {
            'content-type': 'application/json; charset=utf-8',
        },
    });
}
function deny(message = 'Not authorized') {
    return json({ error: message }, { status: 403 });
}
function serverError(message) {
    return json({ error: message }, { status: 500 });
}
let _cachedSpecs = null;
function loadHitUiSpecs() {
    if (_cachedSpecs)
        return _cachedSpecs;
    // Prefer explicit path override (useful in tests / non-Next hosts).
    const override = String(process.env.HIT_UI_SPECS_PATH || '').trim();
    const candidates = [
        override || null,
        path.join(process.cwd(), 'public', 'hit-ui-specs.json'),
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            const raw = fs.readFileSync(p, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                _cachedSpecs = parsed;
                return _cachedSpecs;
            }
        }
        catch {
            // keep trying candidates
        }
    }
    return null;
}
function getEntitySpec(entityKey) {
    const specsRoot = loadHitUiSpecs();
    const specs = specsRoot?.entities;
    if (!specs || typeof specs !== 'object')
        return null;
    const spec = specs[entityKey];
    return spec && typeof spec === 'object' ? spec : null;
}
export async function requireEntityAuthz(request, args) {
    const entityKey = String(args.entityKey || '').trim();
    const op = args.op;
    if (!entityKey)
        return serverError('Missing entityKey');
    const spec = getEntitySpec(entityKey);
    if (!spec)
        return serverError(`Unknown entityKey: ${entityKey}`);
    const security = spec.security;
    if (!security || typeof security !== 'object') {
        return serverError(`Missing security block for entity: ${entityKey}`);
    }
    const block = security[op];
    if (!block || typeof block !== 'object') {
        return serverError(`Missing security.${op} for entity: ${entityKey}`);
    }
    const authz = block.authz;
    if (!authz || typeof authz !== 'object') {
        return serverError(`Missing security.${op}.authz for entity: ${entityKey}`);
    }
    const packName = entityKey.includes('.') ? entityKey.split('.', 1)[0] : '';
    const entity = String(authz.entity || '').trim();
    const verb = String(authz.verb || '').trim().toLowerCase();
    if (!packName || !entity || (verb !== 'read' && verb !== 'write' && verb !== 'delete')) {
        return serverError(`Invalid authz metadata for ${entityKey} (${op})`);
    }
    const logPrefix = String(args.logPrefix || 'SchemaAuthz').trim() || 'SchemaAuthz';
    const requireAction = String(authz.require_action || '').trim();
    if (requireAction) {
        const denied = await requireActionPermission(request, requireAction, { logPrefix });
        if (denied)
            return denied;
    }
    const mode = await resolveScopeMode(request, {
        pack: packName,
        verb,
        entity,
        supportedModes: args.supportedModes,
        fallbackMode: args.fallbackMode,
        logPrefix,
    });
    if (mode === 'none')
        return deny();
    const requireModeAny = String(authz.require_mode || '').trim().toLowerCase() === 'any';
    if (requireModeAny && mode !== 'all')
        return deny();
    if (authz.require_create) {
        const createKey = `${packName}.${entity}.create`;
        const denied = await requireActionPermission(request, createKey, { logPrefix });
        if (denied)
            return denied;
    }
    return { mode };
}
//# sourceMappingURL=schema-authz.js.map
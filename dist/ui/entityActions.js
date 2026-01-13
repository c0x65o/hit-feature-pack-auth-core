'use client';
// Keep this registry lightweight; auth-core actions will be added here as we
// expand schema-driven headerActions (lock/unlock, reset password, etc.).
const handlers = {};
export function getEntityActionHandler(handlerId) {
    return handlers[handlerId];
}
//# sourceMappingURL=entityActions.js.map
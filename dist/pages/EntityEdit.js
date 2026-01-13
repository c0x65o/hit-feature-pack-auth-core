'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { EntityUpsertPage } from '../ui/EntityUpsertPage';
export function EntityEdit({ entityKey, id, email, onNavigate, }) {
    const effectiveId = id || email;
    if (!entityKey)
        return _jsx("div", { style: { padding: 16 }, children: "Missing required prop: entityKey" });
    return _jsx(EntityUpsertPage, { entityKey: entityKey, id: effectiveId, onNavigate: onNavigate });
}
export default EntityEdit;
//# sourceMappingURL=EntityEdit.js.map
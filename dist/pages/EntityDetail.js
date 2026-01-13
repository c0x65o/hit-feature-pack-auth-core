'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { EntityDetailPage } from '../ui/EntityDetailPage';
export function EntityDetail({ entityKey, id, email, onNavigate, }) {
    const effectiveId = id || email || '';
    if (!entityKey)
        return _jsx("div", { style: { padding: 16 }, children: "Missing required prop: entityKey" });
    if (!effectiveId)
        return _jsx("div", { style: { padding: 16 }, children: "Missing required prop: id" });
    return _jsx(EntityDetailPage, { entityKey: entityKey, id: effectiveId, onNavigate: onNavigate });
}
export default EntityDetail;
//# sourceMappingURL=EntityDetail.js.map
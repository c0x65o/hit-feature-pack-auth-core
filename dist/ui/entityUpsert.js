function asRecord(v) {
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
}
function str(v) {
    return v == null ? '' : String(v);
}
function trimOrEmpty(v) {
    return str(v).trim();
}
function bool(v) {
    return v === true || v === 'true';
}
function collectScalarFieldKeysFromForm(uiSpec) {
    const form = asRecord(uiSpec?.form) || {};
    const sections = Array.isArray(form.sections) ? form.sections : [];
    const out = [];
    for (const s of sections) {
        const sec = asRecord(s);
        if (!sec)
            continue;
        if (str(sec.widget) === 'relationEditor')
            continue;
        const fields = Array.isArray(sec.fields) ? sec.fields : [];
        for (const f of fields) {
            const k = trimOrEmpty(f);
            if (!k)
                continue;
            out.push(k);
        }
    }
    return Array.from(new Set(out));
}
export function prepareEntityUpsert({ uiSpec, values }) {
    const fieldErrors = {};
    const fieldsMap = asRecord(uiSpec?.fields) || {};
    const scalarKeys = collectScalarFieldKeysFromForm(uiSpec);
    for (const key of scalarKeys) {
        const spec = asRecord(fieldsMap[key]) || {};
        if (bool(spec.required)) {
            const v = trimOrEmpty(values?.[key]);
            if (!v)
                fieldErrors[key] = `${str(spec.label || key)} is required`;
        }
    }
    if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors, payload: null, normalizedRelations: {} };
    }
    const payload = {};
    for (const key of scalarKeys) {
        const v = trimOrEmpty(values?.[key]);
        payload[key] = v || null;
    }
    return { fieldErrors: {}, payload, normalizedRelations: {} };
}
//# sourceMappingURL=entityUpsert.js.map
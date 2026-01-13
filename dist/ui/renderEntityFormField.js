'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export function renderEntityFormField({ keyName, fieldSpec, value, setValue, clearFieldError, error, required, ui, optionSources, referenceRenderers, }) {
    const spec = fieldSpec && typeof fieldSpec === 'object' ? fieldSpec : {};
    const type = String(spec.type || 'text');
    const label = String(spec.label || keyName);
    const placeholder = typeof spec.placeholder === 'string' ? String(spec.placeholder) : undefined;
    if (type === 'select') {
        const src = typeof spec.optionSource === 'string' ? String(spec.optionSource) : '';
        const cfg = src && optionSources[src] ? optionSources[src] : undefined;
        const options = cfg?.options || [{ value: '', label: 'Select…' }];
        return (_jsx(ui.Select, { label: label, value: value, onChange: (v) => {
                setValue(String(v));
                clearFieldError(keyName);
            }, options: options, placeholder: placeholder || cfg?.placeholder, disabled: Boolean(cfg?.loading), error: error, required: Boolean(required) }, keyName));
    }
    if (type === 'reference') {
        const entityType = String(spec?.reference?.entityType || '');
        const renderer = entityType ? referenceRenderers[entityType] : undefined;
        if (renderer) {
            return (_jsx(React.Fragment, { children: renderer({
                    keyName,
                    label,
                    value,
                    setValue: (v) => {
                        setValue(v);
                        clearFieldError(keyName);
                    },
                    placeholder,
                    ui: { Autocomplete: ui.Autocomplete },
                }) }, keyName));
        }
        return (_jsx(ui.Input, { label: label, value: value, onChange: (v) => {
                setValue(v);
                clearFieldError(keyName);
            }, placeholder: placeholder, error: error, required: Boolean(required) }, keyName));
    }
    const inputType = type === 'email' ? 'email' : type === 'password' ? 'password' : 'text';
    return (_jsx(ui.Input, { label: label, type: inputType, value: value, onChange: (v) => {
            setValue(v);
            clearFieldError(keyName);
        }, placeholder: placeholder, error: error, required: Boolean(required) }, keyName));
}
//# sourceMappingURL=renderEntityFormField.js.map
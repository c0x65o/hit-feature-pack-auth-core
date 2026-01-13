'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
export function renderEntityFormField({ keyName, fieldSpec, value, setValue, clearFieldError, error, required, ui, optionSources, referenceRenderers, }) {
    const spec = fieldSpec && typeof fieldSpec === 'object' ? fieldSpec : {};
    const type = String(spec.type || 'text').trim().toLowerCase();
    const label = String(spec.label || keyName);
    const placeholder = typeof spec.placeholder === 'string' ? String(spec.placeholder) : undefined;
    if (type === 'select') {
        const src = typeof spec.optionSource === 'string' ? String(spec.optionSource) : '';
        const cfg = (src && optionSources[src]) ? optionSources[src] : undefined;
        const inline = Array.isArray(spec.options) ? spec.options : null;
        const options = (inline && inline.length > 0) ? inline : (cfg?.options || [{ value: '', label: 'Select…' }]);
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
    if (type === 'textarea' && ui.TextArea) {
        return (_jsx(ui.TextArea, { label: label, value: value, onChange: (v) => {
                setValue(v);
                clearFieldError(keyName);
            }, placeholder: placeholder, error: error, required: Boolean(required) }, keyName));
    }
    if (type === 'boolean' && ui.Checkbox) {
        const checked = value === 'true' || value === '1' || value.toLowerCase?.() === 'true';
        return (_jsx(ui.Checkbox, { label: label, checked: Boolean(checked), onChange: (v) => {
                setValue(v ? 'true' : 'false');
                clearFieldError(keyName);
            }, disabled: false }, keyName));
    }
    const inputType = type === 'email'
        ? 'email'
        : type === 'secret' || type === 'password'
            ? 'password'
            : type === 'phone'
                ? 'tel'
                : type === 'number'
                    ? 'number'
                    : type === 'date'
                        ? 'date'
                        : type === 'datetime'
                            ? 'datetime-local'
                            : 'text';
    const inputValue = inputType === 'datetime-local' && typeof value === 'string' && value.includes('T')
        ? value.slice(0, 16)
        : value;
    return (_jsx(ui.Input, { label: label, type: inputType, value: inputValue, onChange: (v) => {
            setValue(v);
            clearFieldError(keyName);
        }, placeholder: placeholder, error: error, required: Boolean(required) }, keyName));
}
//# sourceMappingURL=renderEntityFormField.js.map
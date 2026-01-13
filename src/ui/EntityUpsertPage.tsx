'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUi } from '@hit/ui-kit';
import { useFormSubmit } from '@hit/ui-kit/hooks/useFormSubmit';
import { EntityEditPage } from './EntityEditPage';
import { useEntityUiSpec } from './useHitUiSpecs';
import { useEntityDataSource } from './entityDataSources';
import { renderEntityFormField } from './renderEntityFormField';
import { prepareEntityUpsert } from './entityUpsert';
import { useApplySchemaDefaults } from './useApplySchemaDefaults';

function asRecord(v: unknown): Record<string, any> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null;
}

function trim(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function collectFormScalarKeys(uiSpec: any): string[] {
  const form = asRecord(uiSpec?.form) || {};
  const sections = Array.isArray(form.sections) ? form.sections : [];
  const out: string[] = [];
  for (const sAny of sections) {
    const s = asRecord(sAny);
    if (!s) continue;
    const fields = Array.isArray(s.fields) ? s.fields : [];
    for (const f of fields) {
      const k = trim(f);
      if (k) out.push(k);
    }
  }
  return Array.from(new Set(out));
}

export function EntityUpsertPage({
  entityKey,
  id,
  onNavigate,
}: {
  entityKey: string;
  id?: string;
  onNavigate?: (path: string) => void;
}) {
  const recordId = id === 'new' ? undefined : id;
  const uiSpec = useEntityUiSpec(entityKey);
  const ds = useEntityDataSource(entityKey);

  const { Input, Select, Autocomplete, TextArea, Checkbox } = useUi();
  const searchParams = useSearchParams();
  const appliedDefaultsRef = useRef<Set<string>>(new Set());

  const { submitting, error, fieldErrors, submit, clearError, setFieldErrors, clearFieldError } = useFormSubmit();

  const upsert = ds?.useUpsert ? ds.useUpsert({ id: recordId }) : null;
  const registries = ds?.useFormRegistries ? ds.useFormRegistries() : null;

  const [values, setValues] = useState<Record<string, string>>({});

  const fieldsMap = asRecord((uiSpec as any)?.fields) || {};
  const scalarKeys = useMemo(() => collectFormScalarKeys(uiSpec), [uiSpec]);

  const isRequired = (k: string) => Boolean(asRecord(fieldsMap?.[k])?.required);

  useApplySchemaDefaults({
    uiSpec,
    values,
    setValues,
    appliedDefaultsRef,
    searchParams: searchParams as any,
    optionSources: (registries?.optionSources || {}) as any,
    myOrgScope: registries?.myOrgScope,
    loading: { myOrgScope: Boolean(registries?.loading?.myOrgScope) },
  });

  useEffect(() => {
    if (!recordId) return;
    const rec = upsert?.record;
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return;

    const next: Record<string, string> = {};
    for (const k of scalarKeys) {
      const v = (rec as any)?.[k];
      next[k] = v == null ? '' : String(v);
    }
    setValues((prev) => ({ ...(prev || {}), ...next }));
  }, [recordId, upsert?.record, scalarKeys]);

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const detailHrefForId = (rid: string) => {
    const routes = (uiSpec as any)?.meta?.routes || {};
    const tpl = String(routes.detail || `/${entityKey}/{id}`);
    return tpl.replace('{id}', encodeURIComponent(rid));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uiSpec || !upsert) return;

    const prepared = prepareEntityUpsert({
      uiSpec,
      values,
      relations: {},
    });

    if (prepared.payload == null) {
      setFieldErrors(prepared.fieldErrors || {});
      return;
    }

    const result = await submit(async () => {
      if (recordId) {
        await upsert.update(recordId, prepared.payload);
        return { id: recordId };
      }
      const created = await upsert.create(prepared.payload);
      const newId = created?.id ? String(created.id) : '';
      if (!newId) throw new Error('Created but no ID returned. Please refresh.');
      return { id: newId };
    });

    if (result && typeof result === 'object' && (result as any).id) {
      navigate(detailHrefForId(String((result as any).id)));
    }
  };

  if (!uiSpec) return null;
  if (!ds || !upsert || !registries) {
    return (
      <div style={{ padding: 16 }}>
        Missing data source registries for `{entityKey}`. Add `useUpsert` + `useFormRegistries` in `entityDataSources.tsx`.
      </div>
    );
  }

  const gridClass = (cols: number) => {
    if (cols === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-4';
    if (cols === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    return 'grid grid-cols-1 gap-4';
  };

  const formCfg = asRecord((uiSpec as any)?.form) || {};
  const sections = Array.isArray(formCfg.sections) ? formCfg.sections : [];

  return (
    <EntityEditPage
      entityKey={entityKey}
      id={recordId}
      onNavigate={onNavigate}
      loading={Boolean(upsert.loading && recordId)}
      submitting={submitting}
      error={error as any}
      clearError={clearError}
      onSubmit={handleSubmit}
    >
      {sections.map((sAny, idx) => {
        const s = asRecord(sAny) || {};
        const title = s.title ? String(s.title) : '';
        const layoutCols = Number(asRecord(s.layout)?.columns || 1);
        const fields = Array.isArray(s.fields) ? s.fields.map(String).map((x) => x.trim()).filter(Boolean) : [];
        if (fields.length === 0) return null;

        return (
          <div
            key={`sec-${idx}`}
            className={idx === 0 ? '' : 'border-t pt-6 mt-6'}
            style={idx === 0 ? undefined : { borderColor: 'var(--hit-border, #1f2937)' }}
          >
            {title ? <h3 className="text-lg font-semibold mb-4">{title}</h3> : null}
            <div className={gridClass(layoutCols || 1)}>
              {fields.map((k) =>
                renderEntityFormField({
                  keyName: k,
                  fieldSpec: fieldsMap?.[k] || {},
                  value: typeof values?.[k] === 'string' ? values[k] : '',
                  setValue: (v) => setValues((prev) => ({ ...(prev || {}), [k]: v })),
                  clearFieldError,
                  error: (fieldErrors as any)?.[k],
                  required: isRequired(k),
                  ui: { Input, Select, Autocomplete, TextArea, Checkbox },
                  optionSources: registries.optionSources || {},
                  referenceRenderers: registries.referenceRenderers || {},
                })
              )}
            </div>
          </div>
        );
      })}
    </EntityEditPage>
  );
}


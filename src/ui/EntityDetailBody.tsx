'use client';

import React from 'react';
import { Mail } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { splitLinkedEntityTabsExtra, wrapWithLinkedEntityTabsIfConfigured } from '@hit/feature-pack-form-core';

function asRecord(v: unknown): Record<string, any> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null;
}

function formatLocalDateTime(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function DetailField({ uiSpec, record, fieldKey }: { uiSpec: any; record: any; fieldKey: string }) {
  const fieldsMap = asRecord(uiSpec?.fields) || {};
  const spec = asRecord(fieldsMap[fieldKey]) || {};
  const type = String(spec.type || 'text');
  const label = String(spec.label || fieldKey);
  const raw = (record as any)?.[fieldKey];

  if (type === 'email') {
    if (!raw) return null;
    return (
      <div key={fieldKey}>
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <a href={`mailto:${String(raw)}`} className="text-blue-400 hover:underline flex items-center gap-1">
          <Mail size={14} />
          {String(raw)}
        </a>
      </div>
    );
  }

  if (type === 'datetime' || type === 'date') {
    const formatted = formatLocalDateTime(raw);
    if (!formatted) return null;
    return (
      <div key={fieldKey}>
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <div>{formatted}</div>
      </div>
    );
  }

  if (raw == null || raw === '') return null;
  return (
    <div key={fieldKey}>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div>{String(raw)}</div>
    </div>
  );
}

export type EntityDetailBodyProps = {
  entityKey: string;
  uiSpec: any;
  record: any;
  navigate?: (path: string) => void;
};

export function EntityDetailBody({
  entityKey,
  uiSpec,
  record,
  navigate,
}: EntityDetailBodyProps): React.ReactNode {
  const { Card } = useUi();
  const detail = asRecord(uiSpec?.detail) || {};
  const { linkedEntityTabs } = splitLinkedEntityTabsExtra((detail as any).extras);
  const summaryFieldsAny = detail.summaryFields;
  const summaryFields: string[] = Array.isArray(summaryFieldsAny)
    ? summaryFieldsAny.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const fieldsMap = asRecord(uiSpec?.fields) || {};
  const fallback = Object.keys(fieldsMap).filter((k) => k && k !== 'id').slice(0, 8);
  const keysToRender = summaryFields.length ? summaryFields : fallback;

  const inner = (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keysToRender.map((k) => (
          <DetailField key={k} uiSpec={uiSpec} record={record} fieldKey={k} />
        ))}
      </div>
      {!keysToRender.length ? (
        <div className="text-sm text-gray-500">No detail fields configured for {entityKey}.</div>
      ) : null}
    </Card>
  );

  return wrapWithLinkedEntityTabsIfConfigured({
    linkedEntityTabs,
    entityKey,
    record,
    navigate,
    overview: inner,
  });
}


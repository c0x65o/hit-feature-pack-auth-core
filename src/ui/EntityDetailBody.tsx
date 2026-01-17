'use client';

import React from 'react';
import { Mail } from 'lucide-react';
import { useUi, useEntityResolver } from '@hit/ui-kit';
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

function formatDuration(value: unknown, unit?: string): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const ms = unit === 's' ? n * 1000 : n;
  if (ms === 0) return '0s';
  const absMs = Math.abs(ms);
  const sign = ms < 0 ? '-' : '';
  const units = [
    { label: 'd', ms: 86400000 },
    { label: 'h', ms: 3600000 },
    { label: 'm', ms: 60000 },
    { label: 's', ms: 1000 },
    { label: 'ms', ms: 1 },
  ];
  const parts: string[] = [];
  let remaining = absMs;
  for (const u of units) {
    if (remaining >= u.ms) {
      const count = Math.floor(remaining / u.ms);
      remaining = remaining % u.ms;
      parts.push(`${count}${u.label}`);
      if (parts.length >= 2) break;
    }
  }
  return parts.length > 0 ? sign + parts.join(' ') : '0s';
}

function DetailField({ uiSpec, record, fieldKey }: { uiSpec: any; record: any; fieldKey: string }) {
  const resolver = useEntityResolver();
  const fieldsMap = asRecord(uiSpec?.fields) || {};
  const spec = asRecord(fieldsMap[fieldKey]) || {};
  const type = String(spec.type || 'text');
  const label = String(spec.label || fieldKey);
  const raw = (record as any)?.[fieldKey];

  if (type === 'reference') {
    const ref = asRecord(spec.reference) || {};
    const entityType = String(ref.entityType || '').trim();
    const id = raw == null ? '' : String(raw).trim();
    if (!entityType || !id) return null;
    const text = resolver.getLabel(entityType, id) || id;
    return (
      <div key={fieldKey}>
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <div>{text}</div>
      </div>
    );
  }

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

  if (type === 'boolean') {
    return (
      <div key={fieldKey}>
        <div className="text-sm text-gray-400 mb-1">{label}</div>
        <div>{raw ? 'Yes' : 'No'}</div>
      </div>
    );
  }

  if (type === 'duration') {
    const formatted = formatDuration(raw, spec.unit);
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


'use client';

import { useEffect } from 'react';

function asRecord(v: unknown): Record<string, any> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as any) : null;
}

function trim(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function firstMeaningfulOptionValue(options: any[] | undefined): string | null {
  const arr = Array.isArray(options) ? options : [];
  for (const o of arr) {
    const rec = asRecord(o) || {};
    const value = trim(rec.value);
    if (value) return value;
  }
  return null;
}

export function useApplySchemaDefaults(args: {
  uiSpec: any;
  values: Record<string, string>;
  setValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  appliedDefaultsRef: React.MutableRefObject<Set<string>>;
  searchParams: { get: (k: string) => string | null } | null | undefined;
  optionSources: Record<string, { options: any[]; loading?: boolean } | undefined>;
  myOrgScope: any;
  loading: {
    myOrgScope?: boolean;
  };
}) {
  const { uiSpec, values, setValues, appliedDefaultsRef, searchParams, optionSources, myOrgScope, loading } = args;

  useEffect(() => {
    if (!uiSpec) return;

    const fieldsMap = asRecord(uiSpec?.fields) || {};
    const keys = Object.keys(fieldsMap);
    if (keys.length === 0) return;

    const queryParamValue = (param: string): string | null => {
      const v = searchParams?.get(param);
      const t = trim(v);
      return t ? t : null;
    };

    const optionSourceFirstValue = (source: string): string | null => {
      const cfg = source ? optionSources?.[source] : undefined;
      if (!cfg || cfg.loading) return null;
      return firstMeaningfulOptionValue(cfg.options);
    };

    const orgScopeFirstValue = (path: string): string | null => {
      if (loading?.myOrgScope) return null;
      const arr = (myOrgScope as any)?.[path];
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const v = trim(arr[0]);
      return v ? v : null;
    };

    const computeDefault = (key: string, spec: any): string | null => {
      const df = asRecord(spec?.defaultFrom);
      if (!df) return null;
      const kind = trim(df.kind);
      if (kind === 'queryParam') {
        const param = trim(df.param);
        return param ? queryParamValue(param) : null;
      }
      if (kind === 'orgScopeFirst') {
        const path = trim(df.path);
        return path ? orgScopeFirstValue(path) : null;
      }
      if (kind === 'optionSourceFirst') {
        const src = trim(df.optionSource) || trim(spec?.optionSource);
        return src ? optionSourceFirstValue(src) : null;
      }
      return null;
    };

    const toApply: Record<string, string> = {};
    for (const key of keys) {
      const k = trim(key);
      if (!k) continue;
      if (appliedDefaultsRef.current.has(k)) continue;

      const current = trim(values?.[k]);
      if (current) {
        appliedDefaultsRef.current.add(k);
        continue;
      }

      const spec = asRecord(fieldsMap[k]) || {};
      const dv = computeDefault(k, spec);
      if (dv) {
        toApply[k] = dv;
        appliedDefaultsRef.current.add(k);
      }
    }

    if (Object.keys(toApply).length > 0) {
      setValues((prev) => ({ ...(prev || {}), ...toApply }));
    }
  }, [uiSpec, values, setValues, appliedDefaultsRef, searchParams, optionSources, myOrgScope, loading?.myOrgScope]);
}


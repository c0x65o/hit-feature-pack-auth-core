type AnyRecord = Record<string, any>;

function asRecord(v: unknown): AnyRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function trimOrEmpty(v: unknown): string {
  return str(v).trim();
}

function bool(v: unknown): boolean {
  return v === true || v === 'true';
}

export type PrepareEntityUpsertArgs = {
  uiSpec: any;
  values: Record<string, string>;
  relations: Record<string, any[]>;
};

export type PrepareEntityUpsertResult = {
  fieldErrors: Record<string, string>;
  payload: Record<string, any> | null;
  normalizedRelations: Record<string, any[]>;
};

function collectScalarFieldKeysFromForm(uiSpec: any): string[] {
  const form = asRecord(uiSpec?.form) || {};
  const sections = Array.isArray(form.sections) ? form.sections : [];
  const out: string[] = [];

  for (const s of sections) {
    const sec = asRecord(s);
    if (!sec) continue;
    if (str(sec.widget) === 'relationEditor') continue;
    const fields = Array.isArray(sec.fields) ? sec.fields : [];
    for (const f of fields) {
      const k = trimOrEmpty(f);
      if (!k) continue;
      out.push(k);
    }
  }

  return Array.from(new Set(out));
}

export function prepareEntityUpsert({ uiSpec, values }: PrepareEntityUpsertArgs): PrepareEntityUpsertResult {
  const fieldErrors: Record<string, string> = {};
  const fieldsMap = asRecord(uiSpec?.fields) || {};

  const scalarKeys = collectScalarFieldKeysFromForm(uiSpec);
  for (const key of scalarKeys) {
    const spec = asRecord(fieldsMap[key]) || {};
    if (bool(spec.required)) {
      const v = trimOrEmpty(values?.[key]);
      if (!v) fieldErrors[key] = `${str(spec.label || key)} is required`;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, payload: null, normalizedRelations: {} };
  }

  const payload: Record<string, any> = {};
  for (const key of scalarKeys) {
    const v = trimOrEmpty(values?.[key]);
    payload[key] = v || null;
  }

  return { fieldErrors: {}, payload, normalizedRelations: {} };
}


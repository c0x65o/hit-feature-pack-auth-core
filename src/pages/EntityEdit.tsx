'use client';

import React from 'react';
import { EntityUpsertPage } from '../ui/EntityUpsertPage';

export function EntityEdit({
  entityKey,
  id,
  email,
  onNavigate,
}: {
  entityKey: string;
  id?: string;
  email?: string;
  onNavigate?: (path: string) => void;
}) {
  const effectiveId = id || email;
  if (!entityKey) return <div style={{ padding: 16 }}>Missing required prop: entityKey</div>;
  return <EntityUpsertPage entityKey={entityKey} id={effectiveId} onNavigate={onNavigate} />;
}

export default EntityEdit;


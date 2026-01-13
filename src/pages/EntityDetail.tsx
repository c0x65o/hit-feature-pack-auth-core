'use client';

import React from 'react';
import { EntityDetailPage } from '../ui/EntityDetailPage';

export function EntityDetail({
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
  const effectiveId = id || email || '';
  if (!entityKey) return <div style={{ padding: 16 }}>Missing required prop: entityKey</div>;
  if (!effectiveId) return <div style={{ padding: 16 }}>Missing required prop: id</div>;
  return <EntityDetailPage entityKey={entityKey} id={effectiveId} onNavigate={onNavigate} />;
}

export default EntityDetail;


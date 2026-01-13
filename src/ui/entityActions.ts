'use client';

export type EntityActionHandlerArgs = {
  entityKey: string;
  record: any;
  resolved?: Record<string, any>;
  relations?: Record<string, any[]>;
};

export type EntityActionHandler = (args: EntityActionHandlerArgs) => void | Promise<void>;

// Keep this registry lightweight; auth-core actions will be added here as we
// expand schema-driven headerActions (lock/unlock, reset password, etc.).
const handlers: Record<string, EntityActionHandler | undefined> = {};

export function getEntityActionHandler(handlerId: string): EntityActionHandler | undefined {
  return handlers[handlerId];
}


'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DataTableColumn } from '@hit/ui-kit';
import { formatDate, formatDateTime } from '@hit/sdk';
import {
  useAuthFeatures,
  useGroups,
  useGroup,
  useGroupMutations,
  useGroupUsers,
  useSegments,
  useUser,
  useUserMutations,
  useUsers,
} from '../hooks/useAuthAdmin';
import {
  useDepartment,
  useDepartmentMutations,
  useDepartments,
  useDivision,
  useDivisionMutations,
  useDivisions,
  useLocation,
  useLocationMutations,
  useLocations,
  useLocationTypes,
  useUserOrgAssignmentMutations,
  useUserOrgAssignments,
} from '../hooks/useOrgDimensions';

export type ListQueryArgs = {
  page: number;
  pageSize: number;
  search?: string;
  filters?: any[];
  filterMode?: 'all' | 'any';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type EntityListResult = {
  data: any;
  loading: boolean;
  refetch: () => Promise<any> | void;
  deleteItem?: (id: string) => Promise<any>;
};

export type EntityDetailResult = {
  record: any;
  loading: boolean;
  deleteItem?: (id: string) => Promise<any>;
};

export type EntityUpsertResult = {
  record: any;
  loading: boolean;
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
};

export type EntityFormRegistries = {
  optionSources: Record<string, any>;
  referenceRenderers: Record<string, any>;
  myOrgScope?: any;
  loading?: Record<string, boolean>;
};

export type EntityDataSource = {
  useList?: (args: ListQueryArgs) => EntityListResult;
  useDetail?: (args: { id: string }) => EntityDetailResult;
  useUpsert?: (args: { id?: string }) => EntityUpsertResult;
  useFormRegistries?: () => EntityFormRegistries;
  useListCustomRenderers?: () => Record<string, DataTableColumn['render']>;
  renderRowActions?: (args: {
    row: Record<string, unknown>;
    onRequestDelete: (args: { id: string; name: string }) => void;
    ui: { Button: any };
  }) => React.ReactNode;
};

function normalizeEmailId(id: string): string {
  // Next route params may arrive percent-encoded (sometimes double-encoded). Decode up to 2 times.
  let out = String(id || '').trim();
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) break;
    try {
      out = decodeURIComponent(out);
    } catch {
      break;
    }
  }
  return out;
}

function normalizeSearch(search?: string): string {
  return String(search || '').trim().toLowerCase();
}

function matchesSearch(item: Record<string, unknown>, keys: string[], search?: string): boolean {
  const needle = normalizeSearch(search);
  if (!needle) return true;
  const hay = keys
    .map((k) => String((item as any)?.[k] ?? ''))
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function toComparable(value: unknown): string | number {
  if (value == null) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const str = String(value);
  const ts = Date.parse(str);
  return Number.isNaN(ts) ? str.toLowerCase() : ts;
}

function sortItems<T extends Record<string, unknown>>(items: T[], sortBy?: string, sortOrder?: 'asc' | 'desc'): T[] {
  if (!sortBy) return items;
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = toComparable((a as any)?.[sortBy]);
    const bv = toComparable((b as any)?.[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const total = items.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  return { items: items.slice(start, end), total };
}

function buildOptions(args: {
  items: any[];
  valueKey: string;
  labelKey: string;
  emptyLabel: string;
}) {
  const { items, valueKey, labelKey, emptyLabel } = args;
  return [
    { value: '', label: emptyLabel },
    ...items.map((item) => ({
      value: String((item as any)?.[valueKey] ?? ''),
      label: String((item as any)?.[labelKey] ?? ''),
    })),
  ];
}

function useUserReferenceRenderer() {
  return useMemo(
    () =>
      ({ label, value, setValue, placeholder, ui }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string; ui: { Autocomplete: any } }) => (
        <ui.Autocomplete
          label={label}
          placeholder={placeholder || 'Search users…'}
          value={value}
          onChange={setValue}
          minQueryLength={2}
          debounceMs={200}
          limit={10}
          emptyMessage="No users found"
          searchingMessage="Searching…"
          clearable
          onSearch={async (query: string, lim: number) => {
            const params = new URLSearchParams();
            params.set('search', query);
            params.set('pageSize', String(lim));
            const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
            if (!res.ok) return [];
            const json = await res.json().catch(() => ({}));
            const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
            return items.slice(0, lim).map((u: any) => ({
              value: String(u.email || ''),
              label: String(u.name || u.email || ''),
              description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
            }));
          }}
          resolveValue={async (email: string) => {
            if (!email) return null;
            const params = new URLSearchParams();
            params.set('id', email);
            params.set('pageSize', '1');
            const res = await fetch(`/api/org/users?${params.toString()}`, { method: 'GET' });
            if (!res.ok) return null;
            const json = await res.json().catch(() => ({}));
            const items = Array.isArray((json as any)?.items) ? (json as any).items : [];
            const u = items[0];
            if (!u) return null;
            return {
              value: String(u.email || ''),
              label: String(u.name || u.email || ''),
              description: u?.name && u?.email && u.name !== u.email ? String(u.email) : undefined,
            };
          }}
        />
      ),
    []
  );
}

function useAvailableRolesOptionSource() {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [impersonationEnabled, setImpersonationEnabled] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const authUrl = '/api/proxy/auth';
        const res = await fetch(`${authUrl}/features`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        const rolesAny = json?.features?.available_roles;
        const roles: string[] = Array.isArray(rolesAny) ? rolesAny.map((r: any) => String(r)).filter(Boolean) : [];
        const imp = Boolean(json?.features?.admin_impersonation);
        if (!cancelled) setImpersonationEnabled(imp);
        if (!roles.length) return;
        const next = roles.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));
        if (!cancelled) setOptions(next);
      } catch {
        // fall back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run().catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading, impersonationEnabled };
}

export function useEntityDataSource(entityKey: string): EntityDataSource | null {
  if (entityKey === 'auth.user') {
    const rolesSource = useAvailableRolesOptionSource();
    const mutations = useUserMutations();

    return {
      useList: (args) => {
        const { data, loading, refresh } = useUsers({
          page: args.page,
          pageSize: args.pageSize,
          search: args.search,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
        } as any);

        const items = (data?.items || []).map((u: any) => {
          const email = String(u?.email || '').trim();
          const pf = (u?.profile_fields || {}) as any;
          const name = [pf?.first_name, pf?.last_name].filter(Boolean).join(' ').trim();
          const role = String((u?.role || (Array.isArray(u?.roles) ? u.roles?.[0] : '') || 'user') as any);
          return {
            ...u,
            id: email,
            name: name || email,
            role,
            status: u?.locked ? 'Locked' : 'Active',
            impersonationEnabled: Boolean(rolesSource.impersonationEnabled),
          };
        });

        return {
          data: {
            items,
            pagination: { total: data?.total ?? items.length },
          },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.deleteUser(normalizeEmailId(id)),
        };
      },
      useDetail: ({ id }) => {
        const email = normalizeEmailId(id);
        const { user, loading } = useUser(email);
        const role = String((user?.role || (Array.isArray(user?.roles) ? user.roles?.[0] : '') || 'user') as any);
        const pf = (user?.profile_fields || {}) as any;
        const name = [pf?.first_name, pf?.last_name].filter(Boolean).join(' ').trim();
        const record = user
          ? {
              ...user,
              id: email,
              name: name || email,
              role,
              status: user?.locked ? 'Locked' : 'Active',
              first_name: pf?.first_name ?? '',
              last_name: pf?.last_name ?? '',
              impersonationEnabled: Boolean(rolesSource.impersonationEnabled),
            }
          : null;
        return {
          record,
          loading,
          deleteItem: async (rid: string) => mutations.deleteUser(normalizeEmailId(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const email = id ? normalizeEmailId(id) : '';
        const { user, loading } = useUser(email);
        const pf = (user?.profile_fields || {}) as any;
        const record = user
          ? {
              ...user,
              id: email,
              email,
              role: String((user?.role || (Array.isArray(user?.roles) ? user.roles?.[0] : '') || 'user') as any),
              first_name: pf?.first_name ?? '',
              last_name: pf?.last_name ?? '',
              password: '',
              impersonationEnabled: Boolean(rolesSource.impersonationEnabled),
            }
          : null;

        const create = async (payload: any) => {
          const emailIn = String(payload?.email || '').trim();
          const password = String(payload?.password || '').trim();
          const role = String(payload?.role || 'user').trim() || 'user';
          if (!emailIn) throw new Error('Email is required');
          if (!password) throw new Error('Password is required');
          await mutations.createUser({ email: emailIn, password, roles: [role] });
          await mutations.updateUser(emailIn, {
            profile_fields: {
              first_name: payload?.first_name ? String(payload.first_name) : undefined,
              last_name: payload?.last_name ? String(payload.last_name) : undefined,
            },
          });
          return { id: emailIn };
        };

        const update = async (rid: string, payload: any) => {
          const emailId = normalizeEmailId(rid);
          const role = String(payload?.role || '').trim();
          const firstName = payload?.first_name != null ? String(payload.first_name) : '';
          const lastName = payload?.last_name != null ? String(payload.last_name) : '';
          if (role) {
            await mutations.updateRoles(emailId, role);
          }
          await mutations.updateUser(emailId, {
            profile_fields: {
              ...(firstName ? { first_name: firstName } : {}),
              ...(lastName ? { last_name: lastName } : {}),
            },
          });
          return { id: emailId };
        };

        return { record, loading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'auth.availableRoles': {
            options: [{ value: '', label: 'Select…' }, ...(rolesSource.options || [])],
            loading: rolesSource.loading,
          },
        },
        referenceRenderers: {},
      }),
      useListCustomRenderers: () => ({
        created_at: (value: unknown) => (value ? formatDateTime(String(value)) : '—'),
        last_login: (value: unknown) => (value ? formatDateTime(String(value)) : 'Never'),
        email_verified: (value: unknown) => (value ? 'Verified' : 'Pending'),
        two_factor_enabled: (value: unknown) => (value ? 'Enabled' : 'Disabled'),
        status: (_: unknown, row: Record<string, unknown>) => (row.locked ? 'Locked' : 'Active'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || (row as any).email || '');
              const name = String((row as any).name || (row as any).email || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'auth.group') {
    const { data: authFeatures } = useAuthFeatures();
    const dynamicGroupsEnabled = authFeatures?.dynamic_groups_enabled === true;
    const { data: groups, loading, error, refresh } = useGroups();
    const mutations = useGroupMutations();
    const segments = useSegments({ enabled: dynamicGroupsEnabled, entityKind: 'user' });

    const groupKinds = useMemo(() => {
      const base = [{ value: 'static', label: 'Static (manual members)' }];
      return dynamicGroupsEnabled
        ? [...base, { value: 'dynamic', label: 'Dynamic (computed by segment)' }]
        : base;
    }, [dynamicGroupsEnabled]);

    const segmentOptions = useMemo(() => {
      const xs = segments.data || [];
      return xs.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }));
    }, [segments.data]);

    return {
      useList: (args) => {
        const search = String(args.search || '').trim().toLowerCase();
        const sortBy = String(args.sortBy || 'updated_at');
        const sortOrder = String(args.sortOrder || 'desc') === 'asc' ? 'asc' : 'desc';

        let items = (groups || []).map((g: any) => {
          const meta = g?.metadata && typeof g.metadata === 'object' ? (g.metadata as any) : {};
          const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          return {
            ...g,
            id: String(g?.id || ''),
            kind,
            segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
          };
        });

        if (search) {
          items = items.filter((g: any) => String(g?.name || '').toLowerCase().includes(search));
        }

        const dir = sortOrder === 'asc' ? 1 : -1;
        items = [...items].sort((a: any, b: any) => {
          if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || '')) * dir;
          if (sortBy === 'user_count') return (Number(a.user_count || 0) - Number(b.user_count || 0)) * dir;
          if (sortBy === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
          // updated_at default
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
        });

        const total = items.length;
        const startIdx = (args.page - 1) * args.pageSize;
        const pageItems = items.slice(startIdx, startIdx + args.pageSize);

        return {
          data: { items: pageItems, pagination: { total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.deleteGroup(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const { data: group, loading: groupLoading } = useGroup(id);
        const meta = group?.metadata && typeof group.metadata === 'object' ? (group.metadata as any) : {};
        const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
        const record = group
          ? {
              ...group,
              id: String(group.id),
              kind,
              segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
            }
          : null;
        return {
          record,
          loading: groupLoading,
          deleteItem: async (rid: string) => mutations.deleteGroup(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const { data: group, loading: groupLoading } = useGroup(id || null);
        const meta = group?.metadata && typeof group.metadata === 'object' ? (group.metadata as any) : {};
        const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
        const record = group
          ? {
              ...group,
              id: String(group.id),
              kind,
              segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
            }
          : null;

        const create = async (payload: any) => {
          const name = String(payload?.name || '').trim();
          if (!name) throw new Error('Group Name is required');
          const description = payload?.description != null && String(payload.description).trim() ? String(payload.description).trim() : null;
          const kind = String(payload?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          const segmentKey = String(payload?.segment_key || '').trim();
          const metadata: Record<string, unknown> | undefined = dynamicGroupsEnabled
            ? { kind, ...(kind === 'dynamic' ? { segment_key: segmentKey } : {}) }
            : undefined;
          if (dynamicGroupsEnabled && kind === 'dynamic' && !segmentKey) throw new Error('Segment is required for dynamic groups');
          const created = await mutations.createGroup({ name, description, ...(metadata ? { metadata } : {}) });
          return { id: String(created?.id || '') };
        };

        const update = async (rid: string, payload: any) => {
          const name = String(payload?.name || '').trim();
          if (!name) throw new Error('Group Name is required');
          const description = payload?.description != null && String(payload.description).trim() ? String(payload.description).trim() : null;
          const kind = String(payload?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          const segmentKey = String(payload?.segment_key || '').trim();
          const metadata: Record<string, unknown> | undefined = dynamicGroupsEnabled
            ? { kind, ...(kind === 'dynamic' ? { segment_key: segmentKey } : {}) }
            : undefined;
          if (dynamicGroupsEnabled && kind === 'dynamic' && !segmentKey) throw new Error('Segment is required for dynamic groups');
          await mutations.updateGroup(String(rid), { name, description, ...(metadata ? { metadata } : {}) });
          return { id: String(rid) };
        };

        return { record, loading: groupLoading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'auth.groupKinds': {
            options: [{ value: '', label: 'Select…' }, ...groupKinds],
            loading: false,
          },
          'auth.userSegments': {
            options: [{ value: '', label: 'Select…' }, ...(segmentOptions || [])],
            loading: Boolean(segments.loading),
            placeholder: segments.loading ? 'Loading segments…' : 'Select a segment',
          },
        },
        referenceRenderers: {},
      }),
      useListCustomRenderers: () => ({
        created_at: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        updated_at: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        kind: (value: unknown) => (String(value || '').toLowerCase() === 'dynamic' ? 'Dynamic' : 'Static'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id);
              const name = String((row as any).name || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'org.location') {
    const { data: locations, loading, refresh } = useLocations();
    const { data: locationTypes, loading: locationTypesLoading } = useLocationTypes();
    const mutations = useLocationMutations();
    const userReferenceRenderer = useUserReferenceRenderer();

    return {
      useList: (args) => {
        const items = (locations || []).map((loc) => ({ ...loc, id: String(loc.id) }));
        const filtered = items.filter((item) =>
          matchesSearch(item, ['name', 'code', 'city', 'state', 'country', 'managerUserKey', 'locationTypeName'], args.search)
        );
        const sorted = sortItems(filtered, args.sortBy || 'createdAt', args.sortOrder);
        const page = paginate(sorted, args.page, args.pageSize);
        return {
          data: { items: page.items, pagination: { total: page.total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.remove(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const { data: record, loading: detailLoading } = useLocation(id);
        return {
          record,
          loading: detailLoading,
          deleteItem: async (rid: string) => mutations.remove(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const { data: record, loading: detailLoading } = useLocation(id || null);
        const create = async (payload: any) => mutations.create(payload);
        const update = async (rid: string, payload: any) => mutations.update(String(rid), payload);
        return { record, loading: detailLoading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'org.locationTypes': {
            options: buildOptions({ items: locationTypes || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No type)' }),
            loading: locationTypesLoading,
          },
          'org.locations': {
            options: buildOptions({ items: locations || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No parent)' }),
            loading,
          },
        },
        referenceRenderers: { 'auth.user': userReferenceRenderer },
      }),
      useListCustomRenderers: () => ({
        createdAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        updatedAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        isActive: (value: unknown) => (value ? 'Active' : 'Inactive'),
        isPrimary: (value: unknown) => (value ? 'Yes' : 'No'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || '');
              const name = String((row as any).name || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'org.division') {
    const { data: divisions, loading, refresh } = useDivisions();
    const mutations = useDivisionMutations();
    const userReferenceRenderer = useUserReferenceRenderer();

    return {
      useList: (args) => {
        const items = (divisions || []).map((division) => ({ ...division, id: String(division.id) }));
        const filtered = items.filter((item) =>
          matchesSearch(item, ['name', 'code', 'managerUserKey'], args.search)
        );
        const sorted = sortItems(filtered, args.sortBy || 'createdAt', args.sortOrder);
        const page = paginate(sorted, args.page, args.pageSize);
        return {
          data: { items: page.items, pagination: { total: page.total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.remove(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const { data: record, loading: detailLoading } = useDivision(id);
        return {
          record,
          loading: detailLoading,
          deleteItem: async (rid: string) => mutations.remove(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const { data: record, loading: detailLoading } = useDivision(id || null);
        const create = async (payload: any) => mutations.create(payload);
        const update = async (rid: string, payload: any) => mutations.update(String(rid), payload);
        return { record, loading: detailLoading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'org.divisions': {
            options: buildOptions({ items: divisions || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No parent)' }),
            loading,
          },
        },
        referenceRenderers: { 'auth.user': userReferenceRenderer },
      }),
      useListCustomRenderers: () => ({
        createdAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        updatedAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        isActive: (value: unknown) => (value ? 'Active' : 'Inactive'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || '');
              const name = String((row as any).name || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'org.department') {
    const { data: departments, loading, refresh } = useDepartments();
    const { data: divisions, loading: divisionsLoading } = useDivisions();
    const mutations = useDepartmentMutations();
    const userReferenceRenderer = useUserReferenceRenderer();

    return {
      useList: (args) => {
        const items = (departments || []).map((department) => ({ ...department, id: String(department.id) }));
        const filtered = items.filter((item) =>
          matchesSearch(item, ['name', 'code', 'divisionName', 'managerUserKey'], args.search)
        );
        const sorted = sortItems(filtered, args.sortBy || 'createdAt', args.sortOrder);
        const page = paginate(sorted, args.page, args.pageSize);
        return {
          data: { items: page.items, pagination: { total: page.total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.remove(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const { data: record, loading: detailLoading } = useDepartment(id);
        return {
          record,
          loading: detailLoading,
          deleteItem: async (rid: string) => mutations.remove(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const { data: record, loading: detailLoading } = useDepartment(id || null);
        const create = async (payload: any) => mutations.create(payload);
        const update = async (rid: string, payload: any) => mutations.update(String(rid), payload);
        return { record, loading: detailLoading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'org.divisions': {
            options: buildOptions({ items: divisions || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No division)' }),
            loading: divisionsLoading,
          },
          'org.departments': {
            options: buildOptions({ items: departments || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No parent)' }),
            loading,
          },
        },
        referenceRenderers: { 'auth.user': userReferenceRenderer },
      }),
      useListCustomRenderers: () => ({
        createdAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        updatedAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        isActive: (value: unknown) => (value ? 'Active' : 'Inactive'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || '');
              const name = String((row as any).name || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'org.userOrgAssignment') {
    const { data: assignments, loading, refresh } = useUserOrgAssignments();
    const { data: divisions } = useDivisions();
    const { data: departments } = useDepartments();
    const { data: locations } = useLocations();
    const mutations = useUserOrgAssignmentMutations();
    const userReferenceRenderer = useUserReferenceRenderer();

    const optionSources = {
      'org.divisions': {
        options: buildOptions({ items: divisions || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No division)' }),
        loading: false,
      },
      'org.departments': {
        options: buildOptions({ items: departments || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No department)' }),
        loading: false,
      },
      'org.locations': {
        options: buildOptions({ items: locations || [], valueKey: 'id', labelKey: 'name', emptyLabel: '(No location)' }),
        loading: false,
      },
    };

    return {
      useList: (args) => {
        const items = (assignments || []).map((assignment) => ({ ...assignment, id: String(assignment.id) }));
        const filtered = items.filter((item) =>
          matchesSearch(item, ['userKey', 'divisionName', 'departmentName', 'locationName'], args.search)
        );
        const sorted = sortItems(filtered, args.sortBy || 'createdAt', args.sortOrder);
        const page = paginate(sorted, args.page, args.pageSize);
        return {
          data: { items: page.items, pagination: { total: page.total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.remove(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const record = (assignments || []).find((assignment) => String(assignment.id) === String(id)) || null;
        return {
          record,
          loading,
          deleteItem: async (rid: string) => mutations.remove(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const record = (assignments || []).find((assignment) => String(assignment.id) === String(id)) || null;
        const create = async (payload: any) => {
          const userKey = String(payload?.userKey || '').trim();
          const divisionId = payload?.divisionId ? String(payload.divisionId).trim() : '';
          const departmentId = payload?.departmentId ? String(payload.departmentId).trim() : '';
          const locationId = payload?.locationId ? String(payload.locationId).trim() : '';
          if (!userKey) throw new Error('User is required');
          if (!divisionId && !departmentId && !locationId) {
            throw new Error('Select at least one division, department, or location.');
          }
          const created = await mutations.create({
            userKey,
            divisionId: divisionId || null,
            departmentId: departmentId || null,
            locationId: locationId || null,
          });
          return { id: String(created?.id || '') };
        };
        const update = async (rid: string, payload: any) => {
          const userKey = String(payload?.userKey || '').trim();
          const divisionId = payload?.divisionId ? String(payload.divisionId).trim() : '';
          const departmentId = payload?.departmentId ? String(payload.departmentId).trim() : '';
          const locationId = payload?.locationId ? String(payload.locationId).trim() : '';
          if (!userKey) throw new Error('User is required');
          if (!divisionId && !departmentId && !locationId) {
            throw new Error('Select at least one division, department, or location.');
          }
          await mutations.update(String(rid), {
            userKey,
            divisionId: divisionId || null,
            departmentId: departmentId || null,
            locationId: locationId || null,
          });
          return { id: String(rid) };
        };
        return { record, loading, create, update };
      },
      useFormRegistries: () => ({
        optionSources,
        referenceRenderers: { 'auth.user': userReferenceRenderer },
      }),
      useListCustomRenderers: () => ({
        createdAt: (value: unknown) => (value ? formatDate(String(value)) : '—'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || '');
              const name = String((row as any).userKey || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  return null;
}


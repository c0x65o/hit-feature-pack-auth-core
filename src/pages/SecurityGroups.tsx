'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Lock, Users as UsersIcon, KeyRound, BarChart3 } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import {
  useUsers,
  useGroups,
  usePermissionActions,
  usePermissionSets,
  usePermissionSet,
  usePermissionSetMutations,
  type PermissionSetAssignment,
  type PermissionSetPageGrant,
  type PermissionSetActionGrant,
  type PermissionSetMetricGrant,
} from '../hooks/useAuthAdmin';

interface SecurityGroupsProps {
  onNavigate?: (path: string) => void;
}

export default function SecurityGroupsPage(props: SecurityGroupsProps) {
  return <SecurityGroups {...props} />;
}

export function SecurityGroups({ onNavigate }: SecurityGroupsProps) {
  const { Page, Card, Button, Badge, Modal, Input, Alert, Spinner, Tabs } = useUi();

  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: sets, loading: setsLoading, error: setsError, refresh: refreshSets } = usePermissionSets();
  const { data: detail, loading: detailLoading, error: detailError, refresh: refreshDetail } = usePermissionSet(selectedSetId);
  const mutations = usePermissionSetMutations();

  const selected = detail?.permission_set ?? null;
  const detailNonNull = detail || null;

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const canCreate = newName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    await mutations.createPermissionSet({ name: newName.trim(), description: newDescription.trim() || undefined });
    setNewName('');
    setNewDescription('');
    setCreateOpen(false);
    refreshSets();
  };

  const handleDelete = async (psId: string) => {
    const ok = typeof window !== 'undefined'
      ? window.confirm('Delete this security group? This cannot be undone.')
      : false;
    if (!ok) return;
    await mutations.deletePermissionSet(psId);
    if (selectedSetId === psId) setSelectedSetId(null);
    refreshSets();
  };

  return (
    <Page
      title="Security Groups"
      description="Permission Sets: assign page/action/metric grants to users, groups (static/dynamic), and roles. Effective access is the union."
    >
      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={18} />
                <h3 className="text-lg font-semibold">Permission Sets</h3>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} className="mr-1" /> New
              </Button>
            </div>

            {setsLoading ? (
              <Spinner />
            ) : setsError ? (
              <Alert variant="error">{setsError.message}</Alert>
            ) : (sets && sets.length > 0) ? (
              <div className="space-y-2">
                {sets.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between group ${
                      selectedSetId === s.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedSetId(s.id)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      {s.description ? <div className="text-xs text-gray-500 truncate">{s.description}</div> : null}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 p-1 h-auto"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          handleDelete(s.id).catch(() => void 0);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert variant="info">No security groups yet.</Alert>
            )}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-8">
          {!selectedSetId ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <Lock size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-500">Select a security group</h3>
              <p className="text-gray-400 mt-2 max-w-xs">
                Create and configure permission sets, then assign them to users, groups, or roles.
              </p>
            </Card>
          ) : detailLoading ? (
            <Card><Spinner /></Card>
          ) : detailError ? (
            <Card><Alert variant="error">{detailError.message}</Alert></Card>
          ) : selected ? (
            <div className="space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold truncate">{selected.name}</h2>
                    <div className="text-gray-500 text-sm">
                      {selected.description || 'No description.'}
                    </div>
                  </div>
                  <Badge variant="info">Security Group</Badge>
                </div>
              </Card>

              <Tabs
                tabs={[
                  {
                    id: 'assignments',
                    label: 'Assignments',
                    content: (
                      <div className="mt-4 space-y-4">
                        <AssignmentManager
                          psId={selected.id}
                          assignments={(detailNonNull as any).assignments}
                          onChanged={refreshDetail}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'pages',
                    label: 'Page Grants',
                    content: (
                      <div className="mt-4 space-y-4">
                        <PageGrantsTree
                          psId={selected.id}
                          grants={(detailNonNull as any).page_grants}
                          onChanged={refreshDetail}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'actions',
                    label: 'Action Grants',
                    content: (
                      <div className="mt-4 space-y-4">
                        <GrantsManager
                          kind="action"
                          psId={selected.id}
                          grants={(detailNonNull as any).action_grants}
                          onChanged={refreshDetail}
                        />
                      </div>
                    ),
                  },
                  {
                    id: 'metrics',
                    label: 'Metric Grants',
                    content: (
                      <div className="mt-4 space-y-4">
                        <Alert variant="warning">
                          Metric ACL is 0.9 mode: metrics are default-allow until at least one metric grant exists for that key.
                        </Alert>
                        <GrantsManager
                          kind="metric"
                          psId={selected.id}
                          grants={(detailNonNull as any).metric_grants}
                          onChanged={refreshDetail}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <Card><Alert variant="error">Security group not found.</Alert></Card>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Security Group">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input value={newName} onChange={setNewName} placeholder="e.g. Finance Managers" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input value={newDescription} onChange={setNewDescription} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => handleCreate().catch(() => void 0)} disabled={!canCreate}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

function AssignmentManager({
  psId,
  assignments,
  onChanged,
}: {
  psId: string;
  assignments: PermissionSetAssignment[];
  onChanged: () => void;
}) {
  const { Card, Button, Badge, Modal, Alert, Spinner, Input } = useUi();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'role' | 'group' | 'user'>('role');
  const [principalId, setPrincipalId] = useState('');

  const { data: groups } = useGroups();
  const { data: users, loading: usersLoading } = useUsers({ page: 1, pageSize: 1000 });
  const { addAssignment, removeAssignment } = usePermissionSetMutations();

  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups || []) {
      if (g?.id && g?.name) m.set(String(g.id), String(g.name));
    }
    return m;
  }, [groups]);

  const roleSuggestions = useMemo(() => {
    const roles = new Set<string>();
    roles.add('admin');
    roles.add('user');
    for (const u of (users?.items || [])) {
      const r = (u as any)?.role;
      if (typeof r === 'string' && r.trim()) roles.add(r.trim());
    }
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const add = async () => {
    const id = principalId.trim();
    if (!id) return;
    await addAssignment(psId, type, id);
    setPrincipalId('');
    setOpen(false);
    onChanged();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UsersIcon size={18} />
          <h3 className="text-lg font-semibold">Assigned To</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Alert variant="info">No assignments yet.</Alert>
      ) : (
        <div className="border rounded-lg divide-y bg-white dark:bg-gray-900">
          {assignments.map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={a.principal_type === 'role' ? 'info' : a.principal_type === 'group' ? 'warning' : 'success'}>
                  {a.principal_type.toUpperCase()}
                </Badge>
                {a.principal_type === 'group' ? (
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {groupNameById.get(a.principal_id) || 'Unknown group'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{a.principal_id}</div>
                  </div>
                ) : (
                  <span className="font-medium truncate">{a.principal_id}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => removeAssignment(psId, a.id).then(onChanged).catch(() => void 0)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Assignment">
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['role', 'group', 'user'] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-1 text-sm rounded-md transition-colors ${
                  type === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'text-gray-500'
                }`}
                onClick={() => { setType(t); setPrincipalId(''); }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {type === 'role' ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {roleSuggestions.slice(0, 12).map((r) => (
                  <Button key={r} variant={principalId === r ? 'primary' : 'ghost'} onClick={() => setPrincipalId(r)}>
                    {r}
                  </Button>
                ))}
              </div>
              <Input value={principalId} onChange={setPrincipalId} placeholder="Or type a custom role…" />
            </div>
          ) : null}

          {type === 'group' ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(groups || []).map((g) => (
                <div
                  key={g.id}
                  className={`p-2 border rounded cursor-pointer ${principalId === g.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setPrincipalId(g.id)}
                >
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">{g.id}</div>
                </div>
              ))}
              {!groups || groups.length === 0 ? <Alert variant="info">No groups found.</Alert> : null}
            </div>
          ) : null}

          {type === 'user' ? (
            usersLoading ? (
              <Spinner />
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(users?.items || []).map((u: any) => (
                  <div
                    key={u.email}
                    className={`p-2 border rounded cursor-pointer ${principalId === u.email ? 'border-blue-500 bg-blue-50' : ''}`}
                    onClick={() => setPrincipalId(u.email)}
                  >
                    {u.email}
                  </div>
                ))}
                {!users || users.items.length === 0 ? <Alert variant="info">No users found.</Alert> : null}
              </div>
            )
          ) : null}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => add().catch(() => void 0)} disabled={!principalId.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function GrantsManager({
  kind,
  psId,
  grants,
  onChanged,
}: {
  kind: 'page' | 'action' | 'metric';
  psId: string;
  grants: Array<PermissionSetPageGrant | PermissionSetActionGrant | PermissionSetMetricGrant>;
  onChanged: () => void;
}) {
  const { Card, Button, Badge, Modal, Input, Alert, Spinner } = useUi();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');

  const { data: actions, loading: actionsLoading } = usePermissionActions();
  const mutations = usePermissionSetMutations();

  const label = kind === 'page' ? 'Page Path' : kind === 'action' ? 'Action Key' : 'Metric Key';
  const icon = kind === 'page' ? <Lock size={18} /> : kind === 'action' ? <KeyRound size={18} /> : <BarChart3 size={18} />;

  const grantIdByValue = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of grants as any[]) {
      const v = String(g?.page_path || g?.action_key || g?.metric_key || '');
      if (v) m.set(v, String(g.id));
    }
    return m;
  }, [grants]);

  const remove = async (grantId: string) => {
    if (kind === 'page') await mutations.removePageGrant(psId, grantId);
    else if (kind === 'action') await mutations.removeActionGrant(psId, grantId);
    else await mutations.removeMetricGrant(psId, grantId);
    onChanged();
  };

  const add = async () => {
    const raw = value.trim();
    if (!raw) return;
    const values = raw
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const v of values) {
      if (kind === 'page') await mutations.addPageGrant(psId, v);
      else if (kind === 'action') await mutations.addActionGrant(psId, v);
      else await mutations.addMetricGrant(psId, v);
    }
    setValue('');
    setOpen(false);
    onChanged();
  };

  const filteredActions = useMemo(() => {
    if (kind !== 'action') return [];
    const xs = Array.isArray(actions) ? actions : [];
    const q = search.trim().toLowerCase();
    if (!q) return xs;
    return xs.filter((a: any) => {
      const k = String(a?.key || '').toLowerCase();
      const lbl = String(a?.label || '').toLowerCase();
      const pack = String(a?.pack_name || '').toLowerCase();
      return k.includes(q) || lbl.includes(q) || pack.includes(q);
    });
  }, [actions, kind, search]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{label}s</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {grants.length === 0 ? (
        <Alert variant="info">No {label.toLowerCase()} grants yet.</Alert>
      ) : (
        <div className="border rounded-lg divide-y bg-white dark:bg-gray-900">
          {grants.map((g: any) => (
            <div key={g.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-3">
                <Badge variant="info">{kind.toUpperCase()}</Badge>
                <span className="font-medium truncate">{g.page_path || g.action_key || g.metric_key}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => remove(g.id).catch(() => void 0)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Add ${label}`}>
        <div className="space-y-4">
          {kind === 'action' ? (
            actionsLoading ? (
              <Spinner />
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <Input value={search} onChange={setSearch} placeholder="Filter actions (key, label, pack)..." />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredActions.slice(0, 500).map((a: any) => (
                  <div
                    key={a.key}
                    className={`p-2 border rounded cursor-pointer ${value === a.key ? 'border-blue-500 bg-blue-50' : ''}`}
                    onClick={() => setValue(a.key)}
                  >
                    <div className="font-medium">{a.key}</div>
                    {a.label ? <div className="text-xs text-gray-500">{a.label}</div> : null}
                  </div>
                ))}
                {!actions || actions.length === 0 ? <Alert variant="info">No actions found.</Alert> : null}
                {filteredActions.length > 500 ? (
                  <div className="text-xs text-gray-500">Showing first 500 matches. Refine your search to narrow further.</div>
                ) : null}
              </div>
                <div className="text-xs text-gray-500">
                  Tip: you can also paste multiple action keys separated by commas or newlines.
                </div>
              </div>
            )
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <Input
                value={value}
                onChange={setValue}
                placeholder={kind === 'page' ? '/crm/companies/[id]' : kind === 'metric' ? 'projects.gross_revenue' : 'crm.company.create_prospect'}
              />
              <div className="text-xs text-gray-500 mt-2">
                You can paste multiple values separated by commas or newlines.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => add().catch(() => void 0)} disabled={!value.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

type TreeNode = {
  path: string;
  label: string;
  children: TreeNode[];
  level: number;
};

type GeneratedRoute = {
  path: string;
  packName: string;
  componentName: string;
  roles: string[];
  shell: boolean;
};

function buildPathTree(pages: Array<{ path: string; label: string }>): TreeNode[] {
  const root: TreeNode[] = [];
  const byPath = new Map<string, TreeNode>();

  for (const p of pages) {
    const path = p.path;
    const segments = path.split('/').filter(Boolean);
    let currentPath = '';
    let parent: TreeNode | null = null;

    segments.forEach((seg, idx) => {
      currentPath += `/${seg}`;
      let node = byPath.get(currentPath);
      if (!node) {
        const isLeaf = idx === segments.length - 1;
        node = {
          path: currentPath,
          label: isLeaf ? p.label : seg,
          children: [],
          level: idx,
        };
        byPath.set(currentPath, node);
        if (parent) parent.children.push(node);
        else root.push(node);
      }
      parent = node;
    });
  }

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(root);
  return root;
}

function _normalizePath(p: string): string {
  const x = String(p || '').trim();
  if (!x) return '';
  if (x === '/') return '/';
  return x.startsWith('/') ? x.replace(/\/+$/, '') : `/${x.replace(/\/+$/, '')}`;
}

function _isExcludedAdminishPath(path: string): boolean {
  const p = _normalizePath(path);
  return p.startsWith('/admin') || p.startsWith('/setup') || p.startsWith('/settings');
}

async function loadGeneratedShellPages(): Promise<Array<{ path: string; label: string }>> {
  try {
    const routesMod = await import('@/.hit/generated/routes');
    const featurePackRoutes: GeneratedRoute[] = (routesMod as any).featurePackRoutes || [];
    const authRoutes: string[] = (routesMod as any).authRoutes || [];

    const pages = featurePackRoutes
      .filter((r) => r && typeof r.path === 'string')
      .filter((r) => Boolean((r as any).shell))
      .filter((r) => !_isExcludedAdminishPath(String(r.path)))
      .filter((r) => !authRoutes.includes(String(r.path)))
      .filter((r) => String(r.path) !== '/')
      .map((r) => ({
        path: _normalizePath(r.path),
        label: `${r.packName}: ${r.componentName}`,
      }));

    const unique = Array.from(new Map(pages.map((p) => [p.path, p])).values());
    return unique.sort((a, b) => a.path.localeCompare(b.path));
  } catch (e) {
    console.warn('Could not load generated routes:', e);
    return [];
  }
}

function filterTree(nodes: TreeNode[], predicate: (n: TreeNode) => boolean): TreeNode[] {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const kids = filterTree(n.children, predicate);
    if (predicate(n) || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}

function isAncestorPath(ancestor: string, child: string): boolean {
  const a = _normalizePath(ancestor);
  const c = _normalizePath(child);
  if (a === '/' || a === '') return true;
  if (!c.startsWith(a)) return false;
  if (c === a) return false;
  return c[a.length] === '/';
}

function pageGrantCandidates(path: string): string[] {
  const p = _normalizePath(path);
  const segs = p.split('/').filter(Boolean);
  const out: string[] = [p, '/*'];
  let cur = '';
  for (const s of segs) {
    cur += `/${s}`;
    out.push(`${cur}/*`);
  }
  return Array.from(new Set(out));
}

function PageGrantsTree({
  psId,
  grants,
  onChanged,
}: {
  psId: string;
  grants: PermissionSetPageGrant[];
  onChanged: () => void;
}) {
  const { Card, Button, Badge, Modal, Alert, Spinner, Input, Checkbox } = useUi();
  const mutations = usePermissionSetMutations();

  const [pages, setPages] = useState<Array<{ path: string; label: string }>>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [grantModal, setGrantModal] = useState<{ open: boolean; path: string; hasChildren: boolean }>(() => ({
    open: false,
    path: '',
    hasChildren: false,
  }));
  const [grantMode, setGrantMode] = useState<'node' | 'subtree'>('subtree');

  useEffect(() => {
    let cancelled = false;
    setPagesLoading(true);
    loadGeneratedShellPages()
      .then((xs) => {
        if (cancelled) return;
        setPages(xs);
        // Expand top-level nodes by default for discoverability.
        const top = new Set<string>();
        for (const p of xs) {
          const segs = p.path.split('/').filter(Boolean);
          if (segs.length > 0) top.add(`/${segs[0]}`);
        }
        setExpanded(top);
      })
      .finally(() => {
        if (!cancelled) setPagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const navTree = useMemo(() => buildPathTree(pages), [pages]);

  const grantIdByPath = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of (grants || []) as any[]) {
      m.set(String(g.page_path), String(g.id));
    }
    return m;
  }, [grants]);

  const explicitExact = useMemo(() => {
    const s = new Set<string>();
    for (const g of grants || []) {
      const p = _normalizePath((g as any).page_path);
      if (!p.endsWith('/*') && p !== '/*') s.add(p);
    }
    return s;
  }, [grants]);

  const explicitSubtree = useMemo(() => {
    const s = new Set<string>();
    for (const g of grants || []) {
      const raw = String((g as any).page_path || '');
      if (raw === '/*') s.add('/*');
      if (raw.endsWith('/*')) s.add(_normalizePath(raw.slice(0, -2)) + '/*');
    }
    return s;
  }, [grants]);

  const isGrantedEffective = (path: string): { granted: boolean; inheritedFrom?: string; matchedGrant?: string } => {
    const p = _normalizePath(path);
    const candidates = pageGrantCandidates(p);
    // Prefer an explicit match closest to the node for explanation.
    for (const c of candidates) {
      if (c === p && explicitExact.has(p)) return { granted: true, matchedGrant: p };
      if (c.endsWith('/*') && explicitSubtree.has(_normalizePath(c.slice(0, -2)) + '/*')) {
        // Inherited if subtree is from an ancestor, explicit if it is exactly p/*
        const base = _normalizePath(c.slice(0, -2));
        const isSelf = base === p;
        return {
          granted: true,
          matchedGrant: `${base}/*`,
          inheritedFrom: isSelf ? undefined : `${base}/*`,
        };
      }
      if (c === '/*' && explicitSubtree.has('/*')) {
        return { granted: true, matchedGrant: '/*', inheritedFrom: p === '/' ? undefined : '/*' };
      }
    }
    return { granted: false };
  };

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const addGrant = async (path: string, mode: 'node' | 'subtree') => {
    const p = _normalizePath(path);
    const grantPath = mode === 'subtree' ? `${p}/*` : p;
    await mutations.addPageGrant(psId, grantPath);
    onChanged();
  };

  const removeGrantByValue = async (grantPath: string) => {
    const id = grantIdByPath.get(grantPath);
    if (!id) return;
    await mutations.removePageGrant(psId, id);
    onChanged();
  };

  const requestToggleOn = (path: string, hasChildren: boolean) => {
    if (!hasChildren) {
      addGrant(path, 'node').catch(() => void 0);
      return;
    }
    setGrantMode('subtree');
    setGrantModal({ open: true, path, hasChildren });
  };

  const doToggleOff = (path: string) => {
    const p = _normalizePath(path);
    const exact = grantIdByPath.get(p);
    const subtree = grantIdByPath.get(`${p}/*`);
    if (subtree) removeGrantByValue(`${p}/*`).catch(() => void 0);
    if (exact) removeGrantByValue(p).catch(() => void 0);
  };

  const query = search.trim().toLowerCase();
  const filteredTree = useMemo(() => {
    if (!query) return navTree;
    return filterTree(navTree, (n) => n.path.toLowerCase().includes(query) || n.label.toLowerCase().includes(query));
  }, [navTree, query]);

  const renderNode = (n: TreeNode) => {
    const hasChildren = n.children.length > 0;
    const isOpen = expanded.has(n.path);
    const eff = isGrantedEffective(n.path);
    const explicitHere = grantIdByPath.has(n.path) || grantIdByPath.has(`${_normalizePath(n.path)}/*`);
    const inheritedOnly = eff.granted && !explicitHere && Boolean(eff.inheritedFrom);

    return (
      <div key={n.path} className="select-none">
        <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ paddingLeft: `${n.level * 20 + 8}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleExpanded(n.path)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <span className="text-gray-500">{isOpen ? '▾' : '▸'}</span>
            </button>
          ) : (
            <div className="w-[24px]" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{n.label}</span>
              <span className="text-xs text-gray-500 truncate">{n.path}</span>
              {grantIdByPath.has(`${_normalizePath(n.path)}/*`) ? (
                <Badge variant="info" className="text-xs">Subtree</Badge>
              ) : null}
              {grantIdByPath.has(_normalizePath(n.path)) ? (
                <Badge variant="info" className="text-xs">Exact</Badge>
              ) : null}
              {inheritedOnly ? (
                <Badge variant="default" className="text-xs">Inherited</Badge>
              ) : null}
            </div>
            {eff.matchedGrant ? (
              <div className="text-xs text-gray-500">Effective via: {eff.matchedGrant}</div>
            ) : null}
          </div>

          <Checkbox
            checked={Boolean(eff.granted)}
            disabled={inheritedOnly || mutations.loading}
            onChange={(checked: boolean) => {
              if (checked) requestToggleOn(n.path, hasChildren);
              else doToggleOff(n.path);
            }}
          />
        </div>

        {hasChildren && isOpen ? (
          <div>{n.children.map(renderNode)}</div>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">Page Grants</div>
          <div className="text-sm text-gray-500">Grant exact pages or subtrees (e.g. <code>/crm/*</code>). Admin/setup/settings pages are excluded from this picker.</div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setExpanded(new Set())}>Collapse</Button>
      </div>

      <div className="mb-3">
        <Input value={search} onChange={setSearch} placeholder="Search pages (path or label)..." />
      </div>

      {pagesLoading ? (
        <Spinner />
      ) : filteredTree.length === 0 ? (
        <Alert variant="info">No pages found.</Alert>
      ) : (
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 max-h-[60vh] overflow-y-auto">
          {filteredTree.map(renderNode)}
        </div>
      )}

      <Modal
        open={grantModal.open}
        onClose={() => setGrantModal({ open: false, path: '', hasChildren: false })}
        title="Add Page Grant"
        description={`How should this grant apply to ${grantModal.path}?`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={grantMode === 'node'} onChange={() => setGrantMode('node')} />
              <span className="font-medium">This page only</span>
              <span className="text-xs text-gray-500">(exact grant)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={grantMode === 'subtree'} onChange={() => setGrantMode('subtree')} />
              <span className="font-medium">This page + all descendants</span>
              <span className="text-xs text-gray-500">(subtree grant: {grantModal.path}/*)</span>
            </label>
          </div>

          <Alert variant="info">
            Note: permissions are allow-only. If you grant a subtree, you can’t “ungrant” a child without removing the ancestor subtree grant.
          </Alert>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setGrantModal({ open: false, path: '', hasChildren: false })}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const p = grantModal.path;
                setGrantModal({ open: false, path: '', hasChildren: false });
                addGrant(p, grantMode).catch(() => void 0);
              }}
            >
              Add Grant
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

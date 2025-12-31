'use client';

import React, { useMemo, useState } from 'react';
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
                        <GrantsManager
                          kind="page"
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
            <Input value={newName} onChange={(e: any) => setNewName(e.target.value)} placeholder="e.g. Finance Managers" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input value={newDescription} onChange={(e: any) => setNewDescription(e.target.value)} placeholder="Optional" />
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
                <span className="font-medium truncate">{a.principal_id}</span>
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
              <Input value={principalId} onChange={(e: any) => setPrincipalId(e.target.value)} placeholder="Or type a custom role…" />
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

  const { data: actions, loading: actionsLoading } = usePermissionActions();
  const mutations = usePermissionSetMutations();

  const label = kind === 'page' ? 'Page Path' : kind === 'action' ? 'Action Key' : 'Metric Key';
  const icon = kind === 'page' ? <Lock size={18} /> : kind === 'action' ? <KeyRound size={18} /> : <BarChart3 size={18} />;

  const remove = async (grantId: string) => {
    if (kind === 'page') await mutations.removePageGrant(psId, grantId);
    else if (kind === 'action') await mutations.removeActionGrant(psId, grantId);
    else await mutations.removeMetricGrant(psId, grantId);
    onChanged();
  };

  const add = async () => {
    const v = value.trim();
    if (!v) return;
    if (kind === 'page') await mutations.addPageGrant(psId, v);
    else if (kind === 'action') await mutations.addActionGrant(psId, v);
    else await mutations.addMetricGrant(psId, v);
    setValue('');
    setOpen(false);
    onChanged();
  };

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
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(actions || []).slice(0, 200).map((a: any) => (
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
              </div>
            )
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <Input
                value={value}
                onChange={(e: any) => setValue(e.target.value)}
                placeholder={kind === 'page' ? '/crm/companies/[id]' : kind === 'metric' ? 'projects.gross_revenue' : 'crm.company.create_prospect'}
              />
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


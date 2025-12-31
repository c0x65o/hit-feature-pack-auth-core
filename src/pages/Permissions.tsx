'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Shield, Users, ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import {
  useUsers,
  useRolePagePermissions,
  useUserPageOverrides,
  useUsersWithOverrides,
  usePagePermissionsMutations,
  useGroups,
  useGroupPagePermissions,
  useGroupPagePermissionsMutations,
  usePermissionActions,
  useRoleActionPermissions,
  useGroupActionPermissions,
  useUserActionOverrides,
  useActionPermissionsMutations,
  syncPermissionActions,
  type User,
  type Group,
} from '../hooks/useAuthAdmin';

interface PermissionsProps {
  onNavigate?: (path: string) => void;
}

interface TreeNode {
  path: string;
  label: string;
  icon?: string;
  children: TreeNode[];
  level: number;
}

type GeneratedRoute = {
  path: string;
  packName: string;
  componentName: string;
  roles: string[];
  shell: boolean;
};

type GeneratedAction = {
  key: string;
  packName: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
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

async function loadGeneratedPages(): Promise<Array<{ path: string; label: string }>> {
  // Client-only. This is used inside useEffect.
  try {
    const routesMod = await import('@/.hit/generated/routes');
    const featurePackRoutes: GeneratedRoute[] = (routesMod as any).featurePackRoutes || [];
    const authRoutes: string[] = (routesMod as any).authRoutes || [];

    const pages = featurePackRoutes
      .filter((r) => r && typeof r.path === 'string')
      // Only shell routes are "app pages" (auth routes are public standalone pages)
      .filter((r) => Boolean((r as any).shell))
      // Skip admin pages and auth pages
      .filter((r) => !String(r.path).startsWith('/admin'))
      .filter((r) => !authRoutes.includes(String(r.path)))
      .filter((r) => String(r.path) !== '/')
      .map((r) => ({
        path: r.path,
        label: `${r.packName}: ${r.componentName}`,
      }));

    const unique = Array.from(new Map(pages.map((p) => [p.path, p])).values());
    return unique.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.warn('Could not load generated routes:', error);
    return [];
  }
}

// Check if a path is a parent of another path
function isParentPath(parentPath: string, childPath: string): boolean {
  if (!childPath.startsWith(parentPath)) return false;
  // Exact match is not a parent
  if (parentPath === childPath) return false;
  // Check if the next character after parent path is a slash
  return childPath[parentPath.length] === '/';
}

// Get all descendant paths
function getDescendantPaths(path: string, allPaths: string[]): string[] {
  return allPaths.filter(p => isParentPath(path, p));
}

export function Permissions({ onNavigate }: PermissionsProps) {
  const { Page, Card, Button, Badge, Modal, Alert, Spinner, Tabs, Checkbox } = useUi();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'groups' | 'roles' | 'users' | 'actions-groups' | 'actions-roles' | 'actions-users'
  >('groups');
  const [userOverrideModalOpen, setUserOverrideModalOpen] = useState(false);
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<User | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const { data: usersData, loading: usersLoading } = useUsers({ pageSize: 1000 });
  const { data: groups, loading: groupsLoading } = useGroups();
  const { data: rolePermissions, loading: rolePermissionsLoading, refresh: refreshRolePermissions } =
    useRolePagePermissions(selectedRole);
  const { data: groupPermissions, loading: groupPermissionsLoading, refresh: refreshGroupPermissions } =
    useGroupPagePermissions(selectedGroup);
  const { data: userOverrides, loading: userOverridesLoading, refresh: refreshUserOverrides } =
    useUserPageOverrides(selectedUser);
  const { data: usersWithOverrides, loading: usersWithOverridesLoading, refresh: refreshUsersWithOverrides } =
    useUsersWithOverrides();
  const {
    setRolePagePermission,
    deleteRolePagePermission,
    setUserPageOverride,
    deleteUserPageOverride,
    loading: mutatingPermissions,
  } = usePagePermissionsMutations();
  const {
    setGroupPagePermission,
    deleteGroupPagePermission,
    loading: mutatingGroupPermissions,
  } = useGroupPagePermissionsMutations();

  // Action permissions
  const { data: actionDefs, loading: actionDefsLoading, refresh: refreshActionDefs } = usePermissionActions();
  const { data: roleActionPermissions, loading: roleActionPermissionsLoading, refresh: refreshRoleActionPermissions } =
    useRoleActionPermissions(selectedRole);
  const { data: groupActionPermissions, loading: groupActionPermissionsLoading, refresh: refreshGroupActionPermissions } =
    useGroupActionPermissions(selectedGroup);
  const { data: userActionOverrides, loading: userActionOverridesLoading, refresh: refreshUserActionOverrides } =
    useUserActionOverrides(selectedUser);
  const {
    setRoleActionPermission,
    deleteRoleActionPermission,
    setUserActionOverride,
    deleteUserActionOverride,
    setGroupActionPermission,
    deleteGroupActionPermission,
    loading: mutatingActionPermissions,
  } = useActionPermissionsMutations();

  const [generatedActions, setGeneratedActions] = useState<GeneratedAction[]>([]);
  const [generatedActionsLoading, setGeneratedActionsLoading] = useState(true);
  const [actionSyncStatus, setActionSyncStatus] = useState<
    { state: 'idle' | 'syncing' | 'synced' | 'error'; error?: string; at?: string }
  >({ state: 'idle' });

  // Load generated action registry (client-only) and try to sync it into auth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGeneratedActionsLoading(true);
        const gen = await import('@/.hit/generated/actions').catch(() => null);
        const actions = Array.isArray((gen as any)?.featurePackActions) ? (gen as any).featurePackActions : [];
        const normalized: GeneratedAction[] = actions
          .map((a: any) => ({
            key: String(a?.key || '').trim(),
            packName: String(a?.packName || '').trim(),
            label: String(a?.label || a?.key || '').trim(),
            description: String(a?.description || '').trim(),
            defaultEnabled: Boolean(a?.defaultEnabled),
          }))
          .filter((a: GeneratedAction) => Boolean(a.key));

        if (!cancelled) setGeneratedActions(normalized);

        if (normalized.length === 0) {
          if (!cancelled) setActionSyncStatus({ state: 'idle' });
          return;
        }

        setActionSyncStatus({ state: 'syncing' });
        await syncPermissionActions(normalized);
        if (cancelled) return;
        setActionSyncStatus({ state: 'synced', at: new Date().toISOString() });
        refreshActionDefs();
      } catch (e: any) {
        if (cancelled) return;
        setActionSyncStatus({
          state: 'error',
          error: String(e?.message || 'Failed to sync action definitions'),
          at: new Date().toISOString(),
        });
      } finally {
        if (!cancelled) setGeneratedActionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshActionDefs]);

  const syncActionsNow = async () => {
    if (!generatedActions.length) return;
    setActionSyncStatus({ state: 'syncing' });
    try {
      await syncPermissionActions(generatedActions);
      setActionSyncStatus({ state: 'synced', at: new Date().toISOString() });
      refreshActionDefs();
    } catch (e: any) {
      setActionSyncStatus({
        state: 'error',
        error: String(e?.message || 'Failed to sync action definitions'),
        at: new Date().toISOString(),
      });
    }
  };

  // Get available roles
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const authUrl = typeof window !== 'undefined' 
          ? (window as any).NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth'
          : '/api/proxy/auth';
        const token = typeof window !== 'undefined' ? localStorage.getItem('hit_token') : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${authUrl}/features`, { headers });
        if (response.ok) {
          const data = await response.json();
          const roles = data.features?.available_roles || ['admin', 'user'];
          setAvailableRoles(roles);
        } else {
          if (usersData?.items) {
            const roleSet = new Set<string>();
            usersData.items.forEach((user) => {
              const role = user.role || 'user';
              roleSet.add(role);
            });
            setAvailableRoles(Array.from(roleSet).sort());
          } else {
            setAvailableRoles(['admin', 'user']);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch available roles, using fallback:', error);
        if (usersData?.items) {
          const roleSet = new Set<string>();
          usersData.items.forEach((user) => {
            const role = user.role || 'user';
            roleSet.add(role);
          });
          setAvailableRoles(Array.from(roleSet).sort());
        } else {
          setAvailableRoles(['admin', 'user']);
        }
      }
    };
    
    fetchRoles();
  }, [usersData]);

  const roles = useMemo(() => {
    if (availableRoles.length > 0) {
      return availableRoles;
    }
    if (usersData?.items) {
      const roleSet = new Set<string>();
      usersData.items.forEach((user) => {
        const role = user.role || 'user';
        roleSet.add(role);
      });
      return Array.from(roleSet).sort();
    }
    return ['admin', 'user'];
  }, [availableRoles, usersData]);

  const [allPages, setAllPages] = useState<Array<{ path: string; label: string }>>([]);
  const [pagesLoading, setPagesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPagesLoading(true);
    loadGeneratedPages()
      .then((pages) => {
        if (cancelled) return;
        setAllPages(pages);
      })
      .finally(() => {
        if (cancelled) return;
        setPagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const navTree = useMemo(() => buildPathTree(allPages), [allPages]);
  const allPagePaths = useMemo(() => allPages.map((p) => p.path), [allPages]);

  // Build permission maps
  const rolePermissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (rolePermissions) {
      rolePermissions.forEach((perm) => {
        map.set(perm.page_path, perm.enabled);
      });
    }
    return map;
  }, [rolePermissions]);

  const groupPermissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (groupPermissions) {
      groupPermissions.forEach((perm) => {
        map.set(perm.page_path, perm.enabled);
      });
    }
    return map;
  }, [groupPermissions]);

  // Action definition + override maps
  const actionCatalog = useMemo(() => {
    // Prefer DB-backed definitions (so defaults match server evaluation).
    if (Array.isArray(actionDefs) && actionDefs.length > 0) return actionDefs;
    // Fall back to generated registry so the UI can still show "what exists".
    return generatedActions.map((a) => ({
      key: a.key,
      pack_name: a.packName || null,
      label: a.label || a.key,
      description: a.description || null,
      default_enabled: Boolean(a.defaultEnabled),
    }));
  }, [actionDefs, generatedActions]);

  const actionDefsByKey = useMemo(() => {
    const map = new Map<string, { default_enabled: boolean; label: string; pack_name: string | null; description: string | null }>();
    if (actionCatalog) {
      actionCatalog.forEach((a: any) => {
        map.set(a.key, {
          default_enabled: Boolean(a.default_enabled),
          label: a.label || a.key,
          pack_name: a.pack_name,
          description: a.description ?? null,
        });
      });
    }
    return map;
  }, [actionCatalog]);

  const allActions = useMemo(() => {
    const xs = Array.isArray(actionCatalog) ? [...(actionCatalog as any[])] : [];
    xs.sort((a, b) => a.key.localeCompare(b.key));
    return xs;
  }, [actionCatalog]);

  const roleActionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (roleActionPermissions) {
      roleActionPermissions.forEach((p) => map.set(p.action_key, p.enabled));
    }
    return map;
  }, [roleActionPermissions]);

  const groupActionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (groupActionPermissions) {
      groupActionPermissions.forEach((p) => map.set(p.action_key, p.enabled));
    }
    return map;
  }, [groupActionPermissions]);

  const userActionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (userActionOverrides) {
      userActionOverrides.forEach((p) => map.set(p.action_key, p.enabled));
    }
    return map;
  }, [userActionOverrides]);

  // Check permission with hierarchical logic
  const getEffectivePermission = (path: string, permissionMap: Map<string, boolean>, allPaths: string[]): boolean | null => {
    // Check if this path has an explicit permission
    if (permissionMap.has(path)) {
      return permissionMap.get(path)!;
    }

    // Check parent paths (walk up the tree)
    const pathParts = path.split('/').filter(p => p);
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = '/' + pathParts.slice(0, i).join('/');
      if (permissionMap.has(parentPath)) {
        const parentEnabled = permissionMap.get(parentPath)!;
        // If parent is disabled, this path is disabled
        if (!parentEnabled) {
          return false;
        }
        // If parent is enabled, check if there are any disabled children
        // If not, this path inherits enabled from parent
        const descendants = getDescendantPaths(parentPath, allPaths);
        const hasDisabledDescendant = descendants.some(descPath => {
          const descEnabled = permissionMap.get(descPath);
          return descEnabled === false;
        });
        // If no disabled descendants, inherit enabled
        if (!hasDisabledDescendant) {
          return true;
        }
      }
    }

    // No explicit permission found, default to enabled
    return null;
  };

  const toggleExpanded = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleGroupPermissionToggle = async (pagePath: string, enabled: boolean) => {
    if (!selectedGroup) return;
    try {
      if (enabled) {
        await setGroupPagePermission(selectedGroup, pagePath, true);
      } else {
        // When disabling, check if we need to disable children
        const descendants = getDescendantPaths(pagePath, allPagePaths);
        // Disable all descendants
        for (const descPath of descendants) {
          await setGroupPagePermission(selectedGroup, descPath, false);
        }
        await setGroupPagePermission(selectedGroup, pagePath, false);
      }
      refreshGroupPermissions();
    } catch (error) {
      console.error('Failed to update group permission:', error);
    }
  };

  const handleRolePermissionToggle = async (pagePath: string, enabled: boolean) => {
    if (!selectedRole) return;
    try {
      if (enabled) {
        await setRolePagePermission(selectedRole, pagePath, true);
      } else {
        // When disabling, check if we need to disable children
        const descendants = getDescendantPaths(pagePath, allPagePaths);
        // Disable all descendants
        for (const descPath of descendants) {
          await setRolePagePermission(selectedRole, descPath, false);
        }
        await setRolePagePermission(selectedRole, pagePath, false);
      }
      refreshRolePermissions();
    } catch (error) {
      console.error('Failed to update role permission:', error);
    }
  };

  const handleUserOverrideToggle = async (email: string, pagePath: string, enabled: boolean) => {
    try {
      if (enabled) {
        await setUserPageOverride(email, pagePath, true);
      } else {
        await setUserPageOverride(email, pagePath, false);
      }
      await Promise.all([
        refreshUserOverrides(),
        refreshUsersWithOverrides(),
      ]);
    } catch (error) {
      console.error('Failed to update user override:', error);
    }
  };

  const handleRoleActionToggle = async (actionKey: string, enabled: boolean) => {
    if (!selectedRole) return;
    try {
      const def = actionDefsByKey.get(actionKey);
      const defaultEnabled = def ? Boolean(def.default_enabled) : false;
      if (enabled === defaultEnabled) {
        await deleteRoleActionPermission(selectedRole, actionKey);
      } else {
        await setRoleActionPermission(selectedRole, actionKey, enabled);
      }
      refreshRoleActionPermissions();
    } catch (error) {
      console.error('Failed to update role action permission:', error);
    }
  };

  const handleGroupActionToggle = async (actionKey: string, enabled: boolean) => {
    if (!selectedGroup) return;
    try {
      const def = actionDefsByKey.get(actionKey);
      const defaultEnabled = def ? Boolean(def.default_enabled) : false;
      if (enabled === defaultEnabled) {
        await deleteGroupActionPermission(selectedGroup, actionKey);
      } else {
        await setGroupActionPermission(selectedGroup, actionKey, enabled);
      }
      refreshGroupActionPermissions();
    } catch (error) {
      console.error('Failed to update group action permission:', error);
    }
  };

  const handleUserActionToggle = async (email: string, actionKey: string, enabled: boolean) => {
    try {
      const def = actionDefsByKey.get(actionKey);
      const defaultEnabled = def ? Boolean(def.default_enabled) : false;
      if (enabled === defaultEnabled) {
        await deleteUserActionOverride(email, actionKey);
      } else {
        await setUserActionOverride(email, actionKey, enabled);
      }
      await Promise.all([
        refreshUserActionOverrides(),
        refreshUsersWithOverrides(),
      ]);
    } catch (error) {
      console.error('Failed to update user action override:', error);
    }
  };

  // Render tree node
  const renderTreeNode = (node: TreeNode, permissionMap: Map<string, boolean>, onToggle: (path: string, enabled: boolean) => void, disabled: boolean = false) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedPaths.has(node.path);
    const effectivePermission = getEffectivePermission(node.path, permissionMap, allPagePaths);
    const isEnabled = effectivePermission !== null ? effectivePermission : true;
    const isExplicit = permissionMap.has(node.path);

    return (
      <div key={node.path} className="select-none">
        <div
          className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
          style={{ paddingLeft: `${node.level * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.path)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-[24px]" />
          )}
          <div className="flex-1 flex items-center gap-2">
            {hasChildren ? (
              <Folder size={16} className="text-blue-500" />
            ) : (
              <File size={16} className="text-gray-400" />
            )}
            <span className="font-medium">{node.label}</span>
            <span className="text-xs text-gray-500">{node.path}</span>
            {isExplicit && (
              <Badge variant="info" className="text-xs">Explicit</Badge>
            )}
            {effectivePermission === null && (
              <Badge variant="default" className="text-xs">Default</Badge>
            )}
          </div>
          <Checkbox
            checked={isEnabled}
            onChange={(checked: boolean) => onToggle(node.path, checked)}
            disabled={disabled || mutatingPermissions || mutatingGroupPermissions}
          />
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, permissionMap, onToggle, disabled || !isEnabled))}
          </div>
        )}
      </div>
    );
  };

  const renderActionList = (
    permissionMap: Map<string, boolean>,
    onToggle: (actionKey: string, enabled: boolean) => void,
    disabled: boolean = false
  ) => {
    if (actionDefsLoading || generatedActionsLoading) return <Spinner />;
    if (!allActions.length) {
      return (
        <Alert variant="warning">
          No action definitions found. Feature packs can add `permissions.actions` to their `feature-pack.yaml`.
        </Alert>
      );
    }

    const syncBlocked = actionSyncStatus.state === 'error' || (Array.isArray(actionDefs) && actionDefs.length === 0);

    return (
      <div className="space-y-3">
        {generatedActions.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Action catalog: {Array.isArray(actionDefs) && actionDefs.length > 0 ? 'Synced' : 'Generated (not yet synced)'}
              {actionSyncStatus.at ? ` • Last: ${new Date(actionSyncStatus.at).toLocaleString()}` : ''}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={syncActionsNow}
              disabled={actionSyncStatus.state === 'syncing'}
            >
              {actionSyncStatus.state === 'syncing' ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        )}
        {actionSyncStatus.state === 'error' && (
          <Alert variant="warning" title="Action sync failed">
            {actionSyncStatus.error || 'Failed to sync action definitions into the auth module.'}
            <div className="mt-2 text-xs text-gray-500">
              Until this is fixed, action toggles are disabled because the backend won’t recognize the action keys.
            </div>
          </Alert>
        )}

      <div className="border rounded-lg divide-y bg-white dark:bg-gray-900">
        {allActions.map((a) => {
          const def = actionDefsByKey.get(a.key);
          const defaultEnabled = def ? Boolean(def.default_enabled) : false;
          const override = permissionMap.get(a.key);
          const effective = override !== undefined ? override : defaultEnabled;
          const isExplicit = override !== undefined;
          return (
            <div key={a.key} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{def?.label || a.key}</span>
                  <span className="text-xs text-gray-500 truncate">{a.key}</span>
                  {isExplicit ? (
                    <Badge variant="info" className="text-xs">Explicit</Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Default: {defaultEnabled ? 'Allow' : 'Deny'}
                    </Badge>
                  )}
                </div>
                {def?.description ? (
                  <div className="text-xs text-gray-500 mt-1">{def.description}</div>
                ) : null}
              </div>
              <Checkbox
                checked={effective}
                onChange={(checked: boolean) => onToggle(a.key, checked)}
                disabled={disabled || mutatingActionPermissions || syncBlocked}
              />
            </div>
          );
        })}
      </div>
      </div>
    );
  };

  return (
    <Page
      title="Permissions"
      description="Manage page access and action permissions using groups (preferred) or roles (fallback), with user-level overrides."
    >
      <Tabs
        activeTab={activeTab}
        onChange={(tabId: string) =>
          setActiveTab(tabId as 'groups' | 'roles' | 'users' | 'actions-groups' | 'actions-roles' | 'actions-users')
        }
        tabs={[
          {
            id: 'groups',
            label: 'Group Permissions',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Group</label>
                      {groupsLoading ? (
                        <Spinner />
                      ) : groups && groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {groups.map((group: Group) => (
                            <Button
                              key={group.id}
                              variant={selectedGroup === group.id ? 'primary' : 'ghost'}
                              onClick={() => setSelectedGroup(group.id)}
                            >
                              <Users size={16} className="mr-2" />
                              {group.name}
                              <Badge variant="default" className="ml-2">
                                {group.user_count}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Alert variant="warning">
                          No groups found. Create groups first to manage group-based permissions.
                        </Alert>
                      )}
                    </div>

                    {selectedGroup && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Page Permissions for Group: <Badge>{groups?.find(g => g.id === selectedGroup)?.name}</Badge>
                        </h3>
                        <div className="mb-4">
                          <Alert variant="info">
                            Groups take precedence over roles. If a user is in a group with permissions, those are used instead of role permissions.
                            Disabling a parent path automatically disables all child paths.
                          </Alert>
                        </div>

                        {pagesLoading || groupPermissionsLoading ? (
                          <Spinner />
                        ) : navTree.length === 0 ? (
                          <Alert variant="warning">
                            No pages found. Pages are discovered from generated route definitions.
                          </Alert>
                        ) : (
                          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                            {navTree.map(node => renderTreeNode(node, groupPermissionMap, handleGroupPermissionToggle))}
                          </div>
                        )}
                      </div>
                    )}

                    {!selectedGroup && groups && groups.length > 0 && (
                      <Alert variant="info">Select a group above to manage its page permissions.</Alert>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: 'roles',
            label: 'Role Permissions',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Role</label>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <Button
                            key={role}
                            variant={selectedRole === role ? 'primary' : 'ghost'}
                            onClick={() => setSelectedRole(role)}
                          >
                            <Shield size={16} className="mr-2" />
                            {role}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedRole && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Page Permissions for Role: <Badge>{selectedRole}</Badge>
                        </h3>
                        {selectedRole.toLowerCase() === 'admin' ? (
                          <div className="mb-4">
                            <Alert variant="warning">
                              Admin role permissions cannot be modified. Admin role always has full access to all pages.
                            </Alert>
                          </div>
                        ) : (
                          <>
                            <div className="mb-4">
                              <Alert variant="info">
                                Role permissions are used as a fallback when group permissions are not set.
                                Disabling a parent path automatically disables all child paths.
                              </Alert>
                            </div>

                        {pagesLoading || rolePermissionsLoading ? (
                              <Spinner />
                            ) : navTree.length === 0 ? (
                              <Alert variant="warning">
                            No pages found. Pages are discovered from generated route definitions.
                              </Alert>
                            ) : (
                              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                                {navTree.map(node => renderTreeNode(node, rolePermissionMap, handleRolePermissionToggle, selectedRole.toLowerCase() === 'admin'))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {!selectedRole && (
                      <Alert variant="info">Select a role above to manage its page permissions.</Alert>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: 'users',
            label: 'User Overrides',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Users with Overrides</h3>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setUserOverrideModalOpen(true);
                        }}
                      >
                        <Users size={16} className="mr-2" />
                        Add User Override
                      </Button>
                    </div>

                    {usersWithOverridesLoading ? (
                      <Spinner />
                    ) : (
                      <div className="space-y-2">
                        {(usersWithOverrides || []).map((user: any) => (
                          <div
                            key={user.email}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            onClick={() => {
                              setSelectedUser(user.email);
                              const foundUser = usersData?.items.find((u) => u.email === user.email);
                              if (foundUser) {
                                setSelectedUserForOverride(foundUser);
                              }
                            }}
                          >
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-gray-500">
                                Role: {user.role} • {user.override_count} override{user.override_count === 1 ? '' : 's'}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </div>
                        ))}
                        {(!usersWithOverrides || usersWithOverrides.length === 0) && (
                          <Alert variant="info">No users with overrides</Alert>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {selectedUser && selectedUserForOverride && (
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Page Overrides for: <Badge>{selectedUserForOverride.email}</Badge>
                          <span className="ml-2 text-sm text-gray-500">
                            (Role: {selectedUserForOverride.role || 'user'})
                          </span>
                        </h3>
                        <Button variant="ghost" onClick={() => {
                          setSelectedUser('');
                          setSelectedUserForOverride(null);
                        }}>
                          Close
                        </Button>
                      </div>
                      {selectedUserForOverride.role?.toLowerCase() === 'admin' ? (
                        <div className="mb-4">
                          <Alert variant="warning">
                            Admin user overrides cannot be modified. Admin users always have full access to all pages.
                          </Alert>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <Alert variant="info">
                            User overrides take precedence over both group and role permissions.
                          </Alert>
                        </div>
                      )}

                      {pagesLoading || userOverridesLoading ? (
                        <Spinner />
                      ) : (
                        <div className="space-y-2">
                          {allPages.length === 0 ? (
                            <Alert variant="warning">
                              No pages found. Pages are discovered from generated route definitions.
                            </Alert>
                          ) : (
                            allPages.map((page) => {
                              const override = userOverrides?.find((o) => o.page_path === page.path);
                              const isEnabled = override ? override.enabled : undefined;
                              return (
                                <div
                                  key={page.path}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <div>
                                    <div className="font-medium">{page.label || page.path}</div>
                                    <div className="text-sm text-gray-500">{page.path}</div>
                                    {isEnabled === undefined && (
                                      <div className="text-xs text-gray-400 mt-1">Using group/role default</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isEnabled ?? true}
                                      onChange={(checked: boolean) => handleUserOverrideToggle(selectedUser, page.path, checked)}
                                      disabled={mutatingPermissions || selectedUserForOverride.role?.toLowerCase() === 'admin'}
                                    />
                                    {isEnabled !== undefined && selectedUserForOverride.role?.toLowerCase() !== 'admin' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            await deleteUserPageOverride(selectedUser, page.path);
                                            refreshUserOverrides();
                                            refreshUsersWithOverrides();
                                          } catch (error) {
                                            console.error('Failed to delete override:', error);
                                          }
                                        }}
                                      >
                                        Reset
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            id: 'actions-groups',
            label: 'Group Actions',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Group</label>
                      {groupsLoading ? (
                        <Spinner />
                      ) : groups && groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {groups.map((group: Group) => (
                            <Button
                              key={group.id}
                              variant={selectedGroup === group.id ? 'primary' : 'ghost'}
                              onClick={() => setSelectedGroup(group.id)}
                            >
                              <Users size={16} className="mr-2" />
                              {group.name}
                              <Badge variant="default" className="ml-2">
                                {group.user_count}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Alert variant="warning">
                          No groups found. Create groups first to manage group-based action permissions.
                        </Alert>
                      )}
                    </div>

                    {selectedGroup && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Action Permissions for Group: <Badge>{groups?.find(g => g.id === selectedGroup)?.name}</Badge>
                        </h3>
                        <div className="mb-4">
                          <Alert variant="info">
                            Group action permissions take precedence over role action permissions. If a user is in a group with an explicit action override, that wins.
                          </Alert>
                        </div>
                        {groupActionPermissionsLoading ? (
                          <Spinner />
                        ) : (
                          renderActionList(groupActionMap, handleGroupActionToggle)
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: 'actions-roles',
            label: 'Role Actions',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Role</label>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <Button
                            key={role}
                            variant={selectedRole === role ? 'primary' : 'ghost'}
                            onClick={() => setSelectedRole(role)}
                          >
                            <Shield size={16} className="mr-2" />
                            {role}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedRole && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">
                          Action Permissions for Role: <Badge>{selectedRole}</Badge>
                        </h3>
                        {selectedRole.toLowerCase() === 'admin' ? (
                          <div className="mb-4">
                            <Alert variant="warning">
                              Admin role action permissions cannot be modified. Admin always has full access.
                            </Alert>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <Alert variant="info">
                              Role action permissions apply when there is no user override and no group override.
                            </Alert>
                          </div>
                        )}

                        {roleActionPermissionsLoading ? (
                          <Spinner />
                        ) : (
                          renderActionList(
                            roleActionMap,
                            handleRoleActionToggle,
                            selectedRole.toLowerCase() === 'admin'
                          )
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: 'actions-users',
            label: 'User Actions',
            content: (
              <div className="space-y-4 mt-4">
                <Card>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Select a user</div>
                        <div className="text-sm text-gray-500">User action overrides take highest precedence.</div>
                      </div>
                    </div>

                    {usersLoading ? (
                      <Spinner />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(usersData?.items || []).map((u) => (
                          <div
                            key={u.email}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            onClick={() => {
                              setSelectedUser(u.email);
                              setSelectedUserForOverride(u);
                            }}
                          >
                            <div>
                              <div className="font-medium">{u.email}</div>
                              <div className="text-sm text-gray-500">Role: {u.role || 'user'}</div>
                            </div>
                            <Button variant="ghost" size="sm">
                              Select
                            </Button>
                          </div>
                        ))}
                        {(!usersData?.items || usersData.items.length === 0) && (
                          <Alert variant="info">No users found</Alert>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {selectedUser && selectedUserForOverride && (
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Action Overrides for: <Badge>{selectedUserForOverride.email}</Badge>
                          <span className="ml-2 text-sm text-gray-500">
                            (Role: {selectedUserForOverride.role || 'user'})
                          </span>
                        </h3>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser('');
                            setSelectedUserForOverride(null);
                          }}
                        >
                          Close
                        </Button>
                      </div>

                      {selectedUserForOverride.role?.toLowerCase() === 'admin' ? (
                        <div className="mb-4">
                          <Alert variant="warning">
                            Admin user action overrides cannot be modified. Admin users always have full access.
                          </Alert>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <Alert variant="info">
                            User action overrides take precedence over both group and role action permissions.
                          </Alert>
                        </div>
                      )}

                      {userActionOverridesLoading ? (
                        <Spinner />
                      ) : (
                        renderActionList(
                          userActionMap,
                          (actionKey, enabled) => handleUserActionToggle(selectedUser, actionKey, enabled),
                          selectedUserForOverride.role?.toLowerCase() === 'admin'
                        )
                      )}
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Add User Override Modal */}
      <Modal
        open={userOverrideModalOpen}
        onClose={() => setUserOverrideModalOpen(false)}
        title="Add User Override"
        description="Select a user to add page-specific overrides"
      >
        <div className="space-y-4">
          {usersLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(usersData?.items || []).map((user) => (
                <div
                  key={user.email}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => {
                    setSelectedUserForOverride(user);
                    setSelectedUser(user.email);
                    setUserOverrideModalOpen(false);
                    setActiveTab('users');
                  }}
                >
                  <div>
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-gray-500">Role: {user.role || 'user'}</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Select
                  </Button>
                </div>
              ))}
              {(!usersData?.items || usersData.items.length === 0) && (
                <Alert variant="info">No users found</Alert>
              )}
            </div>
          )}
        </div>
      </Modal>
    </Page>
  );
}

export default Permissions;



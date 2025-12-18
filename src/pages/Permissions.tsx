'use client';

import React, { useState, useMemo } from 'react';
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
  type User,
  type Group,
} from '../hooks/useAuthAdmin';

interface PermissionsProps {
  onNavigate?: (path: string) => void;
}

interface NavItem {
  id?: string;
  label: string;
  path?: string;
  icon?: string;
  children?: NavItem[];
  [key: string]: any;
}

interface TreeNode {
  path: string;
  label: string;
  icon?: string;
  children: TreeNode[];
  level: number;
}

// Build tree structure from navigation items
function buildNavTree(navItems: NavItem[]): TreeNode[] {
  const tree: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  function processItem(item: NavItem, parentPath: string = '', level: number = 0): void {
    // Skip admin pages and auth pages
    if (item.path?.startsWith('/admin') || item.path?.startsWith('/auth') || item.path?.startsWith('/login')) {
      return;
    }

    // Skip items that require admin role
    if (item.roles && item.roles.includes('admin')) {
      return;
    }

    const currentPath = item.path || parentPath;
    if (!currentPath || currentPath === '/') {
      // Process children without adding parent
      if (item.children) {
        item.children.forEach(child => processItem(child, parentPath, level));
      }
      return;
    }

    // Check if node already exists
    let node = pathMap.get(currentPath);
    if (!node) {
      node = {
        path: currentPath,
        label: item.label || currentPath,
        icon: item.icon,
        children: [],
        level,
      };
      pathMap.set(currentPath, node);

      // Add to tree or parent's children
      if (parentPath && pathMap.has(parentPath)) {
        pathMap.get(parentPath)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    // Process children
    if (item.children) {
      item.children.forEach(child => processItem(child, currentPath, level + 1));
    }
  }

  navItems.forEach(item => processItem(item));

  // Sort tree recursively
  function sortTree(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    nodes.forEach(node => sortTree(node.children));
  }
  sortTree(tree);

  return tree;
}

// Get all pages from navigation items
function getAllPages(): Array<{ path: string; label: string }> {
  if (typeof window === 'undefined') return [];
  
  try {
    const nav = require('@/.hit/generated/nav');
    const navItems = nav.featurePackNav || [];
    
    const pages: Array<{ path: string; label: string }> = [];
    
    function extractPages(items: any[], parentPath = '') {
      for (const item of items) {
        if (item.path?.startsWith('/admin') || item.path?.startsWith('/auth') || item.path?.startsWith('/login')) {
          continue;
        }
        if (item.roles && item.roles.includes('admin')) {
          continue;
        }
        if (item.path && item.path !== '/') {
          pages.push({
            path: item.path,
            label: item.label || item.path,
          });
        }
        if (item.children && Array.isArray(item.children)) {
          extractPages(item.children, item.path || '');
        }
      }
    }
    
    extractPages(navItems);
    
    try {
      const customNav = require('@/lib/custom-nav');
      if (customNav.customNavItems) {
        extractPages(customNav.customNavItems);
      }
    } catch {
      // Custom nav not available
    }
    
    const uniquePages = Array.from(
      new Map(pages.map((p) => [p.path, p])).values()
    );
    
    return uniquePages.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.warn('Could not load navigation items:', error);
    return [];
  }
}

// Get navigation tree
function getNavTree(): TreeNode[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const nav = require('@/.hit/generated/nav');
    const navItems = nav.featurePackNav || [];
    
    try {
      const customNav = require('@/lib/custom-nav');
      if (customNav.customNavItems) {
        navItems.push(...customNav.customNavItems);
      }
    } catch {
      // Custom nav not available
    }
    
    return buildNavTree(navItems);
  } catch (error) {
    console.warn('Could not load navigation items:', error);
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
  const [activeTab, setActiveTab] = useState<'groups' | 'roles' | 'users'>('groups');
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

  const navTree = useMemo(() => getNavTree(), []);
  const allPages = useMemo(() => getAllPages(), []);
  const allPagePaths = useMemo(() => allPages.map(p => p.path), [allPages]);

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

  return (
    <Page
      title="Permissions"
      description="Manage page access permissions using groups (preferred) or roles (fallback)"
    >
      <Tabs
        activeTab={activeTab}
        onChange={(tabId: string) => setActiveTab(tabId as 'groups' | 'roles' | 'users')}
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

                        {groupPermissionsLoading ? (
                          <Spinner />
                        ) : navTree.length === 0 ? (
                          <Alert variant="warning">
                            No pages found. Pages are discovered from navigation items.
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

                            {rolePermissionsLoading ? (
                              <Spinner />
                            ) : navTree.length === 0 ? (
                              <Alert variant="warning">
                                No pages found. Pages are discovered from navigation items.
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

                      {userOverridesLoading ? (
                        <Spinner />
                      ) : (
                        <div className="space-y-2">
                          {allPages.length === 0 ? (
                            <Alert variant="warning">
                              No pages found. Pages are discovered from navigation items.
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



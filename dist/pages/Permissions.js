'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Shield, Users, ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useUsers, useRolePagePermissions, useUserPageOverrides, useUsersWithOverrides, usePagePermissionsMutations, useGroups, useGroupPagePermissions, useGroupPagePermissionsMutations, } from '../hooks/useAuthAdmin';
// Build tree structure from navigation items
function buildNavTree(navItems) {
    const tree = [];
    const pathMap = new Map();
    function processItem(item, parentPath = '', level = 0) {
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
                pathMap.get(parentPath).children.push(node);
            }
            else {
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
    function sortTree(nodes) {
        nodes.sort((a, b) => a.label.localeCompare(b.label));
        nodes.forEach(node => sortTree(node.children));
    }
    sortTree(tree);
    return tree;
}
// Get all pages from navigation items
function getAllPages() {
    if (typeof window === 'undefined')
        return [];
    try {
        const nav = require('@/.hit/generated/nav');
        const navItems = nav.featurePackNav || [];
        const pages = [];
        function extractPages(items, parentPath = '') {
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
        }
        catch {
            // Custom nav not available
        }
        const uniquePages = Array.from(new Map(pages.map((p) => [p.path, p])).values());
        return uniquePages.sort((a, b) => a.path.localeCompare(b.path));
    }
    catch (error) {
        console.warn('Could not load navigation items:', error);
        return [];
    }
}
// Get navigation tree
function getNavTree() {
    if (typeof window === 'undefined')
        return [];
    try {
        const nav = require('@/.hit/generated/nav');
        const navItems = nav.featurePackNav || [];
        try {
            const customNav = require('@/lib/custom-nav');
            if (customNav.customNavItems) {
                navItems.push(...customNav.customNavItems);
            }
        }
        catch {
            // Custom nav not available
        }
        return buildNavTree(navItems);
    }
    catch (error) {
        console.warn('Could not load navigation items:', error);
        return [];
    }
}
// Check if a path is a parent of another path
function isParentPath(parentPath, childPath) {
    if (!childPath.startsWith(parentPath))
        return false;
    // Exact match is not a parent
    if (parentPath === childPath)
        return false;
    // Check if the next character after parent path is a slash
    return childPath[parentPath.length] === '/';
}
// Get all descendant paths
function getDescendantPaths(path, allPaths) {
    return allPaths.filter(p => isParentPath(path, p));
}
export function Permissions({ onNavigate }) {
    const { Page, Card, Button, Badge, Modal, Alert, Spinner, Tabs, Checkbox } = useUi();
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [activeTab, setActiveTab] = useState('groups');
    const [userOverrideModalOpen, setUserOverrideModalOpen] = useState(false);
    const [selectedUserForOverride, setSelectedUserForOverride] = useState(null);
    const [expandedPaths, setExpandedPaths] = useState(new Set());
    const { data: usersData, loading: usersLoading } = useUsers({ pageSize: 1000 });
    const { data: groups, loading: groupsLoading } = useGroups();
    const { data: rolePermissions, loading: rolePermissionsLoading, refresh: refreshRolePermissions } = useRolePagePermissions(selectedRole);
    const { data: groupPermissions, loading: groupPermissionsLoading, refresh: refreshGroupPermissions } = useGroupPagePermissions(selectedGroup);
    const { data: userOverrides, loading: userOverridesLoading, refresh: refreshUserOverrides } = useUserPageOverrides(selectedUser);
    const { data: usersWithOverrides, loading: usersWithOverridesLoading, refresh: refreshUsersWithOverrides } = useUsersWithOverrides();
    const { setRolePagePermission, deleteRolePagePermission, setUserPageOverride, deleteUserPageOverride, loading: mutatingPermissions, } = usePagePermissionsMutations();
    const { setGroupPagePermission, deleteGroupPagePermission, loading: mutatingGroupPermissions, } = useGroupPagePermissionsMutations();
    // Get available roles
    const [availableRoles, setAvailableRoles] = useState([]);
    React.useEffect(() => {
        const fetchRoles = async () => {
            try {
                const authUrl = typeof window !== 'undefined'
                    ? window.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth'
                    : '/api/proxy/auth';
                const token = typeof window !== 'undefined' ? localStorage.getItem('hit_token') : null;
                const headers = {
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
                }
                else {
                    if (usersData?.items) {
                        const roleSet = new Set();
                        usersData.items.forEach((user) => {
                            const role = user.role || 'user';
                            roleSet.add(role);
                        });
                        setAvailableRoles(Array.from(roleSet).sort());
                    }
                    else {
                        setAvailableRoles(['admin', 'user']);
                    }
                }
            }
            catch (error) {
                console.warn('Failed to fetch available roles, using fallback:', error);
                if (usersData?.items) {
                    const roleSet = new Set();
                    usersData.items.forEach((user) => {
                        const role = user.role || 'user';
                        roleSet.add(role);
                    });
                    setAvailableRoles(Array.from(roleSet).sort());
                }
                else {
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
            const roleSet = new Set();
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
        const map = new Map();
        if (rolePermissions) {
            rolePermissions.forEach((perm) => {
                map.set(perm.page_path, perm.enabled);
            });
        }
        return map;
    }, [rolePermissions]);
    const groupPermissionMap = useMemo(() => {
        const map = new Map();
        if (groupPermissions) {
            groupPermissions.forEach((perm) => {
                map.set(perm.page_path, perm.enabled);
            });
        }
        return map;
    }, [groupPermissions]);
    // Check permission with hierarchical logic
    const getEffectivePermission = (path, permissionMap, allPaths) => {
        // Check if this path has an explicit permission
        if (permissionMap.has(path)) {
            return permissionMap.get(path);
        }
        // Check parent paths (walk up the tree)
        const pathParts = path.split('/').filter(p => p);
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = '/' + pathParts.slice(0, i).join('/');
            if (permissionMap.has(parentPath)) {
                const parentEnabled = permissionMap.get(parentPath);
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
    const toggleExpanded = (path) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            }
            else {
                next.add(path);
            }
            return next;
        });
    };
    const handleGroupPermissionToggle = async (pagePath, enabled) => {
        if (!selectedGroup)
            return;
        try {
            if (enabled) {
                await setGroupPagePermission(selectedGroup, pagePath, true);
            }
            else {
                // When disabling, check if we need to disable children
                const descendants = getDescendantPaths(pagePath, allPagePaths);
                // Disable all descendants
                for (const descPath of descendants) {
                    await setGroupPagePermission(selectedGroup, descPath, false);
                }
                await setGroupPagePermission(selectedGroup, pagePath, false);
            }
            refreshGroupPermissions();
        }
        catch (error) {
            console.error('Failed to update group permission:', error);
        }
    };
    const handleRolePermissionToggle = async (pagePath, enabled) => {
        if (!selectedRole)
            return;
        try {
            if (enabled) {
                await setRolePagePermission(selectedRole, pagePath, true);
            }
            else {
                // When disabling, check if we need to disable children
                const descendants = getDescendantPaths(pagePath, allPagePaths);
                // Disable all descendants
                for (const descPath of descendants) {
                    await setRolePagePermission(selectedRole, descPath, false);
                }
                await setRolePagePermission(selectedRole, pagePath, false);
            }
            refreshRolePermissions();
        }
        catch (error) {
            console.error('Failed to update role permission:', error);
        }
    };
    const handleUserOverrideToggle = async (email, pagePath, enabled) => {
        try {
            if (enabled) {
                await setUserPageOverride(email, pagePath, true);
            }
            else {
                await setUserPageOverride(email, pagePath, false);
            }
            await Promise.all([
                refreshUserOverrides(),
                refreshUsersWithOverrides(),
            ]);
        }
        catch (error) {
            console.error('Failed to update user override:', error);
        }
    };
    // Render tree node
    const renderTreeNode = (node, permissionMap, onToggle, disabled = false) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedPaths.has(node.path);
        const effectivePermission = getEffectivePermission(node.path, permissionMap, allPagePaths);
        const isEnabled = effectivePermission !== null ? effectivePermission : true;
        const isExplicit = permissionMap.has(node.path);
        return (_jsxs("div", { className: "select-none", children: [_jsxs("div", { className: "flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded", style: { paddingLeft: `${node.level * 20 + 8}px` }, children: [hasChildren ? (_jsx("button", { onClick: () => toggleExpanded(node.path), className: "p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded", children: isExpanded ? (_jsx(ChevronDown, { size: 16, className: "text-gray-500" })) : (_jsx(ChevronRight, { size: 16, className: "text-gray-500" })) })) : (_jsx("div", { className: "w-[24px]" })), _jsxs("div", { className: "flex-1 flex items-center gap-2", children: [hasChildren ? (_jsx(Folder, { size: 16, className: "text-blue-500" })) : (_jsx(File, { size: 16, className: "text-gray-400" })), _jsx("span", { className: "font-medium", children: node.label }), _jsx("span", { className: "text-xs text-gray-500", children: node.path }), isExplicit && (_jsx(Badge, { variant: "info", className: "text-xs", children: "Explicit" })), effectivePermission === null && (_jsx(Badge, { variant: "default", className: "text-xs", children: "Default" }))] }), _jsx(Checkbox, { checked: isEnabled, onChange: (checked) => onToggle(node.path, checked), disabled: disabled || mutatingPermissions || mutatingGroupPermissions })] }), hasChildren && isExpanded && (_jsx("div", { children: node.children.map(child => renderTreeNode(child, permissionMap, onToggle, disabled || !isEnabled)) }))] }, node.path));
    };
    return (_jsxs(Page, { title: "Permissions", description: "Manage page access permissions using groups (preferred) or roles (fallback)", children: [_jsx(Tabs, { activeTab: activeTab, onChange: (tabId) => setActiveTab(tabId), tabs: [
                    {
                        id: 'groups',
                        label: 'Group Permissions',
                        content: (_jsx("div", { className: "space-y-4 mt-4", children: _jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Select Group" }), groupsLoading ? (_jsx(Spinner, {})) : groups && groups.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: groups.map((group) => (_jsxs(Button, { variant: selectedGroup === group.id ? 'primary' : 'ghost', onClick: () => setSelectedGroup(group.id), children: [_jsx(Users, { size: 16, className: "mr-2" }), group.name, _jsx(Badge, { variant: "default", className: "ml-2", children: group.user_count })] }, group.id))) })) : (_jsx(Alert, { variant: "warning", children: "No groups found. Create groups first to manage group-based permissions." }))] }), selectedGroup && (_jsxs("div", { className: "mt-4", children: [_jsxs("h3", { className: "text-lg font-semibold mb-2", children: ["Page Permissions for Group: ", _jsx(Badge, { children: groups?.find(g => g.id === selectedGroup)?.name })] }), _jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "info", children: "Groups take precedence over roles. If a user is in a group with permissions, those are used instead of role permissions. Disabling a parent path automatically disables all child paths." }) }), groupPermissionsLoading ? (_jsx(Spinner, {})) : navTree.length === 0 ? (_jsx(Alert, { variant: "warning", children: "No pages found. Pages are discovered from navigation items." })) : (_jsx("div", { className: "border rounded-lg p-4 bg-gray-50 dark:bg-gray-900", children: navTree.map(node => renderTreeNode(node, groupPermissionMap, handleGroupPermissionToggle)) }))] })), !selectedGroup && groups && groups.length > 0 && (_jsx(Alert, { variant: "info", children: "Select a group above to manage its page permissions." }))] }) }) })),
                    },
                    {
                        id: 'roles',
                        label: 'Role Permissions',
                        content: (_jsx("div", { className: "space-y-4 mt-4", children: _jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Select Role" }), _jsx("div", { className: "flex flex-wrap gap-2", children: roles.map((role) => (_jsxs(Button, { variant: selectedRole === role ? 'primary' : 'ghost', onClick: () => setSelectedRole(role), children: [_jsx(Shield, { size: 16, className: "mr-2" }), role] }, role))) })] }), selectedRole && (_jsxs("div", { className: "mt-4", children: [_jsxs("h3", { className: "text-lg font-semibold mb-2", children: ["Page Permissions for Role: ", _jsx(Badge, { children: selectedRole })] }), selectedRole.toLowerCase() === 'admin' ? (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "warning", children: "Admin role permissions cannot be modified. Admin role always has full access to all pages." }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "info", children: "Role permissions are used as a fallback when group permissions are not set. Disabling a parent path automatically disables all child paths." }) }), rolePermissionsLoading ? (_jsx(Spinner, {})) : navTree.length === 0 ? (_jsx(Alert, { variant: "warning", children: "No pages found. Pages are discovered from navigation items." })) : (_jsx("div", { className: "border rounded-lg p-4 bg-gray-50 dark:bg-gray-900", children: navTree.map(node => renderTreeNode(node, rolePermissionMap, handleRolePermissionToggle, selectedRole.toLowerCase() === 'admin')) }))] }))] })), !selectedRole && (_jsx(Alert, { variant: "info", children: "Select a role above to manage its page permissions." }))] }) }) })),
                    },
                    {
                        id: 'users',
                        label: 'User Overrides',
                        content: (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Users with Overrides" }), _jsxs(Button, { variant: "primary", onClick: () => {
                                                            setUserOverrideModalOpen(true);
                                                        }, children: [_jsx(Users, { size: 16, className: "mr-2" }), "Add User Override"] })] }), usersWithOverridesLoading ? (_jsx(Spinner, {})) : (_jsxs("div", { className: "space-y-2", children: [(usersWithOverrides || []).map((user) => (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer", onClick: () => {
                                                            setSelectedUser(user.email);
                                                            const foundUser = usersData?.items.find((u) => u.email === user.email);
                                                            if (foundUser) {
                                                                setSelectedUserForOverride(foundUser);
                                                            }
                                                        }, children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: user.email }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Role: ", user.role, " \u2022 ", user.override_count, " override", user.override_count === 1 ? '' : 's'] })] }), _jsx(Button, { variant: "ghost", size: "sm", children: "View" })] }, user.email))), (!usersWithOverrides || usersWithOverrides.length === 0) && (_jsx(Alert, { variant: "info", children: "No users with overrides" }))] }))] }) }), selectedUser && selectedUserForOverride && (_jsx(Card, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h3", { className: "text-lg font-semibold", children: ["Page Overrides for: ", _jsx(Badge, { children: selectedUserForOverride.email }), _jsxs("span", { className: "ml-2 text-sm text-gray-500", children: ["(Role: ", selectedUserForOverride.role || 'user', ")"] })] }), _jsx(Button, { variant: "ghost", onClick: () => {
                                                            setSelectedUser('');
                                                            setSelectedUserForOverride(null);
                                                        }, children: "Close" })] }), selectedUserForOverride.role?.toLowerCase() === 'admin' ? (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "warning", children: "Admin user overrides cannot be modified. Admin users always have full access to all pages." }) })) : (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "info", children: "User overrides take precedence over both group and role permissions." }) })), userOverridesLoading ? (_jsx(Spinner, {})) : (_jsx("div", { className: "space-y-2", children: allPages.length === 0 ? (_jsx(Alert, { variant: "warning", children: "No pages found. Pages are discovered from navigation items." })) : (allPages.map((page) => {
                                                    const override = userOverrides?.find((o) => o.page_path === page.path);
                                                    const isEnabled = override ? override.enabled : undefined;
                                                    return (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: page.label || page.path }), _jsx("div", { className: "text-sm text-gray-500", children: page.path }), isEnabled === undefined && (_jsx("div", { className: "text-xs text-gray-400 mt-1", children: "Using group/role default" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { checked: isEnabled ?? true, onChange: (checked) => handleUserOverrideToggle(selectedUser, page.path, checked), disabled: mutatingPermissions || selectedUserForOverride.role?.toLowerCase() === 'admin' }), isEnabled !== undefined && selectedUserForOverride.role?.toLowerCase() !== 'admin' && (_jsx(Button, { variant: "ghost", size: "sm", onClick: async () => {
                                                                            try {
                                                                                await deleteUserPageOverride(selectedUser, page.path);
                                                                                refreshUserOverrides();
                                                                                refreshUsersWithOverrides();
                                                                            }
                                                                            catch (error) {
                                                                                console.error('Failed to delete override:', error);
                                                                            }
                                                                        }, children: "Reset" }))] })] }, page.path));
                                                })) }))] }) }))] })),
                    },
                ] }), _jsx(Modal, { open: userOverrideModalOpen, onClose: () => setUserOverrideModalOpen(false), title: "Add User Override", description: "Select a user to add page-specific overrides", children: _jsx("div", { className: "space-y-4", children: usersLoading ? (_jsx(Spinner, {})) : (_jsxs("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: [(usersData?.items || []).map((user) => (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer", onClick: () => {
                                    setSelectedUserForOverride(user);
                                    setSelectedUser(user.email);
                                    setUserOverrideModalOpen(false);
                                    setActiveTab('users');
                                }, children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: user.email }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Role: ", user.role || 'user'] })] }), _jsx(Button, { variant: "ghost", size: "sm", children: "Select" })] }, user.email))), (!usersData?.items || usersData.items.length === 0) && (_jsx(Alert, { variant: "info", children: "No users found" }))] })) }) })] }));
}
export default Permissions;
//# sourceMappingURL=Permissions.js.map
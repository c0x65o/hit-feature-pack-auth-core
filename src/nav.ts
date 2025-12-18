/**
 * Navigation configuration for auth-core feature pack
 */

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  showWhen?: 'authenticated' | 'unauthenticated' | 'always';
  roles?: string[];
  children?: Omit<NavItem, 'id'>[];
}

export const nav: NavItem[] = [
  {
    id: 'login',
    label: 'Login',
    path: '/login',
    icon: 'log-in',
    showWhen: 'unauthenticated',
  },
  {
    id: 'signup',
    label: 'Sign Up',
    path: '/signup',
    icon: 'user-plus',
    showWhen: 'unauthenticated',
  },
  {
    id: 'admin',
    label: 'Admin',
    path: '/admin',
    icon: 'shield',
    roles: ['admin'],
    showWhen: 'authenticated',
    children: [
      { label: 'Dashboard', path: '/admin', icon: 'layout-dashboard' },
      { label: 'Users', path: '/admin/users', icon: 'users' },
      { label: 'Groups', path: '/admin/groups', icon: 'users-round' },
      { label: 'Permissions', path: '/admin/permissions', icon: 'shield' },
      { label: 'Sessions', path: '/admin/sessions', icon: 'key' },
      { label: 'Audit Log', path: '/admin/audit-log', icon: 'file-text' },
      { label: 'Invites', path: '/admin/invites', icon: 'mail' },
    ],
  },
];

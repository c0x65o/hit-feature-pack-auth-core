/**
 * Navigation configuration for auth-core feature pack
 */

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  showWhen?: 'authenticated' | 'unauthenticated' | 'always';
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
];

/**
 * Navigation contributions for auth-core feature pack
 */

import type { NavContribution } from '@hit/feature-pack-types';

export const navContributions: NavContribution[] = [
  {
    id: 'auth.login',
    label: 'Login',
    path: '/login',
    slots: ['topbar.right'],
    permissions: ['!authenticated'], // Show only when not logged in
    order: 100,
    icon: 'log-in',
  },
  {
    id: 'auth.signup',
    label: 'Sign Up',
    path: '/signup',
    slots: ['topbar.right'],
    permissions: ['!authenticated'],
    order: 110,
    icon: 'user-plus',
  },
];

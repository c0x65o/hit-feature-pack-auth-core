/**
 * Navigation configuration for auth-core feature pack
 */
export const nav = [
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
//# sourceMappingURL=nav.js.map
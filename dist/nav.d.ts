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
export declare const nav: NavItem[];
//# sourceMappingURL=nav.d.ts.map
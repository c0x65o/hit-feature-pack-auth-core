/**
 * TOTP 2FA Setup Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_2fa_setup?: boolean;
  show_2fa_methods?: string[];
  show_recovery_codes?: boolean;
}

export async function totpSetup(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  const authUrl = ctx.moduleUrls.auth;

  if (!options.show_2fa_setup) {
    return {
      type: 'Page',
      children: [
        {
          type: 'Alert',
          variant: 'error',
          title: '2FA setup is not available',
          message: '2FA is not enabled for this account',
        },
      ],
    };
  }

  const children: UISpec[] = [];

  // Title
  children.push({
    type: 'Text',
    content: 'Set up Two-Factor Authentication',
    variant: 'h2',
    className: 'mb-6',
  });

  // Description
  children.push({
    type: 'Text',
    content: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
    variant: 'body',
    className: 'mb-8 text-muted-foreground',
  });

  // Setup instructions
  children.push({
    type: 'Text',
    content: '1. Click the button below to generate a QR code',
    variant: 'body',
    className: 'mb-2',
  });

  children.push({
    type: 'Text',
    content: '2. Scan the QR code with your authenticator app',
    variant: 'body',
    className: 'mb-2',
  });

  children.push({
    type: 'Text',
    content: '3. Enter the 6-digit code from your app to enable 2FA',
    variant: 'body',
    className: 'mb-6',
  });

  // Note: For simplicity, using a Page structure similar to login
  // Real implementation would use state management or multi-step form
  children.push({
    type: 'Text',
    content: 'Setup flow requires API integration',
    variant: 'muted',
    className: 'mb-4 text-center',
  });

  children.push({
    type: 'Link',
    label: 'Back to Security Settings',
    href: '/settings/security',
  });

  return {
    type: 'Page',
    className: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900',
    children: [
      {
        type: 'Card',
        className: 'w-full max-w-md p-8',
        children,
      },
    ],
  };
}

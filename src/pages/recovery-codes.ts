/**
 * Recovery Codes Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_recovery_codes?: boolean;
}

export async function recoveryCodes(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  const authUrl = ctx.moduleUrls.auth;

  if (!options.show_recovery_codes) {
    return {
      type: 'Page',
      children: [
        {
          type: 'Alert',
          variant: 'error',
          title: 'Recovery codes are not available',
          message: 'Recovery codes are not enabled',
        },
      ],
    };
  }

  const children: UISpec[] = [];

  // Warning
  children.push({
    type: 'Alert',
    variant: 'warning',
    title: 'Save these codes securely',
    message: 'These codes can be used to access your account if you lose access to your authenticator app. Each code can only be used once.',
  });

  // Info text
  children.push({
    type: 'Text',
    content: 'Click the button below to generate new recovery codes. This will invalidate any previously generated codes.',
    variant: 'body',
    className: 'mt-4 mb-6',
  });

  // Link to API endpoint (simplified UI)
  children.push({
    type: 'Link',
    label: 'View API Documentation',
    href: '/docs',
  });

  return {
    type: 'Page',
    title: 'Recovery Codes',
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

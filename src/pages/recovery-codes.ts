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
      type: 'Container',
      children: [
        {
          type: 'Text',
          content: 'Recovery codes are not available',
          variant: 'h2',
        },
      ],
    };
  }

  const children: UISpec[] = [];

  // Title
  children.push({
    type: 'Text',
    content: 'Recovery Codes',
    variant: 'h2',
    className: 'mb-6',
  });

  // Warning
  children.push({
    type: 'Alert',
    variant: 'warning',
    title: 'Save these codes securely',
    message: 'These codes can be used to access your account if you lose access to your authenticator app. Each code can only be used once.',
  });

  // Generate/Regenerate button
  children.push({
    type: 'Button',
    label: 'Generate New Recovery Codes',
    variant: 'primary',
    className: 'mb-6',
    onClick: {
      type: 'api',
      method: 'GET',
      url: `${authUrl}/2fa/backup-codes`,
      onSuccess: {
        type: 'updateState',
        stateKey: 'recoveryCodes',
      },
    },
  });

  // Codes display
  children.push({
    type: 'Conditional',
    condition: {
      type: 'state',
      key: 'recoveryCodes',
      operator: 'exists',
    },
    children: [
      {
        type: 'Container',
        className: 'bg-muted p-6 rounded-lg mb-4',
        children: [
          {
            type: 'Text',
            content: 'Your recovery codes:',
            variant: 'h3',
            className: 'mb-4',
          },
          {
            type: 'CodeBlock',
            content: {
              type: 'state',
              key: 'recoveryCodes.codes',
              transform: (codes: string[]) => codes.join('\n'),
            },
            language: 'text',
          },
        ],
      },
      {
        type: 'Row',
        gap: 4,
        children: [
          {
            type: 'Button',
            label: 'Copy Codes',
            variant: 'outline',
            onClick: {
              type: 'copyToClipboard',
              text: {
                type: 'state',
                key: 'recoveryCodes.codes',
                transform: (codes: string[]) => codes.join('\n'),
              },
            },
          },
          {
            type: 'Button',
            label: 'Download',
            variant: 'outline',
            onClick: {
              type: 'download',
              filename: 'recovery-codes.txt',
              content: {
                type: 'state',
                key: 'recoveryCodes.codes',
                transform: (codes: string[]) => codes.join('\n'),
              },
            },
          },
          {
            type: 'Button',
            label: 'Print',
            variant: 'outline',
            onClick: {
              type: 'print',
            },
          },
        ],
      },
    ],
  });

  return {
    type: 'Container',
    maxWidth: 'md',
    className: 'mx-auto p-6',
    children,
  };
}

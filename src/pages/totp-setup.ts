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
      type: 'Container',
      children: [
        {
          type: 'Text',
          content: '2FA setup is not available',
          variant: 'h2',
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

  // Setup button
  children.push({
    type: 'Button',
    label: 'Generate QR Code',
    variant: 'primary',
    onClick: {
      type: 'api',
      method: 'POST',
      url: `${authUrl}/2fa/setup`,
      onSuccess: {
        type: 'updateState',
        stateKey: 'totpSetup',
      },
    },
  });

  // QR Code display (shown after setup)
  children.push({
    type: 'Conditional',
    condition: {
      type: 'state',
      key: 'totpSetup',
      operator: 'exists',
    },
    children: [
      {
        type: 'CustomWidget',
        widget: 'Image',
        props: {
          src: {
            type: 'state',
            key: 'totpSetup.qr_code',
          },
          alt: 'TOTP QR Code',
          className: 'mx-auto mb-4',
        },
      },
      {
        type: 'Text',
        content: 'Manual entry key:',
        variant: 'body',
        className: 'mb-2',
      },
      {
        type: 'Text',
        content: {
          type: 'state',
          key: 'totpSetup.manual_entry_key',
        },
        variant: 'code',
        className: 'mb-6 font-mono',
      },
      {
        type: 'Text',
        content: 'Enter the 6-digit code from your authenticator app to verify:',
        variant: 'body',
        className: 'mb-4',
      },
      {
        type: 'Form',
        action: `${authUrl}/2fa/verify-setup`,
        method: 'POST',
        children: [
          {
            type: 'FormField',
            name: 'code',
            label: 'Verification code',
            inputType: 'text',
            required: true,
            placeholder: '000000',
            maxLength: 6,
          },
          {
            type: 'Button',
            label: 'Verify and Enable',
            variant: 'primary',
            type: 'submit',
            className: 'w-full mt-4',
          },
        ],
        onSubmit: {
          type: 'api',
          method: 'POST',
          url: `${authUrl}/2fa/verify-setup`,
          body: {
            code: {
              type: 'form',
              field: 'code',
            },
          },
          onSuccess: {
            type: 'navigate',
            to: '/settings/security',
          },
        },
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

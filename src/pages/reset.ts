/**
 * Reset Password Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  password_min_length?: number;
  login_redirect?: string;
}

export async function reset(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
  // The shell app proxies these requests to the internal auth module
  const authUrl = ctx.moduleUrls.auth;
  const minLength = options.password_min_length || 8;

  return {
    type: 'Page',
    className: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900',
    children: [
      {
        type: 'Card',
        className: 'w-full max-w-md p-8',
        children: [
          {
            type: 'Text',
            content: 'Reset your password',
            variant: 'h2',
            className: 'text-center mb-2',
          },
          {
            type: 'Text',
            content: 'Enter your new password below.',
            variant: 'muted',
            className: 'text-center mb-6',
          },
          {
            type: 'Form',
            id: 'reset-password-form',
            endpoint: `${authUrl}/reset-password`,
            method: 'POST',
            fields: [
              {
                type: 'Hidden',
                name: 'token',
                value: '{token}', // Will be interpolated from URL params
              },
              {
                type: 'TextField',
                name: 'password',
                label: 'New password',
                inputType: 'password',
                required: true,
                placeholder: '••••••••',
                helpText: `Must be at least ${minLength} characters`,
                validation: [
                  { type: 'required', message: 'Password is required' },
                  { type: 'min', value: minLength, message: `Password must be at least ${minLength} characters` },
                ],
              },
              {
                type: 'TextField',
                name: 'confirm_password',
                label: 'Confirm new password',
                inputType: 'password',
                required: true,
                placeholder: '••••••••',
                validation: [
                  { type: 'required', message: 'Please confirm your password' },
                ],
              },
            ],
            submitText: 'Reset password',
            onSuccess: {
              type: 'openModal',
              modal: {
                type: 'Modal',
                title: 'Password reset successful',
                size: 'sm',
                children: [
                  {
                    type: 'Text',
                    content: 'Your password has been reset. You can now sign in with your new password.',
                  },
                ],
                footer: [
                  {
                    type: 'Button',
                    label: 'Sign in',
                    variant: 'primary',
                    onClick: {
                      type: 'navigate',
                      to: '/login',
                    },
                  },
                ],
              },
            },
          },
          {
            type: 'Row',
            justify: 'center',
            className: 'mt-6',
            children: [
              {
                type: 'Link',
                label: '← Back to login',
                href: '/login',
              },
            ],
          },
        ],
      },
    ],
  };
}

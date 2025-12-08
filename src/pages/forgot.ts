/**
 * Forgot Password Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

export async function forgot(ctx: RequestContext): Promise<UISpec> {
  // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
  // The shell app proxies these requests to the internal auth module
  const authUrl = ctx.moduleUrls.auth;

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
            content: 'Forgot your password?',
            variant: 'h2',
            className: 'text-center mb-2',
          },
          {
            type: 'Text',
            content: "Enter your email and we'll send you a link to reset your password.",
            variant: 'muted',
            className: 'text-center mb-6',
          },
          {
            type: 'Form',
            id: 'forgot-password-form',
            endpoint: `${authUrl}/forgot-password`,
            method: 'POST',
            fields: [
              {
                type: 'TextField',
                name: 'email',
                label: 'Email address',
                inputType: 'email',
                required: true,
                placeholder: 'you@example.com',
                validation: [
                  { type: 'required', message: 'Email is required' },
                  { type: 'email', message: 'Please enter a valid email' },
                ],
              },
            ],
            submitText: 'Send reset link',
            onSuccess: {
              type: 'openModal',
              modal: {
                type: 'Modal',
                title: 'Check your email',
                size: 'sm',
                children: [
                  {
                    type: 'Text',
                    content: "We've sent a password reset link to your email address. Please check your inbox and follow the instructions.",
                    variant: 'body',
                  },
                ],
                footer: [
                  {
                    type: 'Button',
                    label: 'Back to login',
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

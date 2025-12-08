/**
 * Email Verification Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

export async function verify(ctx: RequestContext): Promise<UISpec> {
  // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
  // The shell app proxies these requests to the internal auth module
  const authUrl = ctx.moduleUrls.auth;

  return {
    type: 'Page',
    className: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900',
    children: [
      {
        type: 'Card',
        className: 'w-full max-w-md p-8 text-center',
        children: [
          {
            type: 'Icon',
            name: 'mail',
            size: 'lg',
            className: 'mx-auto mb-4 text-primary',
          },
          {
            type: 'Text',
            content: 'Verify your email',
            variant: 'h2',
            className: 'mb-2',
          },
          {
            type: 'Text',
            content: "We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.",
            variant: 'muted',
            className: 'mb-6',
          },
          {
            type: 'Alert',
            variant: 'info',
            message: "Didn't receive the email? Check your spam folder or click below to resend.",
            className: 'mb-6',
          },
          {
            type: 'Column',
            gap: 12,
            children: [
              {
                type: 'Button',
                label: 'Resend verification email',
                variant: 'outline',
                className: 'w-full',
                onClick: {
                  type: 'api',
                  method: 'POST',
                  endpoint: `${authUrl}/resend-verification`,
                  onSuccess: {
                    type: 'openModal',
                    modal: {
                      type: 'Modal',
                      title: 'Email sent',
                      size: 'sm',
                      children: [
                        {
                          type: 'Text',
                          content: "We've sent another verification email. Please check your inbox.",
                        },
                      ],
                      footer: [
                        {
                          type: 'Button',
                          label: 'OK',
                          variant: 'primary',
                          onClick: { type: 'closeModal' },
                        },
                      ],
                    },
                  },
                },
              },
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

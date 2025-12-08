/**
 * Magic Link Login Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  magic_link_text?: string;
  branding?: {
    logo_url?: string | null;
    company_name?: string | null;
  };
}

export async function magicLink(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  const authUrl = ctx.moduleUrls.auth;

  const children: UISpec[] = [];

  // Logo/branding
  if (options.branding?.logo_url) {
    children.push({
      type: 'Row',
      justify: 'center',
      className: 'mb-8',
      children: [
        {
          type: 'CustomWidget',
          widget: 'Image',
          props: {
            src: options.branding.logo_url,
            alt: options.branding.company_name || 'Logo',
            className: 'h-12',
          },
          fallback: {
            type: 'Text',
            content: options.branding.company_name || '',
            variant: 'h2',
          },
        },
      ],
    });
  }

  // Title
  children.push({
    type: 'Text',
    content: 'Sign in with email link',
    variant: 'h2',
    className: 'text-center mb-6',
  });

  // Description
  children.push({
    type: 'Text',
    content: 'Enter your email address and we\'ll send you a magic link to sign in.',
    variant: 'body',
    className: 'text-center mb-8 text-muted-foreground',
  });

  // Email input form
  children.push({
    type: 'Form',
    action: `${authUrl}/magic-link/request`,
    method: 'POST',
    children: [
      {
        type: 'FormField',
        name: 'email',
        label: 'Email address',
        inputType: 'email',
        required: true,
        placeholder: 'you@example.com',
      },
      {
        type: 'Button',
        label: 'Send magic link',
        variant: 'primary',
        type: 'submit',
        className: 'w-full mt-4',
      },
    ],
    onSubmit: {
      type: 'api',
      method: 'POST',
      url: `${authUrl}/magic-link/request`,
      onSuccess: {
        type: 'showMessage',
        message: 'Check your email for the magic link',
        variant: 'success',
      },
    },
  });

  return {
    type: 'Container',
    maxWidth: 'md',
    className: 'mx-auto p-6',
    children,
  };
}

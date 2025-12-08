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
    id: 'magic-link-form',
    endpoint: `${authUrl}/magic-link/request`,
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
    submitText: 'Send magic link',
    onSuccess: {
      type: 'custom',
      name: 'showMessage',
      payload: {
        message: 'Check your email for the magic link',
        variant: 'success',
      },
    },
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

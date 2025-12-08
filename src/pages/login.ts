/**
 * Login Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_social_login?: boolean;
  social_providers?: string[];
  show_remember_me?: boolean;
  login_redirect?: string;
  // Username settings
  username_is_email?: boolean;
  branding?: {
    logo_url?: string | null;
    company_name?: string | null;
  };
}

export async function login(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
  // The shell app proxies these requests to the internal auth module
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
    content: 'Sign in to your account',
    variant: 'h2',
    className: 'text-center mb-6',
  });

  // Social login buttons
  if (options.show_social_login && options.social_providers?.length) {
    const socialButtons: UISpec[] = options.social_providers.map((provider) => ({
      type: 'Button',
      label: `Continue with ${capitalize(provider)}`,
      variant: 'outline',
      icon: provider,
      className: 'w-full',
      onClick: {
        type: 'navigate',
        to: `${authUrl}/oauth/${provider}/authorize`,
      },
    }));

    children.push({
      type: 'Column',
      gap: 12,
      className: 'mb-6',
      children: socialButtons,
    });

    children.push({
      type: 'Row',
      align: 'center',
      gap: 16,
      className: 'mb-6',
      children: [
        { type: 'Text', content: '─────', variant: 'muted' },
        { type: 'Text', content: 'or continue with email', variant: 'muted' },
        { type: 'Text', content: '─────', variant: 'muted' },
      ],
    });
  }

  // Login form fields - support both email and username login
  const formFields: UISpec[] = [];

  if (options.username_is_email === false) {
    // Username login
    formFields.push({
      type: 'TextField',
      name: 'username',
      label: 'Username',
      inputType: 'text',
      required: true,
      placeholder: 'johndoe',
      validation: [
        { type: 'required', message: 'Username is required' },
      ],
    });
  } else {
    // Email login (default)
    formFields.push({
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
    });
  }

  formFields.push({
    type: 'TextField',
    name: 'password',
    label: 'Password',
    inputType: 'password',
    required: true,
    placeholder: '••••••••',
    validation: [{ type: 'required', message: 'Password is required' }],
  });

  // Remember me checkbox
  if (options.show_remember_me) {
    formFields.push({
      type: 'Row',
      justify: 'between',
      align: 'center',
      children: [
        {
          type: 'Checkbox',
          name: 'remember_me',
          checkboxLabel: 'Remember me',
        },
        {
          type: 'Link',
          label: 'Forgot password?',
          href: '/forgot-password',
        },
      ],
    });
  }

  // Login form
  children.push({
    type: 'Form',
    id: 'login-form',
    endpoint: `${authUrl}/login`,
    method: 'POST',
    fields: formFields as any,
    submitText: 'Sign in',
    onSuccess: {
      type: 'navigate',
      to: options.login_redirect || '/',
    },
  });

  // Sign up link
  children.push({
    type: 'Row',
    justify: 'center',
    className: 'mt-6',
    children: [
      {
        type: 'Text',
        content: "Don't have an account?",
        variant: 'muted',
      },
      {
        type: 'Link',
        label: 'Sign up',
        href: '/signup',
        className: 'ml-1',
      },
    ],
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

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

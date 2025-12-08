/**
 * Login Page Generator
 * 
 * Generates a modern, responsive login page with:
 * - Logo/branding support
 * - Dark mode by default
 * - Configurable card size
 * - Dynamic signup link (based on auth config)
 * - Social login support
 * - Remember me option
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_social_login?: boolean;
  social_providers?: string[];
  show_remember_me?: boolean;
  login_redirect?: string;
  // Username settings
  username_is_email?: boolean;
  // Branding - passed from hit-config.json
  branding?: {
    logo_url?: string | null;
    company_name?: string | null;
    app_name?: string | null;
    tagline?: string | null;
    default_theme?: 'light' | 'dark' | 'system';
    login_card_width?: 'sm' | 'md' | 'lg' | 'xl';
  };
}

// Card width classes based on config
const CARD_WIDTHS = {
  sm: 'max-w-sm',   // 384px
  md: 'max-w-md',   // 448px
  lg: 'max-w-lg',   // 512px
  xl: 'max-w-xl',   // 576px
};

export async function login(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
  // The shell app proxies these requests to the internal auth module
  const authUrl = ctx.moduleUrls.auth;

  // Fetch auth module config to check if signup is allowed
  // SECURITY: Default to false (fail closed) if fetch fails
  let authConfig: { allow_signup?: boolean } = { allow_signup: false };
  try {
    authConfig = (await ctx.fetchModuleConfig('auth')) as { allow_signup?: boolean };
  } catch (error) {
    console.error('SECURITY: Failed to fetch auth config, defaulting to allow_signup=false:', error);
    // Fail closed - don't show signup link if we can't verify it's allowed
  }

  // Determine card width from branding config
  const cardWidth = CARD_WIDTHS[options.branding?.login_card_width || 'lg'] || CARD_WIDTHS.lg;

  const children: UISpec[] = [];

  // Logo/branding section - centered with proper spacing
  const logoUrl = options.branding?.logo_url;
  const appName = options.branding?.app_name || options.branding?.company_name;
  const tagline = options.branding?.tagline;

  if (logoUrl || appName) {
    const brandingChildren: UISpec[] = [];

    if (logoUrl) {
      brandingChildren.push({
        type: 'CustomWidget',
        widget: 'Image',
        props: {
          src: logoUrl,
          alt: appName || 'Logo',
          className: 'h-16 w-auto mx-auto',
        },
        fallback: appName ? {
          type: 'Text',
          content: appName,
          variant: 'h1',
          className: 'text-3xl font-bold text-center text-gray-900 dark:text-white',
        } : undefined,
      });
    } else if (appName) {
      brandingChildren.push({
        type: 'Text',
        content: appName,
        variant: 'h1',
        className: 'text-3xl font-bold text-center text-gray-900 dark:text-white',
      });
    }

    if (tagline) {
      brandingChildren.push({
        type: 'Text',
        content: tagline,
        variant: 'muted',
        className: 'text-center text-sm mt-1',
      });
    }

    children.push({
      type: 'Column',
      align: 'center',
      className: 'mb-8',
      children: brandingChildren,
    });
  }

  // Title
  children.push({
    type: 'Text',
    content: 'Sign in to your account',
    variant: 'h2',
    className: 'text-2xl font-semibold text-center mb-8 text-gray-900 dark:text-white',
  });

  // Social login buttons
  if (options.show_social_login && options.social_providers?.length) {
    const socialButtons: UISpec[] = options.social_providers.map((provider) => ({
      type: 'Button',
      label: `Continue with ${capitalize(provider)}`,
      variant: 'outline',
      icon: provider,
      className: 'w-full h-11',
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

    // Divider
    children.push({
      type: 'Row',
      align: 'center',
      className: 'mb-6',
      children: [
        { type: 'CustomWidget', widget: 'Divider', props: { className: 'flex-1' } },
        { type: 'Text', content: 'or continue with email', variant: 'muted', className: 'px-4 text-sm' },
        { type: 'CustomWidget', widget: 'Divider', props: { className: 'flex-1' } },
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
      className: 'mb-4',
      inputClassName: 'h-11 text-base',
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
      className: 'mb-4',
      inputClassName: 'h-11 text-base',
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
    className: 'mb-4',
    inputClassName: 'h-11 text-base',
    validation: [{ type: 'required', message: 'Password is required' }],
  });

  // Remember me checkbox and forgot password link
  if (options.show_remember_me !== false) {
    formFields.push({
      type: 'Row',
      justify: 'between',
      align: 'center',
      className: 'mb-6',
      children: [
        {
          type: 'Checkbox',
          name: 'remember_me',
          checkboxLabel: 'Remember me',
          className: 'text-sm',
        },
        {
          type: 'Link',
          label: 'Forgot password?',
          href: '/forgot-password',
          className: 'text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500',
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
    submitClassName: 'w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white',
    onSuccess: {
      type: 'navigate',
      to: options.login_redirect || '/',
    },
  });

  // Sign up link (only if signup is allowed)
  if (authConfig.allow_signup !== false) {
    children.push({
      type: 'Row',
      justify: 'center',
      className: 'mt-8 pt-6 border-t border-gray-200 dark:border-gray-700',
      children: [
        {
          type: 'Text',
          content: "Don't have an account?",
          variant: 'muted',
          className: 'text-sm',
        },
        {
          type: 'Link',
          label: 'Sign up',
          href: '/signup',
          className: 'ml-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500',
        },
      ],
    });
  }

  // Page wrapper - dark mode by default if configured
  const defaultTheme = options.branding?.default_theme || 'dark';
  const pageClass = defaultTheme === 'dark' 
    ? 'min-h-screen flex items-center justify-center bg-gray-900 dark'
    : 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900';

  return {
    type: 'Page',
    className: pageClass,
    children: [
      {
        type: 'Card',
        className: `w-full ${cardWidth} p-8 sm:p-10 bg-white dark:bg-gray-800 shadow-xl dark:shadow-2xl border-0 dark:border dark:border-gray-700`,
        children,
      },
    ],
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

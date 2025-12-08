/**
 * Login Page Generator
 * 
 * Generates a modern, dark-themed login page with:
 * - Logo from /icon.png
 * - Dynamic OAuth providers (from auth module config)
 * - Dynamic signup link (based on allow_signup)
 * - Remember me option
 * - Forgot password link
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_social_login?: boolean;
  social_providers?: string[];
  show_remember_me?: boolean;
  login_redirect?: string;
  username_is_email?: boolean;
  // Branding options
  logo_url?: string;
  app_name?: string;
  tagline?: string;
}

interface AuthModuleConfig {
  allow_signup?: boolean;
  oauth_providers?: string[];
  password_login?: boolean;
  magic_link_login?: boolean;
}

// OAuth provider display info
const OAUTH_PROVIDERS: Record<string, { label: string; icon: string; bgColor: string }> = {
  google: {
    label: 'Google',
    icon: 'google',
    bgColor: 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600',
  },
  github: {
    label: 'GitHub',
    icon: 'github',
    bgColor: 'bg-gray-800 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600',
  },
  microsoft: {
    label: 'Microsoft',
    icon: 'microsoft',
    bgColor: 'bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white',
  },
  apple: {
    label: 'Apple',
    icon: 'apple',
    bgColor: 'bg-black hover:bg-gray-900 text-white',
  },
};

export async function login(ctx: RequestContext): Promise<UISpec> {
  const options = ctx.options as AuthCoreOptions;
  const authUrl = ctx.moduleUrls.auth;

  // Fetch auth module config to get dynamic settings
  let authConfig: AuthModuleConfig = {
    allow_signup: false,
    oauth_providers: [],
    password_login: true,
  };
  
  try {
    const config = await ctx.fetchModuleConfig('auth');
    authConfig = {
      allow_signup: (config as any).allow_signup ?? false,
      oauth_providers: (config as any).oauth_providers ?? [],
      password_login: (config as any).password_login ?? true,
      magic_link_login: (config as any).magic_link_login ?? false,
    };
  } catch (error) {
    console.error('Failed to fetch auth config:', error);
    // Continue with defaults - fail closed for security
  }

  // Determine which OAuth providers to show
  const oauthProviders = authConfig.oauth_providers || [];
  const showOAuth = oauthProviders.length > 0;

  const children: UISpec[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // LOGO
  // ─────────────────────────────────────────────────────────────────────────
  children.push({
    type: 'Row',
    justify: 'center',
    className: 'mb-6',
    children: [
      {
        type: 'CustomWidget',
        widget: 'Image',
        props: {
          src: options.logo_url || '/icon.png',
          alt: options.app_name || 'Logo',
          className: 'h-16 w-auto',
        },
      },
    ],
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TITLE & SUBTITLE
  // ─────────────────────────────────────────────────────────────────────────
  children.push({
    type: 'Text',
    content: 'Welcome Back',
    variant: 'h1',
    className: 'text-2xl font-bold text-center text-white mb-2',
  });

  children.push({
    type: 'Text',
    content: options.tagline || 'Sign in to continue your journey',
    variant: 'muted',
    className: 'text-center text-gray-400 mb-8',
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN FORM
  // ─────────────────────────────────────────────────────────────────────────
  const formFields: UISpec[] = [];

  // Email/Username field
  if (options.username_is_email === false) {
    formFields.push({
      type: 'TextField',
      name: 'username',
      label: 'Username',
      inputType: 'text',
      required: true,
      placeholder: 'johndoe',
      className: 'mb-4',
      inputClassName: 'h-12 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500',
      labelClassName: 'text-gray-300 text-sm font-medium',
      validation: [
        { type: 'required', message: 'Username is required' },
      ],
    });
  } else {
    formFields.push({
      type: 'TextField',
      name: 'email',
      label: 'Email address',
      inputType: 'email',
      required: true,
      placeholder: 'you@example.com',
      className: 'mb-4',
      inputClassName: 'h-12 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500',
      labelClassName: 'text-gray-300 text-sm font-medium',
      validation: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Please enter a valid email' },
      ],
    });
  }

  // Password field
  formFields.push({
    type: 'TextField',
    name: 'password',
    label: 'Password',
    inputType: 'password',
    required: true,
    placeholder: '••••••••',
    className: 'mb-4',
    inputClassName: 'h-12 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500',
    labelClassName: 'text-gray-300 text-sm font-medium',
    showPasswordToggle: true,
    validation: [{ type: 'required', message: 'Password is required' }],
  });

  // Remember me + Forgot password row
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
          className: 'text-sm text-gray-300',
          checkboxClassName: 'border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500',
        },
        {
          type: 'Link',
          label: 'Forgot password?',
          href: '/forgot-password',
          className: 'text-sm font-medium text-indigo-400 hover:text-indigo-300',
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
    submitText: 'Sign In',
    submitClassName: 'w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors',
    onSuccess: {
      type: 'navigate',
      to: options.login_redirect || '/',
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // OAUTH PROVIDERS
  // ─────────────────────────────────────────────────────────────────────────
  if (showOAuth) {
    // Divider
    children.push({
      type: 'Row',
      align: 'center',
      className: 'my-6',
      children: [
        {
          type: 'CustomWidget',
          widget: 'Divider',
          props: { className: 'flex-1 border-gray-700' },
        },
        {
          type: 'Text',
          content: 'or continue with',
          variant: 'muted',
          className: 'px-4 text-sm text-gray-500',
        },
        {
          type: 'CustomWidget',
          widget: 'Divider',
          props: { className: 'flex-1 border-gray-700' },
        },
      ],
    });

    // OAuth buttons - show in a row if 2 or fewer, otherwise stack
    const oauthButtons: UISpec[] = oauthProviders
      .filter(provider => OAUTH_PROVIDERS[provider])
      .map((provider) => {
        const providerInfo = OAUTH_PROVIDERS[provider];
        return {
          type: 'Button',
          label: providerInfo.label,
          variant: 'outline',
          icon: providerInfo.icon,
          className: `flex-1 h-11 ${providerInfo.bgColor} rounded-lg font-medium transition-colors`,
          onClick: {
            type: 'navigate',
            to: `${authUrl}/oauth/${provider}/authorize`,
          },
        };
      });

    if (oauthButtons.length > 0) {
      children.push({
        type: oauthButtons.length <= 2 ? 'Row' : 'Column',
        gap: 12,
        className: 'mb-6',
        children: oauthButtons,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNUP LINK (only if allowed)
  // ─────────────────────────────────────────────────────────────────────────
  if (authConfig.allow_signup) {
    children.push({
      type: 'Row',
      justify: 'center',
      className: 'mt-8',
      children: [
        {
          type: 'Text',
          content: "Don't have an account?",
          variant: 'muted',
          className: 'text-sm text-gray-400',
        },
        {
          type: 'Link',
          label: 'Sign up',
          href: '/signup',
          className: 'ml-1 text-sm font-medium text-indigo-400 hover:text-indigo-300',
        },
      ],
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE WRAPPER - Dark themed
  // ─────────────────────────────────────────────────────────────────────────
  return {
    type: 'Page',
    className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800',
    children: [
      {
        type: 'Card',
        className: 'w-full max-w-md p-8 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl',
        children,
      },
    ],
  };
}

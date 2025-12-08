/**
 * Signup Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

interface AuthCoreOptions {
  show_social_login?: boolean;
  social_providers?: string[];
  // Password requirements
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_number?: boolean;
  password_require_special?: boolean;
  // Username settings
  username_is_email?: boolean;
  // Terms
  show_terms_checkbox?: boolean;
  terms_url?: string;
  privacy_url?: string;
  // Redirects
  signup_redirect?: string;
  require_email_verification?: boolean;
  branding?: {
    logo_url?: string | null;
    company_name?: string | null;
  };
}

/**
 * Build password help text based on requirements
 */
function buildPasswordHelpText(options: AuthCoreOptions): string {
  const minLength = options.password_min_length || 8;
  const requirements: string[] = [`at least ${minLength} characters`];

  if (options.password_require_uppercase) requirements.push('one uppercase letter');
  if (options.password_require_lowercase) requirements.push('one lowercase letter');
  if (options.password_require_number) requirements.push('one number');
  if (options.password_require_special) requirements.push('one special character');

  if (requirements.length === 1) {
    return `Must be ${requirements[0]}`;
  }
  return `Must contain ${requirements.join(', ')}`;
}

/**
 * Build password validation rules based on requirements
 */
function buildPasswordValidation(options: AuthCoreOptions): any[] {
  const minLength = options.password_min_length || 8;
  const validations: any[] = [
    { type: 'required', message: 'Password is required' },
    { type: 'min', value: minLength, message: `Password must be at least ${minLength} characters` },
  ];

  if (options.password_require_uppercase) {
    validations.push({
      type: 'pattern',
      value: '[A-Z]',
      message: 'Password must contain at least one uppercase letter',
    });
  }
  if (options.password_require_lowercase) {
    validations.push({
      type: 'pattern',
      value: '[a-z]',
      message: 'Password must contain at least one lowercase letter',
    });
  }
  if (options.password_require_number) {
    validations.push({
      type: 'pattern',
      value: '[0-9]',
      message: 'Password must contain at least one number',
    });
  }
  if (options.password_require_special) {
    validations.push({
      type: 'pattern',
      value: '[!@#$%^&*(),.?":{}|<>]',
      message: 'Password must contain at least one special character',
    });
  }

  return validations;
}

export async function signup(ctx: RequestContext): Promise<UISpec> {
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
    content: 'Create your account',
    variant: 'h2',
    className: 'text-center mb-6',
  });

  // Social signup buttons
  if (options.show_social_login && options.social_providers?.length) {
    const socialButtons: UISpec[] = options.social_providers.map((provider) => ({
      type: 'Button',
      label: `Sign up with ${capitalize(provider)}`,
      variant: 'outline',
      icon: provider,
      className: 'w-full',
      onClick: {
        type: 'navigate',
        to: `${authUrl}/oauth/${provider}/authorize?signup=true`,
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
        { type: 'Text', content: 'or sign up with email', variant: 'muted' },
        { type: 'Text', content: '─────', variant: 'muted' },
      ],
    });
  }

  // Build form fields
  const formFields: any[] = [];

  // Username field (only if username_is_email is false)
  if (options.username_is_email === false) {
    formFields.push({
      type: 'TextField',
      name: 'username',
      label: 'Username',
      inputType: 'text',
      required: true,
      placeholder: 'johndoe',
      validation: [
        { type: 'required', message: 'Username is required' },
        { type: 'min', value: 3, message: 'Username must be at least 3 characters' },
        { type: 'pattern', value: '^[a-zA-Z0-9_]+$', message: 'Username can only contain letters, numbers, and underscores' },
      ],
    });
  }

  // Email field
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

  // Password field with dynamic validation
  formFields.push({
    type: 'TextField',
    name: 'password',
    label: 'Password',
    inputType: 'password',
    required: true,
    placeholder: '••••••••',
    helpText: buildPasswordHelpText(options),
    validation: buildPasswordValidation(options),
  });

  // Confirm password field
  formFields.push({
    type: 'TextField',
    name: 'confirm_password',
    label: 'Confirm password',
    inputType: 'password',
    required: true,
    placeholder: '••••••••',
    validation: [
      { type: 'required', message: 'Please confirm your password' },
    ],
  });

  // Terms checkbox (optional based on show_terms_checkbox)
  if (options.show_terms_checkbox !== false) {
    const termsUrl = options.terms_url || '/terms';
    const privacyUrl = options.privacy_url || '/privacy';
    formFields.push({
      type: 'Checkbox',
      name: 'accept_terms',
      checkboxLabel: `I agree to the [Terms of Service](${termsUrl}) and [Privacy Policy](${privacyUrl})`,
      required: true,
      validation: [
        { type: 'required', message: 'You must accept the terms to continue' },
      ],
    });
  }

  // Signup form
  children.push({
    type: 'Form',
    id: 'signup-form',
    endpoint: `${authUrl}/register`,
    method: 'POST',
    fields: formFields,
    submitText: 'Create account',
    onSuccess: options.require_email_verification
      ? {
          type: 'navigate',
          to: '/verify-email?signup=true',
        }
      : {
          type: 'navigate',
          to: options.signup_redirect || '/',
        },
  });

  // Login link
  children.push({
    type: 'Row',
    justify: 'center',
    className: 'mt-6',
    children: [
      {
        type: 'Text',
        content: 'Already have an account?',
        variant: 'muted',
      },
      {
        type: 'Link',
        label: 'Sign in',
        href: '/login',
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

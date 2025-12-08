/**
 * Reset Password Page Generator
 */

import type { UISpec, RequestContext } from '@hit/feature-pack-types';

// Password requirements come from auth module, not feature pack options
interface PasswordConfig {
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_number?: boolean;
  password_require_special?: boolean;
}

/**
 * Build password help text based on requirements from auth module
 */
function buildPasswordHelpText(config: PasswordConfig): string {
  const minLength = config.password_min_length || 8;
  const requirements: string[] = [`at least ${minLength} characters`];

  if (config.password_require_uppercase) requirements.push('one uppercase letter');
  if (config.password_require_lowercase) requirements.push('one lowercase letter');
  if (config.password_require_number) requirements.push('one number');
  if (config.password_require_special) requirements.push('one special character');

  if (requirements.length === 1) {
    return `Must be ${requirements[0]}`;
  }
  return `Must contain ${requirements.join(', ')}`;
}

/**
 * Build password validation rules based on requirements from auth module
 */
function buildPasswordValidation(config: PasswordConfig): any[] {
  const minLength = config.password_min_length || 8;
  const validations: any[] = [
    { type: 'required', message: 'Password is required' },
    { type: 'min', value: minLength, message: `Password must be at least ${minLength} characters` },
  ];

  if (config.password_require_uppercase) {
    validations.push({
      type: 'pattern',
      value: '[A-Z]',
      message: 'Password must contain at least one uppercase letter',
    });
  }
  if (config.password_require_lowercase) {
    validations.push({
      type: 'pattern',
      value: '[a-z]',
      message: 'Password must contain at least one lowercase letter',
    });
  }
  if (config.password_require_number) {
    validations.push({
      type: 'pattern',
      value: '[0-9]',
      message: 'Password must contain at least one number',
    });
  }
  if (config.password_require_special) {
    validations.push({
      type: 'pattern',
      value: '[!@#$%^&*(),.?":{}|<>]',
      message: 'Password must contain at least one special character',
    });
  }

  return validations;
}

export async function reset(ctx: RequestContext): Promise<UISpec> {
  // Fetch password requirements from auth module
  let authConfig: PasswordConfig = {};
  try {
    authConfig = (await ctx.fetchModuleConfig('auth')) as PasswordConfig;
  } catch (error) {
    console.warn('Failed to fetch auth config for password requirements:', error);
    // Use defaults if fetch fails
  }

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
                helpText: buildPasswordHelpText(authConfig),
                validation: buildPasswordValidation(authConfig),
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

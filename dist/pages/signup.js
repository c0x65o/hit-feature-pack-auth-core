/**
 * Signup Page Generator
 */
/**
 * Build password help text based on requirements from auth module
 */
function buildPasswordHelpText(config) {
    const minLength = config.password_min_length || 8;
    const requirements = [`at least ${minLength} characters`];
    if (config.password_require_uppercase)
        requirements.push('one uppercase letter');
    if (config.password_require_lowercase)
        requirements.push('one lowercase letter');
    if (config.password_require_number)
        requirements.push('one number');
    if (config.password_require_special)
        requirements.push('one special character');
    if (requirements.length === 1) {
        return `Must be ${requirements[0]}`;
    }
    return `Must contain ${requirements.join(', ')}`;
}
/**
 * Build password validation rules based on requirements from auth module
 */
function buildPasswordValidation(config) {
    const minLength = config.password_min_length || 8;
    const validations = [
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
export async function signup(ctx) {
    const options = ctx.options;
    // moduleUrls.auth is a proxy path (e.g., '/api/proxy/auth')
    // The shell app proxies these requests to the internal auth module
    const authUrl = ctx.moduleUrls.auth;
    let authConfig = { allow_signup: false };
    try {
        authConfig = (await ctx.fetchModuleConfig('auth'));
    }
    catch (error) {
        console.error('SECURITY: Failed to fetch auth config, defaulting to allow_signup=false:', error);
        // Fail closed - block signup if we can't verify it's allowed
    }
    // If signup is disabled, return an error page
    if (authConfig.allow_signup === false) {
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
                            content: 'Registration Disabled',
                            variant: 'h2',
                            className: 'text-center mb-4',
                        },
                        {
                            type: 'Text',
                            content: 'New user registration is currently disabled. Please contact an administrator if you need access.',
                            variant: 'muted',
                            className: 'text-center mb-6',
                        },
                        {
                            type: 'Link',
                            label: 'Back to Sign In',
                            href: '/login',
                            className: 'w-full text-center',
                        },
                    ],
                },
            ],
        };
    }
    const children = [];
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
        const socialButtons = options.social_providers.map((provider) => ({
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
    const formFields = [];
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
    // Password field with dynamic validation from auth module config
    formFields.push({
        type: 'TextField',
        name: 'password',
        label: 'Password',
        inputType: 'password',
        required: true,
        placeholder: '••••••••',
        helpText: buildPasswordHelpText(authConfig),
        validation: buildPasswordValidation(authConfig),
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
    // Signup form - email_verification comes from auth module config
    children.push({
        type: 'Form',
        id: 'signup-form',
        endpoint: `${authUrl}/register`,
        method: 'POST',
        fields: formFields,
        submitText: 'Create account',
        onSuccess: authConfig.email_verification
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
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
//# sourceMappingURL=signup.js.map
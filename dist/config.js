/**
 * Configuration schema and defaults for auth-core feature pack
 */
export const configDefaults = {
    // ─────────────────────────────────────────────────────────────
    // LOGIN PAGE
    // ─────────────────────────────────────────────────────────────
    username_is_email: true, // false = allow any username
    show_remember_me: true,
    show_forgot_password: true,
    login_redirect: '/',
    // ─────────────────────────────────────────────────────────────
    // SIGNUP PAGE
    // ─────────────────────────────────────────────────────────────
    allow_signup: true,
    require_email_verification: true,
    signup_redirect: '/',
    // Password requirements
    password_min_length: 8,
    password_require_uppercase: false,
    password_require_lowercase: false,
    password_require_number: false,
    password_require_special: false,
    // Terms
    show_terms_checkbox: false,
    terms_url: '/terms',
    privacy_url: '/privacy',
    // ─────────────────────────────────────────────────────────────
    // SOCIAL / OAUTH LOGIN
    // ─────────────────────────────────────────────────────────────
    show_social_login: false,
    social_providers: [], // ['google', 'github', 'microsoft', 'apple']
    social_login_text: 'Or continue with',
    // ─────────────────────────────────────────────────────────────
    // PASSWORDLESS / MAGIC LINK
    // ─────────────────────────────────────────────────────────────
    show_magic_link: false,
    magic_link_text: 'Sign in with email link',
    // ─────────────────────────────────────────────────────────────
    // TWO-FACTOR AUTHENTICATION (2FA) UI
    // ─────────────────────────────────────────────────────────────
    show_2fa_setup: true,
    show_2fa_methods: ['totp', 'email'], // 'totp', 'email', 'sms'
    show_recovery_codes: true,
    // ─────────────────────────────────────────────────────────────
    // DEVICE MANAGEMENT UI
    // ─────────────────────────────────────────────────────────────
    show_device_management: true,
    show_device_trust: true,
    show_active_sessions: true,
    allow_session_revoke: true,
    // ─────────────────────────────────────────────────────────────
    // SECURITY SETTINGS UI
    // ─────────────────────────────────────────────────────────────
    show_security_log: false,
    security_log_limit: 20,
    show_password_change: true,
    // ─────────────────────────────────────────────────────────────
    // ENTERPRISE SSO UI
    // ─────────────────────────────────────────────────────────────
    show_sso_login: false,
    sso_button_text: 'Sign in with SSO',
    sso_discovery_enabled: false,
    // Branding (holistic approach TBD)
    branding: {
        logo_url: null,
        company_name: null,
    },
};
export const configSchema = {
    type: 'object',
    properties: {
        // ─────────────────────────────────────────────────────────────
        // LOGIN PAGE
        // ─────────────────────────────────────────────────────────────
        username_is_email: {
            type: 'boolean',
            description: 'Use email as username (false = allow any username)',
            default: true,
        },
        show_remember_me: {
            type: 'boolean',
            description: "Show 'Remember me' checkbox on login",
            default: true,
        },
        show_forgot_password: {
            type: 'boolean',
            description: 'Show forgot password link on login',
            default: true,
        },
        login_redirect: {
            type: 'string',
            description: 'Where to redirect after successful login',
            default: '/',
        },
        // ─────────────────────────────────────────────────────────────
        // SIGNUP PAGE
        // ─────────────────────────────────────────────────────────────
        allow_signup: {
            type: 'boolean',
            description: 'Show signup link and page',
            default: true,
        },
        require_email_verification: {
            type: 'boolean',
            description: 'Require email verification before login',
            default: true,
        },
        signup_redirect: {
            type: 'string',
            description: 'Where to redirect after successful signup',
            default: '/',
        },
        password_min_length: {
            type: 'integer',
            minimum: 6,
            maximum: 32,
            description: 'Minimum password length',
            default: 8,
        },
        password_require_uppercase: {
            type: 'boolean',
            description: 'Require at least one uppercase letter',
            default: false,
        },
        password_require_lowercase: {
            type: 'boolean',
            description: 'Require at least one lowercase letter',
            default: false,
        },
        password_require_number: {
            type: 'boolean',
            description: 'Require at least one number',
            default: false,
        },
        password_require_special: {
            type: 'boolean',
            description: 'Require at least one special character',
            default: false,
        },
        show_terms_checkbox: {
            type: 'boolean',
            description: 'Show terms of service checkbox on signup',
            default: false,
        },
        terms_url: {
            type: 'string',
            description: 'URL to terms of service page',
            default: '/terms',
        },
        privacy_url: {
            type: 'string',
            description: 'URL to privacy policy page',
            default: '/privacy',
        },
        // ─────────────────────────────────────────────────────────────
        // SOCIAL / OAUTH LOGIN
        // ─────────────────────────────────────────────────────────────
        show_social_login: {
            type: 'boolean',
            description: 'Show social login buttons (Google, GitHub, etc.)',
            default: false,
        },
        social_providers: {
            type: 'array',
            items: {
                type: 'string',
                enum: ['google', 'github', 'microsoft', 'apple'],
            },
            description: 'Which social providers to show',
            default: [],
        },
        social_login_text: {
            type: 'string',
            description: 'Divider text before social login buttons',
            default: 'Or continue with',
        },
        // ─────────────────────────────────────────────────────────────
        // PASSWORDLESS / MAGIC LINK
        // ─────────────────────────────────────────────────────────────
        show_magic_link: {
            type: 'boolean',
            description: 'Show magic link (passwordless) login option',
            default: false,
        },
        magic_link_text: {
            type: 'string',
            description: 'Text for magic link button',
            default: 'Sign in with email link',
        },
        // ─────────────────────────────────────────────────────────────
        // TWO-FACTOR AUTHENTICATION (2FA) UI
        // ─────────────────────────────────────────────────────────────
        show_2fa_setup: {
            type: 'boolean',
            description: 'Show 2FA setup in account settings',
            default: true,
        },
        show_2fa_methods: {
            type: 'array',
            items: {
                type: 'string',
                enum: ['totp', 'email', 'sms'],
            },
            description: 'Which 2FA methods to offer (totp = authenticator app)',
            default: ['totp', 'email'],
        },
        show_recovery_codes: {
            type: 'boolean',
            description: 'Show recovery codes UI for 2FA backup',
            default: true,
        },
        // ─────────────────────────────────────────────────────────────
        // DEVICE MANAGEMENT UI
        // ─────────────────────────────────────────────────────────────
        show_device_management: {
            type: 'boolean',
            description: 'Show "Your devices" management page',
            default: true,
        },
        show_device_trust: {
            type: 'boolean',
            description: 'Show "Trust this device" checkbox',
            default: true,
        },
        show_active_sessions: {
            type: 'boolean',
            description: 'Show list of active sessions',
            default: true,
        },
        allow_session_revoke: {
            type: 'boolean',
            description: 'Allow users to revoke their own sessions',
            default: true,
        },
        // ─────────────────────────────────────────────────────────────
        // SECURITY SETTINGS UI
        // ─────────────────────────────────────────────────────────────
        show_security_log: {
            type: 'boolean',
            description: 'Show recent security events to user',
            default: false,
        },
        security_log_limit: {
            type: 'integer',
            minimum: 5,
            maximum: 100,
            description: 'Number of security events to show',
            default: 20,
        },
        show_password_change: {
            type: 'boolean',
            description: 'Show change password option',
            default: true,
        },
        // ─────────────────────────────────────────────────────────────
        // ENTERPRISE SSO UI
        // ─────────────────────────────────────────────────────────────
        show_sso_login: {
            type: 'boolean',
            description: 'Show enterprise SSO login button',
            default: false,
        },
        sso_button_text: {
            type: 'string',
            description: 'Text for SSO login button',
            default: 'Sign in with SSO',
        },
        sso_discovery_enabled: {
            type: 'boolean',
            description: 'Auto-detect SSO provider from email domain',
            default: false,
        },
    },
};
//# sourceMappingURL=config.js.map
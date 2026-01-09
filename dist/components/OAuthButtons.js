'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useThemeTokens } from '@hit/ui-kit/theme';
import { styles } from '@hit/ui-kit/components/utils';
import { useOAuth } from '../hooks/useAuth';
const PROVIDERS = {
    google: {
        id: 'google',
        label: 'Google',
        icon: (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: [_jsx("path", { fill: "currentColor", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), _jsx("path", { fill: "currentColor", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), _jsx("path", { fill: "currentColor", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), _jsx("path", { fill: "currentColor", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] })),
        bgColor: '#ffffff',
        textColor: '#1f2937',
        borderColor: '#d1d5db',
    },
    github: {
        id: 'github',
        label: 'GitHub',
        icon: (_jsx("svg", { width: "16", height: "16", fill: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { fillRule: "evenodd", d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z", clipRule: "evenodd" }) })),
        bgColor: '#1f2937',
        textColor: '#ffffff',
    },
    microsoft: {
        id: 'microsoft',
        label: 'Microsoft',
        icon: (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", children: [_jsx("path", { fill: "#F25022", d: "M1 1h10v10H1z" }), _jsx("path", { fill: "#00A4EF", d: "M1 13h10v10H1z" }), _jsx("path", { fill: "#7FBA00", d: "M13 1h10v10H13z" }), _jsx("path", { fill: "#FFB900", d: "M13 13h10v10H13z" })] })),
        bgColor: '#2f2f2f',
        textColor: '#ffffff',
    },
    apple: {
        id: 'apple',
        label: 'Apple',
        icon: (_jsx("svg", { width: "16", height: "16", fill: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { d: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" }) })),
        bgColor: '#000000',
        textColor: '#ffffff',
    },
};
export function OAuthButtons({ providers }) {
    const { initiateOAuth } = useOAuth();
    const { colors, textStyles: ts, spacing, radius } = useThemeTokens();
    const availableProviders = providers.map((id) => PROVIDERS[id]).filter(Boolean);
    if (availableProviders.length === 0)
        return null;
    return (_jsxs("div", { children: [_jsxs("div", { style: styles({
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    margin: `${spacing.lg} 0`,
                }), children: [_jsx("div", { style: styles({ flex: 1, borderTop: `1px solid ${colors.border.subtle}` }) }), _jsx("span", { style: styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.muted }), children: "or continue with" }), _jsx("div", { style: styles({ flex: 1, borderTop: `1px solid ${colors.border.subtle}` }) })] }), _jsx("div", { style: styles({
                    display: 'grid',
                    gap: spacing.sm,
                    gridTemplateColumns: availableProviders.length > 2 ? '1fr' : `repeat(${availableProviders.length}, 1fr)`,
                }), children: availableProviders.map((provider) => (_jsxs("button", { type: "button", onClick: () => initiateOAuth(provider.id), style: styles({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.sm,
                        height: '2.25rem',
                        padding: `0 ${spacing.md}`,
                        backgroundColor: provider.bgColor,
                        color: provider.textColor,
                        fontSize: ts.body.fontSize,
                        fontWeight: ts.label.fontWeight,
                        borderRadius: radius.md,
                        border: provider.borderColor ? `1px solid ${provider.borderColor}` : 'none',
                        cursor: 'pointer',
                    }), children: [provider.icon, _jsx("span", { children: provider.label })] }, provider.id))) })] }));
}
//# sourceMappingURL=OAuthButtons.js.map
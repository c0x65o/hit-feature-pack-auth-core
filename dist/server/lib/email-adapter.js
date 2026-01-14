import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
async function enqueueEmail(args) {
    try {
        const mod = await import('@hit/feature-pack-email-core');
        const fn = mod?.enqueueEmailDrizzle;
        if (!fn)
            return null;
        const db = getDb();
        return await fn({ db, sql, input: args });
    }
    catch {
        // email-core is optional until projects adopt it
        return null;
    }
}
function frontendBaseUrlFromRequest(req) {
    const hdr = req.headers.get('x-frontend-base-url');
    const v = hdr ? String(hdr).trim() : '';
    return v || null;
}
export async function sendInviteEmail(req, args) {
    const base = frontendBaseUrlFromRequest(req);
    const inviteUrl = args.inviteUrl || (base ? `${base}/invite` : '');
    await enqueueEmail({
        to: args.to,
        subject: 'You have been invited',
        text: `You have been invited.\n\nOpen: ${inviteUrl}\n`,
    });
}
export async function sendPasswordResetEmail(req, args) {
    const base = frontendBaseUrlFromRequest(req);
    const resetUrl = args.resetUrl || (base ? `${base}/reset-password` : '');
    await enqueueEmail({
        to: args.to,
        subject: 'Reset your password',
        text: `Reset your password:\n\nOpen: ${resetUrl}\n`,
    });
}
export async function sendVerifyEmail(req, args) {
    const base = frontendBaseUrlFromRequest(req);
    const verifyUrl = args.verifyUrl || (base ? `${base}/verify-email` : '');
    await enqueueEmail({
        to: args.to,
        subject: 'Verify your email',
        text: `Verify your email:\n\nOpen: ${verifyUrl}\n`,
    });
}
export async function sendMagicLinkEmail(req, args) {
    const base = frontendBaseUrlFromRequest(req);
    const magicUrl = args.magicUrl || (base ? `${base}/magic-link` : '');
    await enqueueEmail({
        to: args.to,
        subject: 'Your login link',
        text: `Use this link to sign in:\n\nOpen: ${magicUrl}\n`,
    });
}
//# sourceMappingURL=email-adapter.js.map
import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  text?: string | null;
  html?: string | null;
  template_id?: string | null;
  template_variables?: Record<string, unknown> | null;
};

async function enqueueEmail(args: SendEmailArgs): Promise<{ id: string } | null> {
  try {
    const mod = await import('@hit/feature-pack-email-core');
    const fn = (mod as any)?.enqueueEmailDrizzle as
      | ((opts: { db: any; sql: any; input: any }) => Promise<{ id: string }>)
      | undefined;
    if (!fn) return null;
    const db = getDb();
    return await fn({ db, sql, input: args });
  } catch {
    // email-core is optional until projects adopt it
    return null;
  }
}

function frontendBaseUrlFromRequest(req: NextRequest): string | null {
  const hdr = req.headers.get('x-frontend-base-url');
  const v = hdr ? String(hdr).trim() : '';
  return v || null;
}

export async function sendInviteEmail(req: NextRequest, args: { to: string; inviteUrl: string }) {
  const base = frontendBaseUrlFromRequest(req);
  const inviteUrl = args.inviteUrl || (base ? `${base}/invite` : '');

  await enqueueEmail({
    to: args.to,
    subject: 'You have been invited',
    text: `You have been invited.\n\nOpen: ${inviteUrl}\n`,
  });
}

export async function sendPasswordResetEmail(
  req: NextRequest,
  args: { to: string; resetUrl: string }
) {
  const base = frontendBaseUrlFromRequest(req);
  const resetUrl = args.resetUrl || (base ? `${base}/reset-password` : '');

  await enqueueEmail({
    to: args.to,
    subject: 'Reset your password',
    text: `Reset your password:\n\nOpen: ${resetUrl}\n`,
  });
}

export async function sendVerifyEmail(
  req: NextRequest,
  args: { to: string; verifyUrl: string; code?: string | null }
) {
  const base = frontendBaseUrlFromRequest(req);
  const verifyUrl = args.verifyUrl || (base ? `${base}/verify-email` : '');
  const code = args.code ? String(args.code).trim() : '';
  const codeLine = code ? `\n\nVerification code: ${code}\n` : '\n';

  await enqueueEmail({
    to: args.to,
    subject: 'Verify your email',
    text: `Verify your email:\n\nOpen: ${verifyUrl}${codeLine}`,
  });
}

export async function sendMagicLinkEmail(req: NextRequest, args: { to: string; magicUrl: string }) {
  const base = frontendBaseUrlFromRequest(req);
  const magicUrl = args.magicUrl || (base ? `${base}/magic-link` : '');

  await enqueueEmail({
    to: args.to,
    subject: 'Your login link',
    text: `Use this link to sign in:\n\nOpen: ${magicUrl}\n`,
  });
}


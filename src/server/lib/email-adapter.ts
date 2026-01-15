import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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

function resolveAppName(): string {
  return (
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.HIT_APP_NAME ||
    process.env.APP_NAME ||
    'this platform'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').trim();
}

async function loadEmailTemplate(templateName: string, baseUrl: string | null): Promise<string | null> {
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'emails', templateName);
  try {
    return await readFile(templatePath, 'utf8');
  } catch {
    // fall through to HTTP fetch
  }

  if (!baseUrl) return null;
  const url = `${baseUrl.replace(/\/$/, '')}/templates/emails/${templateName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildLogoBlock(baseUrl: string | null, appName: string): string {
  if (!baseUrl) return '';
  const logoUrl = `${baseUrl.replace(/\/$/, '')}/icon.png`;
  return `<img src="${logoUrl}" alt="${escapeHtml(appName)}" class="logo" />`;
}

export async function sendInviteEmail(
  req: NextRequest,
  args: { to: string; inviteUrl: string; inviterName?: string | null; message?: string | null }
) {
  const base = frontendBaseUrlFromRequest(req);
  const appName = resolveAppName();
  const inviteUrl = args.inviteUrl || (base ? `${base}/invite` : '');
  const inviterText = args.inviterName ? ` by ${escapeHtml(args.inviterName)}` : '';
  const messageBlock = args.message
    ? `<div class="message-box"><p>${escapeHtml(args.message)}</p></div>`
    : '';

  const templateHtml = await loadEmailTemplate('invite.html', base);
  let html: string | null = null;
  let text: string | null = null;

  if (templateHtml) {
    html = templateHtml
      .replace('{app_name}', escapeHtml(appName))
      .replace('{invite_link}', inviteUrl)
      .replace('{inviter_text}', inviterText)
      .replace('{logo_block}', buildLogoBlock(base, appName))
      .replace('{message_block}', messageBlock);
    text = stripHtml(html);
  }

  await enqueueEmail({
    to: args.to,
    subject: `You've been invited to join ${appName}${inviterText}`,
    text: text ?? `You've been invited to join ${appName}${inviterText}.\n\nOpen: ${inviteUrl}\n`,
    html,
  });
}

export async function sendPasswordResetEmail(
  req: NextRequest,
  args: { to: string; resetUrl: string }
) {
  const base = frontendBaseUrlFromRequest(req);
  const appName = resolveAppName();
  const resetUrl = args.resetUrl || (base ? `${base}/reset-password` : '');

  const templateHtml = await loadEmailTemplate('password_reset.html', base);
  let html: string | null = null;
  let text: string | null = null;

  if (templateHtml) {
    html = templateHtml
      .replace('{app_name}', escapeHtml(appName))
      .replace('{reset_link}', resetUrl)
      .replace('{logo_block}', buildLogoBlock(base, appName))
      .replace('{expiry_time}', '1 hour');
    text = stripHtml(html);
  }

  await enqueueEmail({
    to: args.to,
    subject: `Reset your ${appName} password`,
    text: text ?? `Reset your password:\n\nOpen: ${resetUrl}\n`,
    html,
  });
}

export async function sendVerifyEmail(
  req: NextRequest,
  args: { to: string; verifyUrl: string; code?: string | null }
) {
  const base = frontendBaseUrlFromRequest(req);
  const appName = resolveAppName();
  const verifyUrl = args.verifyUrl || (base ? `${base}/verify-email` : '');
  const code = args.code ? String(args.code).trim() : '';
  const codeLine = code ? `\n\nVerification code: ${code}\n` : '\n';

  const templateHtml = await loadEmailTemplate('verification.html', base);
  let html: string | null = null;
  let text: string | null = null;

  if (templateHtml) {
    html = templateHtml
      .replace('{app_name}', escapeHtml(appName))
      .replace('{verification_code}', escapeHtml(code))
      .replace('{verification_link}', verifyUrl)
      .replace('{logo_block}', buildLogoBlock(base, appName))
      .replace('{expiry_time}', '24 hours');
    text = stripHtml(html);
  }

  await enqueueEmail({
    to: args.to,
    subject: `Verify your ${appName} account`,
    text: text ?? `Verify your email:\n\nOpen: ${verifyUrl}${codeLine}`,
    html,
  });
}

export async function sendMagicLinkEmail(req: NextRequest, args: { to: string; magicUrl: string }) {
  const base = frontendBaseUrlFromRequest(req);
  const appName = resolveAppName();
  const magicUrl = args.magicUrl || (base ? `${base}/magic-link` : '');

  const templateHtml = await loadEmailTemplate('magic_link.html', base);
  let html: string | null = null;
  let text: string | null = null;

  if (templateHtml) {
    html = templateHtml
      .replace('{app_name}', escapeHtml(appName))
      .replace('{magic_link}', magicUrl)
      .replace('{logo_block}', buildLogoBlock(base, appName))
      .replace('{expiry_time}', '15 minutes');
    text = stripHtml(html);
  }

  await enqueueEmail({
    to: args.to,
    subject: `Sign in to ${appName}`,
    text: text ?? `Use this link to sign in:\n\nOpen: ${magicUrl}\n`,
    html,
  });
}


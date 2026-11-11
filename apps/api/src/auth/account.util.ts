import { AccountStatus } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'sf_session';
export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PublicAccount = {
  id: string;
  status: AccountStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export function toPublicAccount(account: PublicAccount): PublicAccount {
  return {
    id: account.id,
    status: account.status,
    emailVerifiedAt: account.emailVerifiedAt,
    lastLoginAt: account.lastLoginAt,
    createdAt: account.createdAt,
  };
}

export function readSessionCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const entry = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) || null : null;
}

export function sessionCookieOptions() {
  const configured = (process.env.AUTH_COOKIE_SAME_SITE ?? 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(configured)) {
    throw new Error('AUTH_COOKIE_SAME_SITE deve ser lax, strict ou none.');
  }
  const sameSite = configured as 'lax' | 'strict' | 'none';
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: SESSION_DURATION_MS,
  };
}

export function trustedFrontendOrigin(): string {
  const configured = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  return new URL(configured).origin;
}

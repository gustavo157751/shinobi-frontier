import { AccountStatus } from '@prisma/client';

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

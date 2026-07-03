import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(keyBuffer, derived);
}

export function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

export function getEmailVerifiedStatus(user: {
  email_verified: number | null;
  email_due_at: string | null;
}): { verified: boolean; needsVerify: boolean; reason?: string } {
  if (!user.email_verified) {
    return { verified: false, needsVerify: true, reason: 'never_verified' };
  }
  if (!user.email_due_at) {
    return { verified: true, needsVerify: false };
  }
  const dueMs = new Date(user.email_due_at).getTime();
  if (Date.now() >= dueMs) {
    return { verified: false, needsVerify: true, reason: 'expired' };
  }
  return { verified: true, needsVerify: false };
}

export function calculateNextDueDate(lastVerifiedAt: Date): Date {
  const lastMs = lastVerifiedAt.getTime();
  const days7 = lastMs + 7 * 24 * 60 * 60 * 1000;
  const days30 = lastMs + 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now < days7) return new Date(days7);
  if (now < days30) return new Date(days30);
  return new Date(days30);
}

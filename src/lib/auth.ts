// Database-backed session-based auth for single-user NAS app
// Sessions persist across server restarts via SQLite

import { db } from '@/lib/db';
import crypto from 'crypto';

const SESSION_TTL_DAYS = 7; // 7-day session expiry

/** Generate a cryptographically secure session token */
export function generateToken(): string {
  const bytes = crypto.randomBytes(32);
  return 'session-' + bytes.toString('base64url');
}

/** Clean expired sessions from the database */
export async function cleanExpiredSessions(): Promise<void> {
  try {
    await db.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch {
    // Silently fail - not critical
  }
}

/** Create a new session, returns the token */
export async function createSession(): Promise<string> {
  // Clean expired sessions first
  await cleanExpiredSessions();

  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      token,
      userId: 'admin',
      expiresAt,
    },
  });

  return token;
}

/** Validate a token, returns true if valid */
export async function validateToken(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const session = await db.session.findUnique({
      where: { token },
    });

    if (!session) return false;

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await db.session.delete({ where: { token } }).catch(() => {});
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Delete a session (logout) */
export async function deleteSession(token: string): Promise<void> {
  try {
    await db.session.delete({
      where: { token },
    });
  } catch {
    // Session may not exist, that's fine
  }
}

/** Hash a password using SHA-256 with salt */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

/** Verify a password against a stored hash+salt */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/** Parse stored password format "salt:hash" */
export function parseStoredPassword(stored: string): { salt: string; hash: string } | null {
  const parts = stored.split(':');
  if (parts.length === 2 && parts[0].length === 32 && parts[1].length === 128) {
    return { salt: parts[0], hash: parts[1] };
  }
  // Legacy plaintext format — return null to indicate plaintext comparison needed
  return null;
}

/** Format password for storage "salt:hash" */
export function formatStoredPassword(salt: string, hash: string): string {
  return `${salt}:${hash}`;
}

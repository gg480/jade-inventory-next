// Simple in-memory session-based auth for single-user NAS app

const sessions = new Map<string, { createdAt: number }>();

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

/** Generate a random session token */
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'session-';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** Create a new session, returns the token */
export function createSession(): string {
  // Clean expired sessions
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(key);
    }
  }

  const token = generateToken();
  sessions.set(token, { createdAt: now });
  return token;
}

/** Validate a token, returns true if valid */
export function validateToken(token: string): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;

  // Check expiration
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return false;
  }

  return true;
}

/** Delete a session (logout) */
export function deleteSession(token: string): void {
  sessions.delete(token);
}

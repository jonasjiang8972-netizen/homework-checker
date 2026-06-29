const store = new Map<string, { code: string; expires: number }>();

export function setVerificationCode(email: string, code: string): void {
  store.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });
}

export function verifyCode(email: string, code: string): boolean {
  const entry = store.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    store.delete(email);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(email);
  return true;
}

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [email, entry] of store) {
    if (now > entry.expires) store.delete(email);
  }
}

setInterval(cleanupExpired, 60_000);

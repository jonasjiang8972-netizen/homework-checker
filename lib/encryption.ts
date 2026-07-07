import crypto from 'crypto';

let _keyValidated = false;

function ensureKey(): void {
  if (_keyValidated) return;
  if (!process.env.API_KEY_ENCRYPTION_SECRET) {
    throw new Error('API_KEY_ENCRYPTION_SECRET not configured');
  }
  _keyValidated = true;
}

function getMasterKey(): Buffer {
  ensureKey();
  return crypto.createHash('sha256').update(process.env.API_KEY_ENCRYPTION_SECRET!).digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return `${iv.toString('base64')}.${encrypted}.${authTag}`;
}

export function decrypt(encoded: string): string | null {
  try {
    const key = getMasterKey();
    const parts = encoded.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return key.slice(0, 2) + '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

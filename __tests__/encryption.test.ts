import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, maskApiKey } from '../lib/encryption';

describe('encrypt / decrypt', () => {
  beforeAll(() => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-secret-for-unit-tests-1234567890';
  });

  it('加解密应回环正确', () => {
    const original = 'sk-test-api-key-12345';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain('.');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('两次加密结果应不同（IV 随机）', () => {
    const original = 'same-key';
    const e1 = encrypt(original);
    const e2 = encrypt(original);
    expect(e1).not.toBe(e2);
  });

  it('应加密空字符串', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('应处理长字符串', () => {
    const long = 'a'.repeat(1000);
    const encrypted = encrypt(long);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(long);
  });

  it('应处理包含特殊字符的字符串', () => {
    const special = 'hello+world/==?&密码#$%^&*()';
    const encrypted = encrypt(special);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(special);
  });

  it('无效密文应返回 null', () => {
    expect(decrypt('')).toBeNull();
    expect(decrypt('invalid')).toBeNull();
    expect(decrypt('a.b')).toBeNull();
    expect(decrypt('a.b.c.d')).toBeNull();
  });

  it('篡改密文应返回 null', () => {
    const encrypted = encrypt('secret');
    const tampered = encrypted.replace(/[a-z]/g, 'x');
    const result = decrypt(tampered);
    expect(result).toBeNull();
  });

  it('不同密钥解密应失败', () => {
    const original = 'test-key';
    const encrypted = encrypt(original);
    process.env.API_KEY_ENCRYPTION_SECRET = 'different-secret-for-testing-purposes!!';
    const result = decrypt(encrypted);
    expect(result).toBeNull();
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-secret-for-unit-tests-1234567890';
  });
});

describe('maskApiKey', () => {
  it('应脱敏长密钥（保留前后4位）', () => {
    expect(maskApiKey('sk-abcdefghijklmnop')).toBe('sk-a****mnop');
  });

  it('短密钥（≤8位）应只保留前2位加 ****', () => {
    expect(maskApiKey('abcdefgh')).toBe('ab****');
  });

  it('极短密钥应处理', () => {
    expect(maskApiKey('ab')).toBe('ab****');
    expect(maskApiKey('a')).toBe('a****');
  });

  it('空字符串应返回空', () => {
    expect(maskApiKey('')).toBe('****');
  });
});

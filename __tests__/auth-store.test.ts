import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setVerificationCode, verifyCode, cleanupExpired } from '../lib/auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupExpired();
  });

  it('应设置并验证验证码', () => {
    setVerificationCode('test@example.com', '123456');
    expect(verifyCode('test@example.com', '123456')).toBe(true);
  });

  it('验证码使用后应被删除（一次性）', () => {
    setVerificationCode('test@example.com', '123456');
    verifyCode('test@example.com', '123456');
    expect(verifyCode('test@example.com', '123456')).toBe(false);
  });

  it('错误验证码应返回 false', () => {
    setVerificationCode('test@example.com', '123456');
    expect(verifyCode('test@example.com', 'wrong')).toBe(false);
  });

  it('验证码过期应返回 false', () => {
    setVerificationCode('test@example.com', '123456');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    expect(verifyCode('test@example.com', '123456')).toBe(false);
  });

  it('过期验证码应被清理', () => {
    setVerificationCode('a@b.com', '111111');
    setVerificationCode('c@d.com', '222222');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    cleanupExpired();
    expect(verifyCode('a@b.com', '111111')).toBe(false);
    expect(verifyCode('c@d.com', '222222')).toBe(false);
  });

  it('未设置验证码应返回 false', () => {
    expect(verifyCode('nonexistent@test.com', '000000')).toBe(false);
  });

  it('多个邮箱互不干扰', () => {
    setVerificationCode('user1@test.com', '111111');
    setVerificationCode('user2@test.com', '222222');
    expect(verifyCode('user1@test.com', '111111')).toBe(true);
    expect(verifyCode('user2@test.com', '222222')).toBe(true);
  });
});

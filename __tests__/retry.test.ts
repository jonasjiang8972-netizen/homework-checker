import { describe, it, expect, vi, afterEach } from 'vitest';
import { retry } from '../lib/retry';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('retry', () => {
  it('成功时应直接返回结果', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry(fn, { maxRetries: 2, delayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('临时失败后重试应最终成功', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');
    const result = await retry(fn, { maxRetries: 3, delayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('超过最大重试次数应抛出错误', async () => {
    const error = new Error('timeout');
    const fn = vi.fn().mockRejectedValue(error);
    await expect(retry(fn, { maxRetries: 2, delayMs: 10 })).rejects.toThrow('timeout');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('不应重试不可重试的错误', async () => {
    const error = new Error('validation failed');
    const fn = vi.fn().mockRejectedValue(error);
    await expect(retry(fn, { maxRetries: 3, delayMs: 10 })).rejects.toThrow('validation failed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应重试 timeout 错误', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('request timed out'))
      .mockResolvedValue('ok');
    const result = await retry(fn, { maxRetries: 2, delayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('应重试 503 状态码错误', async () => {
    const err = new Error('Service Unavailable');
    (err as any).status = 503;
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    const result = await retry(fn, { maxRetries: 2, delayMs: 10 });
    expect(result).toBe('ok');
  });

  it('不应重试 400 状态码错误', async () => {
    const err = new Error('Bad Request');
    (err as any).status = 400;
    const fn = vi.fn().mockRejectedValue(err);
    await expect(retry(fn, { maxRetries: 2, delayMs: 10 })).rejects.toThrow('Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应重试 ECONNREFUSED 错误', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue('connected');
    const result = await retry(fn, { maxRetries: 1, delayMs: 10 });
    expect(result).toBe('connected');
  });

  it('onRetry 回调应被调用', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('ok');
    await retry(fn, { maxRetries: 2, delayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('应使用默认选项（maxRetries=3, delayMs=1000）', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const start = Date.now();
    await retry(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

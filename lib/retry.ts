export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delayMs: 1000,
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_OPTIONS
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_OPTIONS.maxRetries ?? 3;
  const delayMs = options.delayMs ?? DEFAULT_OPTIONS.delayMs ?? 1000;
  const onRetry = options.onRetry;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable = isRetryableError(lastError);

      if (!isRetryable || attempt === maxRetries + 1) {
        throw lastError;
      }

      onRetry?.(attempt, lastError);

      await sleep(delayMs * attempt);
    }
  }

  throw lastError || new Error('Unknown error');
}

function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  const status = (error as any).status;
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

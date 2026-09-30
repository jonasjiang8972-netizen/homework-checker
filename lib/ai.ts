import { getApiKey, getApiBaseUrl } from './auth-utils';

/** 调用 OpenAI 兼容的 chat/completions 接口，返回首条消息文本 */
export async function fetchChat(
  messages: unknown[],
  model: string,
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key');

  const baseURL = (await getApiBaseUrl()) || process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API ${response.status}: ${err.slice(0, 200)}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

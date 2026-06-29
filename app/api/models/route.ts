import { NextResponse } from 'next/server';

const VISION_KEYWORDS = ['vl', 'vision', '-v-', 'glm-4.5v', 'image', 'multimodal'];
const EXCLUDE_KEYWORDS = ['embedding', 'reranker', 'audio', 'tts', 'asr', 'cosyvoice', 'sensevoice'];

interface ModelEntry {
  id: string;
  owned_by: string;
  is_vision: boolean;
  is_text: boolean;
  is_image_gen: boolean;
}

function classifyModel(id: string): { is_vision: boolean; is_text: boolean; is_image_gen: boolean } {
  const lower = id.toLowerCase();
  const is_image_gen = ['qwen-image', 'z-image', 'ernie-image', 'kolors'].some(k => lower.includes(k));
  const is_vision = VISION_KEYWORDS.some(k => lower.includes(k)) || lower.includes('vl');
  const is_text = !EXCLUDE_KEYWORDS.some(k => lower.includes(k)) &&
    !is_image_gen &&
    !lower.includes('embedding') &&
    !lower.includes('reranker') &&
    !lower.includes('audio') &&
    !lower.includes('tts') &&
    !lower.includes('asr') &&
    !lower.includes('cosyvoice') &&
    !lower.includes('sensevoice');
  return { is_vision: is_vision || is_image_gen, is_text, is_image_gen };
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.siliconflow.cn/v1';

  if (!apiKey) {
    return NextResponse.json({ models: [], error: 'API key not configured' });
  }

  try {
    const response = await fetch(`${baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ models: [], error: `API error ${response.status}` });
    }

    const data = await response.json();
    const allModels: ModelEntry[] = (data.data || []).map((m: any) => ({
      id: m.id,
      owned_by: m.owned_by || '',
      ...classifyModel(m.id),
    }));

    const textModels = allModels.filter(m => m.is_text || m.is_vision || m.is_image_gen)
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models: textModels });
  } catch (error) {
    return NextResponse.json({ models: [], error: String(error) });
  }
}

/**
 * 视觉模型切题：让视觉模型直接看图，按题号列出每道题的完整文字（含学生答案）和大致位置，
 * 比 OCR 后靠正则切分更适合手写题号、图形题、跨栏排版。
 */

export interface SplitQuestion {
  number: string;
  text: string;
  /** 归一化位置 [x, y, w, h]，范围 0~1；模型没给或不合法时为 undefined */
  bbox?: [number, number, number, number];
}

export const MAX_SPLIT_QUESTIONS = 10;

export function buildSplitPrompt(subject = '数学'): string {
  return [
    `这是一张${subject}作业照片。请识别图中所有独立的题目，只输出JSON，不要其他文字。`,
    '格式：{"questions":[{"number":"题号","text":"该题完整内容，包含题干和学生写的答案","bbox":[x,y,w,h]}]}',
    'bbox 是该题在图中的位置，用 0~1 的比例表示（左上角 x,y 与宽高 w,h），看不准可省略 bbox。',
    '按从上到下、从左到右排序；一道题的多个小问算同一题；无法辨认的内容写"[无法辨认]"，不要臆测。',
    `最多返回 ${MAX_SPLIT_QUESTIONS} 题。`,
  ].join('\n');
}

function clampBbox(v: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(v) || v.length !== 4) return undefined;
  const n = v.map(Number);
  if (n.some((x) => !Number.isFinite(x))) return undefined;
  const [x, y, w, h] = n;
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x > 1 || y > 1) return undefined;
  return [x, y, Math.min(w, 1 - x), Math.min(h, 1 - y)];
}

/** 解析模型输出；失败或不足一题时返回空数组 */
export function parseSplitResponse(raw: string): SplitQuestion[] {
  if (!raw) return [];
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) cleaned = fence[1].trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last <= first) return [];

  let obj: any;
  try {
    obj = JSON.parse(cleaned.slice(first, last + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(obj?.questions)) return [];

  const out: SplitQuestion[] = [];
  for (const q of obj.questions) {
    const text = typeof q?.text === 'string' ? q.text.trim() : '';
    if (text.length < 2) continue;
    const item: SplitQuestion = { number: String(q?.number ?? out.length + 1), text };
    const bbox = clampBbox(q?.bbox);
    if (bbox) item.bbox = bbox;
    out.push(item);
    if (out.length >= MAX_SPLIT_QUESTIONS) break;
  }
  return out;
}

export interface GradingResult {
  is_correct: boolean;
  error_type: string;
  knowledge_point: string;
  error_spot: string;
  correct_solution: string;
  analysis: string;
  knowledge_tags: string[];
}

export const ERROR_TYPES = ['计算失误', '概念不清', '审题错误', '方法错误', '全部正确'] as const;

const EMPTY: GradingResult = {
  is_correct: false,
  error_type: '',
  knowledge_point: '',
  error_spot: '',
  correct_solution: '',
  analysis: '',
  knowledge_tags: [],
};

export const GRADING_PROMPT = [
  '请批改这道题目，并以 JSON 格式输出结果，不要输出 JSON 以外的任何文字。',
  'JSON 字段说明：',
  '- is_correct: 布尔值，答案是否完全正确',
  '- error_type: 错误类型，从 ["计算失误","概念不清","审题错误","方法错误"] 中选一个；若全对填"全部正确"',
  '- knowledge_point: 这道题考查的核心知识点名称（如"两位数进位加法"）',
  '- error_spot: 错在哪一步（全对则填"无"）',
  '- correct_solution: 完整的正确解题过程',
  '- analysis: 错因分析，为什么会错，要讲清楚',
  '- knowledge_tags: 相关知识点标签数组',
  '只返回 JSON，示例：',
  '{"is_correct":false,"error_type":"计算失误","knowledge_point":"两位数进位加法","error_spot":"第二步未进位","correct_solution":"27+38=65...","analysis":"对进位规则掌握不牢","knowledge_tags":["进位加法","竖式计算"]}',
].join('\n');

export function parseGrading(raw: string): GradingResult {
  if (!raw) return EMPTY;
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) cleaned = fence[1].trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    const obj = JSON.parse(cleaned);
    return {
      is_correct: !!obj.is_correct,
      error_type: String(obj.error_type ?? ''),
      knowledge_point: String(obj.knowledge_point ?? ''),
      error_spot: String(obj.error_spot ?? ''),
      correct_solution: String(obj.correct_solution ?? ''),
      analysis: String(obj.analysis ?? ''),
      knowledge_tags: Array.isArray(obj.knowledge_tags) ? obj.knowledge_tags.map(String) : [],
    };
  } catch {
    return { ...EMPTY, analysis: raw };
  }
}

export function gradingToText(g: GradingResult): string {
  if (g.is_correct) return '✅ 全部正确';
  return [
    g.error_type && `❌ 错误类型：${g.error_type}`,
    g.knowledge_point && `📚 知识点：${g.knowledge_point}`,
    g.error_spot && `🔍 错误之处：${g.error_spot}`,
    g.correct_solution && `✏️ 正确解答：\n${g.correct_solution}`,
    g.analysis && `💡 错因分析：${g.analysis}`,
    g.knowledge_tags.length && `🏷️ 标签：${g.knowledge_tags.join('、')}`,
  ].filter(Boolean).join('\n\n');
}

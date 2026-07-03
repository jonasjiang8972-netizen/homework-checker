export interface GradingResult {
  is_correct: boolean;
  error_type: string;
  knowledge_point: string;
  guidance: string;
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
  guidance: '',
  error_spot: '',
  correct_solution: '',
  analysis: '',
  knowledge_tags: [],
};

export const GRADING_PROMPT = `你是初中数学老师。批改此题，只输出JSON。
字段：is_correct(Boolean)、error_type(计算失误/概念不清/审题错误/方法错误/全部正确)、knowledge_point(String)、guidance(引导提示，全对留空)、error_spot(全对写"无")、correct_solution(正确步骤)、analysis(错因)、knowledge_tags(数组)。
简洁输出，correct_solution限3步内，analysis限1句话。不要JSON外的文字。`;

export const GRADING_PROMPT_TEXT = `你是初中数学老师。批改以下OCR提取的题目文字，只输出JSON。
字段：is_correct(Boolean)、error_type(计算失误/概念不清/审题错误/方法错误/全部正确)、knowledge_point(String)、guidance(引导提示，全对留空)、error_spot(全对写"无")、correct_solution(正确步骤)、analysis(错因)、knowledge_tags(数组)。
简洁输出，correct_solution限3步内，analysis限1句话。不要JSON外的文字。`;

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
      guidance: String(obj.guidance ?? ''),
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
    g.guidance && `💡 提示：${g.guidance}`,
    g.error_spot && `🔍 错误之处：${g.error_spot}`,
    g.correct_solution && `✏️ 正确解答：\n${g.correct_solution}`,
    g.analysis && `💡 错因分析：${g.analysis}`,
    g.knowledge_tags.length && `🏷️ 标签：${g.knowledge_tags.join('、')}`,
  ].filter(Boolean).join('\n\n');
}

import { getKnowledgePointList, KNOWLEDGE_POINTS } from './knowledge-points';

export interface GradingResult {
  is_correct: boolean;
  error_type: string;
  knowledge_point: string;
  guidance: string;
  error_spot: string;
  correct_solution: string;
  analysis: string;
  knowledge_tags: string[];
  /** 模型对本次判断的把握 0~1，缺失表示未提供 */
  confidence?: number;
  /** 解析失败/批改失败：不应计入掌握度统计，也不应展示为「答错」 */
  failed?: boolean;
}

export const ERROR_TYPES = ['计算失误', '概念不清', '审题错误', '方法错误', '步骤缺失', '书写不规范', '单位遗漏', '全部正确'] as const;

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

export type GradingMode = 'image' | 'text' | 'batch';

export interface PromptOptions {
  subject?: string;
  grade?: string;
  mode?: GradingMode;
}

const SUBJECT_TEACHER: Record<string, string> = {
  数学: '数学',
  语文: '语文',
  英语: '英语',
};

const SUBJECT_HINT: Record<string, string> = {
  数学: '注意区分题干与学生手写答案；复杂计算请逐步核对，最终答案务必自行验算。',
  语文: '字词、标点、病句、阅读理解按语文教学规范判断；开放性问题只要言之有理即可给对。',
  英语: '拼写、语法、时态、单复数逐项核对；书面表达关注语法与用词而非文采。',
};

/** 按学科/年级/输入方式生成批改提示词 */
export function buildGradingPrompt(opts: PromptOptions = {}): string {
  const subject = opts.subject ?? '数学';
  const grade = opts.grade?.trim() || '初中';
  const teacher = SUBJECT_TEACHER[subject] ?? '';
  const source = opts.mode === 'text'
    ? '批改以下OCR提取的题目文字（OCR可能有识别错误，请结合上下文判断）'
    : opts.mode === 'batch'
      ? '批改这道题'
      : '批改图片中的题目';
  const kps = getKnowledgePointList(subject);
  const kpLine = KNOWLEDGE_POINTS[subject]
    ? `knowledge_point 必须从此列表中选择最贴近的一项：${kps.join('、')}；确实都不符合时才自拟。`
    : 'knowledge_point 填写最具体的知识点名称。';

  return [
    `你是${grade}${teacher}老师。${source}，只输出JSON。`,
    SUBJECT_HINT[subject] ?? '',
    `字段：is_correct(Boolean)、error_type(${ERROR_TYPES.join('/')})、knowledge_point(String)、guidance(引导提示，全对留空)、error_spot(全对写"无")、correct_solution(正确步骤)、analysis(错因)、knowledge_tags(数组)、confidence(0到1的数字，表示你对本次判断的把握)。`,
    kpLine,
    '如果图片/文字看不清、无法判断学生答案，confidence 填低于0.5的值，不要臆测。',
    '简洁输出，correct_solution限3步内，analysis限1句话。不要JSON外的文字。',
  ].filter(Boolean).join('\n');
}

/** 兼容旧引用：默认初中数学 */
export const GRADING_PROMPT = buildGradingPrompt({ mode: 'image' });
export const GRADING_PROMPT_TEXT = buildGradingPrompt({ mode: 'text' });
export const GRADING_PROMPT_BATCH = buildGradingPrompt({ mode: 'batch' });

export function parseGrading(raw: string): GradingResult {
  if (!raw) return { ...EMPTY, failed: true };
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
      ...(typeof obj.confidence === 'number' && obj.confidence >= 0 && obj.confidence <= 1
        ? { confidence: obj.confidence }
        : {}),
    };
  } catch {
    return { ...EMPTY, analysis: raw, failed: true };
  }
}

/** 批改失败的占位结果 */
export function failedGrading(message = '批改失败，请重试'): GradingResult {
  return { ...EMPTY, analysis: message, failed: true };
}

/** 该结果是否可信到足以写入统计 */
export function isGradingUsable(g: GradingResult | null | undefined): g is GradingResult {
  return !!g && !g.failed;
}

export function gradingToText(g: GradingResult): string {
  if (g.failed) return '⚠️ 批改失败，请重试';
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

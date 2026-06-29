/**
 * 掌握度计算引擎
 *
 * 算法：
 * - 每道题正确：+Δ，错误：-Δ
 * - Δ 随历史做题量衰减（早期不因一题定论）
 * - 初始 50，区间 [0, 100]
 * - < 40 列为「薄弱」，触发计划生成
 */

export interface MasteryInput {
  isCorrect: boolean;
  totalCount: number;   // 该知识点历史累计做题数
}

export interface KnowledgePointStat {
  name: string;
  masteryLevel: number;
  totalCount: number;
  correctCount: number;
  weak: boolean;
}

/** 单次做题后的掌握度变动值，随做题量衰减 */
function delta(totalCount: number): number {
  const base = 10;
  const decay = Math.min(totalCount, 20) / 20; // 前 20 题线性衰减，之后不再衰减
  return Math.round(base * (1 - decay * 0.5));  // 初始 10，稳定后 5
}

/** 给定当前掌握度和本次正误，计算新掌握度 */
export function calculateNewMastery(
  currentMastery: number,
  isCorrect: boolean,
  totalCount: number,
): number {
  const d = delta(totalCount);
  const change = isCorrect ? d : -d;
  return Math.max(0, Math.min(100, currentMastery + change));
}

/** 根据用户对该知识点的累计数据批量计算掌握度 */
export function computeMastery(inputs: MasteryInput[]): number {
  if (inputs.length === 0) return 50;
  let mastery = 50;
  let count = 0;
  for (const inp of inputs) {
    mastery = calculateNewMastery(mastery, inp.isCorrect, count);
    count++;
  }
  return mastery;
}

/** 从 questions 数据聚合出每个知识点的掌握度统计 */
export function aggregateStats(
  rows: Array<{ knowledge_point: string | null; is_correct: boolean | null }>,
): KnowledgePointStat[] {
  const grouped = new Map<string, { correct: number; total: number; masteries: MasteryInput[] }>();

  for (const row of rows) {
    const kp = row.knowledge_point || '未分类';
    if (!grouped.has(kp)) grouped.set(kp, { correct: 0, total: 0, masteries: [] });
    const g = grouped.get(kp)!;
    g.total++;
    if (row.is_correct) g.correct++;
    g.masteries.push({ isCorrect: !!row.is_correct, totalCount: g.masteries.length });
  }

  const stats: KnowledgePointStat[] = [];
  for (const [name, g] of grouped) {
    const masteryLevel = computeMastery(g.masteries);
    stats.push({
      name,
      masteryLevel,
      totalCount: g.total,
      correctCount: g.correct,
      weak: masteryLevel < 40,
    });
  }

  stats.sort((a, b) => a.masteryLevel - b.masteryLevel); // 薄弱优先
  return stats;
}
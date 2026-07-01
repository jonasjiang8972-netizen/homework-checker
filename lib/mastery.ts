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
  totalCount: number;
}

export interface KnowledgePointStat {
  name: string;
  masteryLevel: number;
  totalCount: number;
  correctCount: number;
  weak: boolean;
}

function delta(totalCount: number): number {
  const base = 10;
  const decay = Math.min(totalCount, 20) / 20;
  return Math.round(base * (1 - decay * 0.5));
}

export function calculateNewMastery(
  currentMastery: number,
  isCorrect: boolean,
  totalCount: number,
): number {
  const d = delta(totalCount);
  const change = isCorrect ? d : -d;
  return Math.max(0, Math.min(100, currentMastery + change));
}

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

  stats.sort((a, b) => a.masteryLevel - b.masteryLevel);
  return stats;
}

export function updateMasteryDelta(
  prevMastery: number,
  prevTotal: number,
  prevCorrect: number,
  isCorrect: boolean,
): { mastery: number; total: number; correct: number } {
  const newMastery = calculateNewMastery(prevMastery, isCorrect, prevTotal);
  return {
    mastery: newMastery,
    total: prevTotal + 1,
    correct: prevCorrect + (isCorrect ? 1 : 0),
  };
}
import { describe, it, expect } from 'vitest';
import { calculateNewMastery, computeMastery, aggregateStats } from '../lib/mastery';
import type { MasteryInput, KnowledgePointStat } from '../lib/mastery';

describe('calculateNewMastery', () => {
  it('正确题应增加掌握度', () => {
    const newMastery = calculateNewMastery(50, true, 0);
    expect(newMastery).toBeGreaterThan(50);
    expect(newMastery).toBeLessThanOrEqual(100);
  });

  it('错误题应降低掌握度', () => {
    const newMastery = calculateNewMastery(50, false, 0);
    expect(newMastery).toBeLessThan(50);
    expect(newMastery).toBeGreaterThanOrEqual(0);
  });

  it('掌握度不应超过 100', () => {
    let mastery = 95;
    for (let i = 0; i < 10; i++) {
      mastery = calculateNewMastery(mastery, true, i);
    }
    expect(mastery).toBeLessThanOrEqual(100);
  });

  it('掌握度不应低于 0', () => {
    let mastery = 5;
    for (let i = 0; i < 10; i++) {
      mastery = calculateNewMastery(mastery, false, i);
    }
    expect(mastery).toBeGreaterThanOrEqual(0);
  });

  it('随着做题量增加，delta 应衰减', () => {
    const deltaEarly = calculateNewMastery(50, true, 0) - 50;
    const deltaLate = calculateNewMastery(50, true, 30) - 50;
    expect(deltaEarly).toBeGreaterThan(deltaLate);
  });
});

describe('computeMastery', () => {
  it('空输入返回初始值 50', () => {
    expect(computeMastery([])).toBe(50);
  });

  it('全部正确应接近 100', () => {
    const inputs: MasteryInput[] = [
      { isCorrect: true, totalCount: 0 },
      { isCorrect: true, totalCount: 1 },
      { isCorrect: true, totalCount: 2 },
      { isCorrect: true, totalCount: 3 },
    ];
    const mastery = computeMastery(inputs);
    expect(mastery).toBeGreaterThan(85);
  });

  it('全部错误应接近 0', () => {
    const inputs: MasteryInput[] = [
      { isCorrect: false, totalCount: 0 },
      { isCorrect: false, totalCount: 1 },
      { isCorrect: false, totalCount: 2 },
      { isCorrect: false, totalCount: 3 },
    ];
    const mastery = computeMastery(inputs);
    expect(mastery).toBeLessThan(15);
  });

  it('正确率 50% 应接近 50', () => {
    const inputs: MasteryInput[] = [
      { isCorrect: true, totalCount: 0 },
      { isCorrect: false, totalCount: 1 },
      { isCorrect: true, totalCount: 2 },
      { isCorrect: false, totalCount: 3 },
      { isCorrect: true, totalCount: 4 },
      { isCorrect: false, totalCount: 5 },
    ];
    const mastery = computeMastery(inputs);
    expect(mastery).toBeGreaterThan(40);
    expect(mastery).toBeLessThan(60);
  });
});

describe('aggregateStats', () => {
  it('正确聚合知识点统计', () => {
    const rows = [
      { knowledge_point: '加法', is_correct: true },
      { knowledge_point: '加法', is_correct: true },
      { knowledge_point: '加法', is_correct: false },
      { knowledge_point: '减法', is_correct: false },
      { knowledge_point: '减法', is_correct: false },
    ];

    const stats = aggregateStats(rows);
    
    const addStats = stats.find(s => s.name === '加法');
    expect(addStats).toBeDefined();
    expect(addStats?.totalCount).toBe(3);
    expect(addStats?.correctCount).toBe(2);

    const subStats = stats.find(s => s.name === '减法');
    expect(subStats).toBeDefined();
    expect(subStats?.totalCount).toBe(2);
    expect(subStats?.correctCount).toBe(0);
  });

  it('应返回排序后的结果 (薄弱优先)', () => {
    const rows = [
      { knowledge_point: 'A', is_correct: true },
      { knowledge_point: 'B', is_correct: false },
      { knowledge_point: 'C', is_correct: true },
    ];

    const stats = aggregateStats(rows);
    expect(stats).toHaveLength(3);
    
    const first = stats[0];
    const last = stats[2];
    expect(first.masteryLevel).toBeLessThanOrEqual(last.masteryLevel);
  });

  it('未分类知识点应归类为未分类', () => {
    const rows = [
      { knowledge_point: null, is_correct: true },
      { knowledge_point: null, is_correct: false },
    ];

    const stats = aggregateStats(rows);
    const unclassified = stats.find(s => s.name === '未分类');
    expect(unclassified).toBeDefined();
    expect(unclassified?.totalCount).toBe(2);
  });
});

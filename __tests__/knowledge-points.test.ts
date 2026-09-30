import { describe, it, expect } from 'vitest';
import { normalizeKnowledgePoint, getKnowledgePointList } from '../lib/knowledge-points';

describe('normalizeKnowledgePoint', () => {
  it('精确匹配保持不变', () => {
    expect(normalizeKnowledgePoint('一元二次方程')).toBe('一元二次方程');
  });
  it('变体应归并到标准名', () => {
    expect(normalizeKnowledgePoint('解一元二次方程')).toBe('一元二次方程');
    expect(normalizeKnowledgePoint('  一元二次方程的解法  ')).toBe('一元二次方程');
  });
  it('包含关系取最长标准名', () => {
    expect(normalizeKnowledgePoint('二元一次方程组的代入法')).toBe('二元一次方程组');
  });
  it('库外名称保留原文', () => {
    expect(normalizeKnowledgePoint('量子力学')).toBe('量子力学');
  });
  it('空值返回未分类', () => {
    expect(normalizeKnowledgePoint('')).toBe('未分类');
    expect(normalizeKnowledgePoint('   ')).toBe('未分类');
  });
  it('按学科匹配', () => {
    expect(normalizeKnowledgePoint('一般过去时', '英语')).not.toBe('未分类');
    expect(getKnowledgePointList('未知学科').length).toBeGreaterThan(30);
  });
});

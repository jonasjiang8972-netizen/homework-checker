import { describe, it, expect } from 'vitest';
import { parseGrading, gradingToText } from '../lib/grading';
import type { GradingResult } from '../lib/grading';

describe('parseGrading', () => {
  it('应正确解析标准 JSON', () => {
    const raw = '{"is_correct":false,"error_type":"计算失误","knowledge_point":"两位数进位加法","error_spot":"第二步未进位","correct_solution":"27+38=65","analysis":"对进位规则掌握不牢","knowledge_tags":["进位加法","竖式计算"]}';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(false);
    expect(result.error_type).toBe('计算失误');
    expect(result.knowledge_point).toBe('两位数进位加法');
    expect(result.error_spot).toBe('第二步未进位');
    expect(result.correct_solution).toBe('27+38=65');
    expect(result.analysis).toBe('对进位规则掌握不牢');
    expect(result.knowledge_tags).toEqual(['进位加法', '竖式计算']);
  });

  it('应处理全对结果', () => {
    const raw = '{"is_correct":true,"error_type":"全部正确","knowledge_point":"乘法口诀","error_spot":"无","correct_solution":"6×7=42","analysis":"完全正确","knowledge_tags":["乘法"]}';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(true);
    expect(result.error_type).toBe('全部正确');
  });

  it('应剥离 markdown fence', () => {
    const raw = '```json\n{"is_correct":true,"error_type":"全部正确","knowledge_point":"加法","error_spot":"无","correct_solution":"1+1=2","analysis":"正确","knowledge_tags":["加法"]}\n```';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(true);
    expect(result.knowledge_point).toBe('加法');
  });

  it('应剥离无语言标记的 fence', () => {
    const raw = '```\n{"is_correct":false,"error_type":"审题错误","knowledge_point":"应用题","error_spot":"漏看条件","correct_solution":"...","analysis":"审题不仔细","knowledge_tags":["应用题"]}\n```';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(false);
    expect(result.error_type).toBe('审题错误');
  });

  it('应处理 JSON 前后有多余文本的情况', () => {
    const raw = '这是批改结果：{"is_correct":true,"error_type":"全部正确","knowledge_point":"","error_spot":"","correct_solution":"","analysis":"","knowledge_tags":[]} 请查收。';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(true);
  });

  it('空输入应返回默认空值', () => {
    const result = parseGrading('');
    expect(result.is_correct).toBe(false);
    expect(result.error_type).toBe('');
    expect(result.knowledge_tags).toEqual([]);
  });

  it('无效 JSON 应返回空结果并保留原文', () => {
    const raw = '这不是 JSON 格式的数据';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(false);
    expect(result.analysis).toBe(raw);
  });

  it('缺失字段应填充默认值', () => {
    const raw = '{"is_correct":true}';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(true);
    expect(result.error_type).toBe('');
    expect(result.knowledge_point).toBe('');
    expect(result.error_spot).toBe('');
    expect(result.correct_solution).toBe('');
    expect(result.analysis).toBe('');
    expect(result.knowledge_tags).toEqual([]);
  });

  it('knowledge_tags 不是数组时应返回空数组', () => {
    const raw = '{"is_correct":false,"error_type":"概念不清","knowledge_point":"分数","error_spot":"分子分母混淆","correct_solution":"...","analysis":"概念模糊","knowledge_tags":"not-an-array"}';
    const result = parseGrading(raw);
    expect(result.knowledge_tags).toEqual([]);
  });

  it('应处理获取到空括号后无匹配的情况', () => {
    const raw = 'no braces here at all';
    const result = parseGrading(raw);
    expect(result.is_correct).toBe(false);
  });
});

describe('gradingToText', () => {
  const baseCorrect: GradingResult = {
    is_correct: true,
    error_type: '全部正确',
    knowledge_point: '乘法口诀',
    error_spot: '无',
    correct_solution: '',
    analysis: '完全正确',
    knowledge_tags: ['乘法'],
  };

  it('正确结果应返回 ✅ 前缀', () => {
    const text = gradingToText(baseCorrect);
    expect(text).toContain('✅');
    expect(text).toContain('全部正确');
  });

  it('错误结果应包含各字段', () => {
    const wrong: GradingResult = {
      is_correct: false,
      error_type: '计算失误',
      knowledge_point: '进位加法',
      error_spot: '第二步未进位',
      correct_solution: '27+38=65',
      analysis: '进位规则不牢',
      knowledge_tags: ['进位加法', '竖式计算'],
    };
    const text = gradingToText(wrong);
    expect(text).toContain('❌');
    expect(text).toContain('计算失误');
    expect(text).toContain('进位加法');
    expect(text).toContain('第二步未进位');
    expect(text).toContain('27+38=65');
    expect(text).toContain('进位规则不牢');
    expect(text).toContain('进位加法、竖式计算');
  });

  it('空字段应被过滤掉', () => {
    const minimal: GradingResult = {
      is_correct: false,
      error_type: '',
      knowledge_point: '',
      error_spot: '',
      correct_solution: '',
      analysis: '仅分析',
      knowledge_tags: [],
    };
    const text = gradingToText(minimal);
    expect(text).not.toContain('❌');
    expect(text).toContain('仅分析');
  });

  it('空标签数组不应显示标签行', () => {
    const text = gradingToText({ ...baseCorrect, knowledge_tags: [] });
    expect(text).not.toContain('🏷️');
  });
});

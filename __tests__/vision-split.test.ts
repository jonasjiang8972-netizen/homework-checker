import { describe, it, expect } from 'vitest';
import { parseSplitResponse, buildSplitPrompt, MAX_SPLIT_QUESTIONS } from '../lib/vision-split';

describe('parseSplitResponse', () => {
  it('解析标准输出并保留合法 bbox', () => {
    const raw = '{"questions":[{"number":"1","text":"2x+1=5 解：x=2","bbox":[0.1,0.2,0.5,0.3]},{"number":"2","text":"3+4=8"}]}';
    const q = parseSplitResponse(raw);
    expect(q).toHaveLength(2);
    expect(q[0].bbox).toEqual([0.1, 0.2, 0.5, 0.3]);
    expect(q[1].bbox).toBeUndefined();
  });
  it('剥离 markdown fence 与前后文字', () => {
    const q = parseSplitResponse('好的：\n```json\n{"questions":[{"number":1,"text":"题目内容一"}]}\n```');
    expect(q[0]).toMatchObject({ number: '1', text: '题目内容一' });
  });
  it('丢弃过短文本与非法 bbox，裁剪越界宽高', () => {
    const q = parseSplitResponse('{"questions":[{"text":"x"},{"text":"有效题目","bbox":[2,0,1,1]},{"text":"另一题目","bbox":[0.8,0.8,0.5,0.5]}]}');
    expect(q).toHaveLength(2);
    expect(q[0].bbox).toBeUndefined();
    expect(q[1].bbox![2]).toBeCloseTo(0.2);
    expect(q[1].bbox![3]).toBeCloseTo(0.2);
  });
  it('无效输入返回空数组', () => {
    expect(parseSplitResponse('')).toEqual([]);
    expect(parseSplitResponse('没有JSON')).toEqual([]);
    expect(parseSplitResponse('{"questions":"nope"}')).toEqual([]);
    expect(parseSplitResponse('{bad json}')).toEqual([]);
  });
  it('限制最大题数', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ number: i, text: `第${i}题内容` }));
    expect(parseSplitResponse(JSON.stringify({ questions: many }))).toHaveLength(MAX_SPLIT_QUESTIONS);
  });
  it('提示词包含学科', () => {
    expect(buildSplitPrompt('英语')).toContain('英语作业');
  });
});

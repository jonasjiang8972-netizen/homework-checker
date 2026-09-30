/**
 * 标准知识点库
 *
 * 让 AI 从固定列表中选择知识点，避免「一元二次方程 / 解一元二次方程 / 二次方程」
 * 被拆成多个统计项。模型仍输出了库外名称时，用 normalizeKnowledgePoint 归并。
 */

export const KNOWLEDGE_POINTS: Record<string, string[]> = {
  数学: [
    '整数四则运算', '分数运算', '小数运算', '乘法口诀', '进位加法', '退位减法',
    '有理数运算', '整式运算', '因式分解', '分式', '二次根式',
    '一元一次方程', '二元一次方程组', '一元二次方程', '不等式',
    '一次函数', '二次函数', '反比例函数',
    '平行线与相交线', '三角形', '全等三角形', '相似三角形', '四边形', '圆', '勾股定理',
    '统计与概率', '应用题', '单位换算', '几何图形面积与体积',
  ],
  语文: [
    '字词拼音', '错别字', '成语运用', '词语搭配', '标点符号', '病句修改',
    '古诗文默写', '文言文阅读', '现代文阅读', '修辞手法', '句子仿写', '作文',
  ],
  英语: [
    '词汇拼写', '名词单复数', '动词时态', '介词', '冠词', '代词',
    '形容词与副词', '句型转换', '完形填空', '阅读理解', '书面表达', '语法填空',
  ],
};

export const UNCATEGORIZED = '未分类';

function similarity(a: string, b: string): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let common = 0;
  for (const ch of sa) if (sb.has(ch)) common++;
  return common / Math.max(sa.size, sb.size, 1);
}

/** 返回学科对应的标准知识点，未知学科返回所有学科合集 */
export function getKnowledgePointList(subject: string): string[] {
  return KNOWLEDGE_POINTS[subject] ?? Object.values(KNOWLEDGE_POINTS).flat();
}

/**
 * 将模型输出的知识点归并到标准库：
 * 1. 精确匹配；2. 包含关系（取最长的标准名）；3. 字符相似度 ≥ 0.6；
 * 都不满足则保留原文（去除空白），空值返回「未分类」。
 */
export function normalizeKnowledgePoint(name: string, subject = '数学'): string {
  const raw = (name ?? '').trim();
  if (!raw) return UNCATEGORIZED;

  const list = getKnowledgePointList(subject);
  if (list.includes(raw)) return raw;

  const contained = list
    .filter(k => raw.includes(k) || k.includes(raw))
    .sort((a, b) => b.length - a.length);
  if (contained.length > 0) return contained[0];

  let best = '';
  let bestScore = 0;
  for (const k of list) {
    const s = similarity(raw, k);
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return bestScore >= 0.6 ? best : raw;
}

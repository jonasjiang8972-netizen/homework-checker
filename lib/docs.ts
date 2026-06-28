import { marked } from 'marked';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface DocMeta {
  slug: string;
  file: string;
  title: string;
  desc: string;
}

export const docs: DocMeta[] = [
  { slug: 'prd', file: 'PRD.md', title: '产品需求文档', desc: '产品意图、用户、功能与体验' },
  { slug: 'architecture', file: 'ARCHITECTURE.md', title: '技术架构', desc: '四层架构与数据流' },
  { slug: 'technical', file: 'TECHNICAL.md', title: '技术实现', desc: '模块、API、容错策略' },
  { slug: 'user-guide', file: 'USER_GUIDE.md', title: '用户操作手册', desc: '使用流程与 FAQ' },
  { slug: 'deployment', file: 'DEPLOYMENT.md', title: '部署运维', desc: '环境、建表、上线' },
];

export function getDocHtml(slug: string): { html: string; found: boolean } {
  const meta = docs.find((d) => d.slug === slug);
  if (!meta) return { html: '', found: false };
  try {
    const raw = readFileSync(join(process.cwd(), 'docs', meta.file), 'utf-8');
    const html = marked.parse(raw, { async: false }) as string;
    return { html, found: true };
  } catch {
    return { html: '', found: false };
  }
}

export function listDocs(): DocMeta[] {
  return docs;
}

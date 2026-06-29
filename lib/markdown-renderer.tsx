'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import katex from 'katex';

const STYLES = `
.katex { font-size: 1.1em; }
.katex-display { display: block; text-align: center; margin: 8px 0; overflow-x: auto; overflow-y: hidden; }
.markdown-body { line-height: 1.7; color: #333; font-size: 14px; }
.markdown-body p { margin: 6px 0; }
.markdown-body ul, .markdown-body ol { margin: 6px 0; padding-left: 20px; }
.markdown-body li { margin-bottom: 3px; }
.markdown-body strong { color: #1a1a2e; }
.markdown-body code { background: #f0f3ff; color: #667eea; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: ui-monospace, monospace; }
.markdown-body pre { background: #1a1a2e; color: #e8ecf5; padding: 12px; border-radius: 8px; overflow: auto; font-size: 13px; line-height: 1.5; margin: 8px 0; }
.markdown-body pre code { background: none; color: inherit; padding: 0; }
.markdown-body h3 { font-size: 15px; font-weight: 600; margin: 12px 0 6px; color: #1a1a2e; }
.markdown-body h4 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; color: #1a1a2e; }
.markdown-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; }
.markdown-body th, .markdown-body td { border: 1px solid #e0e4ee; padding: 6px 10px; text-align: left; }
.markdown-body th { background: #f0f3ff; font-weight: 600; }
.markdown-body tr:nth-child(even) td { background: #fafbff; }
.markdown-body blockquote { border-left: 3px solid #667eea; margin: 8px 0; padding: 4px 14px; background: #f8f9fc; color: #555; border-radius: 0 8px 8px 0; }
`;

function renderMath(text: string): string {
  const inlineRegex = /\$(.+?)\$/g;
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;

  let result = text;

  result = result.replace(blockRegex, (_, formula: string) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<div class="katex-error">${formula}</div>`;
    }
  });

  result = result.replace(inlineRegex, (_, formula: string) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="katex-error">${formula}</span>`;
    }
  });

  return result;
}

function renderMarkdown(text: string): string {
  const withMath = renderMath(text);
  try {
    return marked.parse(withMath, { async: false }) as string;
  } catch {
    return text;
  }
}

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(content || ''), [content]);

  return (
    <>
      <style>{STYLES}</style>
      <div
        className={`markdown-body ${className || ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

import { useMemo } from 'react';
import katex from 'katex';

/** HTML 특수문자 이스케이프 (XSS 방지) */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 텍스트 내 $...$ 또는 $$...$$ LaTeX 수식을 KaTeX로 렌더링하는 컴포넌트 */
export default function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMath(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** $...$ (인라인) 및 $$...$$ (디스플레이) 수식을 KaTeX HTML로 변환 */
function renderMath(input: string): string {
  /**
   * 수식/비수식 구간을 분리하여 처리:
   * 1) $$...$$ 디스플레이 수식 ([\s\S]+? 로 줄바꿈 포함)
   * 2) $...$ 인라인 수식 ((?<!\$) lookbehind로 $$ 오탐 방지)
   * 비수식 텍스트는 HTML 이스케이프 적용
   */
  const tokens: string[] = [];
  /** $$...$$ 또는 (?<!\$)$...$(?!\$) 매칭 */
  const mathRegex = /\$\$([\s\S]+?)\$\$|(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(input)) !== null) {
    /** 수식 앞의 일반 텍스트 이스케이프 */
    if (match.index > lastIndex) {
      tokens.push(escapeHtml(input.slice(lastIndex, match.index)));
    }

    const displayTex = match[1]; // $$...$$ 그룹
    const inlineTex = match[2];  // $...$ 그룹

    if (displayTex !== undefined) {
      try {
        tokens.push(katex.renderToString(displayTex.trim(), { displayMode: true, throwOnError: false }));
      } catch {
        tokens.push(escapeHtml(displayTex));
      }
    } else if (inlineTex !== undefined) {
      try {
        tokens.push(katex.renderToString(inlineTex.trim(), { displayMode: false, throwOnError: false }));
      } catch {
        tokens.push(escapeHtml(inlineTex));
      }
    }

    lastIndex = match.index + match[0].length;
  }

  /** 남은 텍스트 이스케이프 */
  if (lastIndex < input.length) {
    tokens.push(escapeHtml(input.slice(lastIndex)));
  }

  return tokens.join('');
}

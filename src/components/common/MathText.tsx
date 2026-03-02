import { useMemo } from 'react';
import katex from 'katex';

/** 텍스트 내 $...$ 또는 $$...$$ LaTeX 수식을 KaTeX로 렌더링하는 컴포넌트 */
export default function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMath(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** $...$ (인라인) 및 $$...$$ (디스플레이) 수식을 KaTeX HTML로 변환 */
function renderMath(input: string): string {
  /** $$...$$ 디스플레이 수식 먼저 처리 */
  let result = input.replace(/\$\$(.+?)\$\$/g, (_match, tex: string) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return tex;
    }
  });

  /** $...$ 인라인 수식 처리 */
  result = result.replace(/\$(.+?)\$/g, (_match, tex: string) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return tex;
    }
  });

  return result;
}

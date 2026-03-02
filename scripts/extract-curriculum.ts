/** 수학과 교육과정 PDF → 텍스트 추출 (pdfjs-dist 직접 사용) */
import { readFileSync, writeFileSync } from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = 'data/[별책8] 수학과 교육과정.pdf';
const OUT_PATH = 'data/math-curriculum-2022.txt';

async function main() {
  const buf = readFileSync(PDF_PATH);
  const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
  console.log('Pages:', doc.numPages);

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: unknown) => 'str' in (item as object))
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ');
    pages.push(text);
    if (i % 50 === 0) console.log(`  ${i}/${doc.numPages} 페이지 처리...`);
  }

  const fullText = pages.join('\n\n');
  console.log('Text length:', fullText.length);
  writeFileSync(OUT_PATH, fullText, 'utf-8');
  console.log('Saved to', OUT_PATH);
  console.log('\n=== 첫 3000자 ===');
  console.log(fullText.substring(0, 3000));
}

main().catch(console.error);

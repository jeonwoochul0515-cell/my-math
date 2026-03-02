/**
 * 2022 개정 수학과 교육과정 텍스트 → Supabase curriculum_sections 업로드
 *
 * 사용법: npm run upload:curriculum
 * (tsx --env-file=.env scripts/upload-curriculum.ts)
 */

import { readFileSync } from 'fs';
import { supabase } from './lib/supabase-client.js';

const CURRICULUM_PATH = 'data/math-curriculum-2022.txt';

/** 섹션 정의: 줄 번호는 1-based (Read 도구와 동일) */
interface SectionDef {
  sectionKey: string;
  gradeGroup: string;
  title: string;
  lineStart: number; // 1-based inclusive
  lineEnd: number;   // 1-based inclusive
  domains: string[];
}

const SECTIONS: SectionDef[] = [
  {
    sectionKey: 'elem_12',
    gradeGroup: '초1-2',
    title: '초등학교 1~2학년 성취기준',
    lineStart: 33,
    lineEnd: 44,
    domains: ['수와 연산', '변화와 관계', '도형과 측정', '자료와 가능성'],
  },
  {
    sectionKey: 'elem_34',
    gradeGroup: '초3-4',
    title: '초등학교 3~4학년 성취기준',
    lineStart: 45,
    lineEnd: 60,
    domains: ['수와 연산', '변화와 관계', '도형과 측정', '자료와 가능성'],
  },
  {
    sectionKey: 'elem_56',
    gradeGroup: '초5-6',
    title: '초등학교 5~6학년 성취기준',
    lineStart: 61,
    lineEnd: 76,
    domains: ['수와 연산', '변화와 관계', '도형과 측정', '자료와 가능성'],
  },
  {
    sectionKey: 'middle_123',
    gradeGroup: '중1-3',
    title: '중학교 1~3학년 성취기준',
    lineStart: 77,
    lineEnd: 114,
    domains: ['수와 연산', '변화와 관계', '도형과 측정', '자료와 가능성'],
  },
  {
    sectionKey: 'common_math_1',
    gradeGroup: '공통수학1',
    title: '공통수학1 성취기준',
    lineStart: 129,
    lineEnd: 138,
    domains: ['다항식', '방정식과 부등식', '경우의 수', '행렬'],
  },
  {
    sectionKey: 'common_math_2',
    gradeGroup: '공통수학2',
    title: '공통수학2 성취기준',
    lineStart: 139,
    lineEnd: 154,
    domains: ['도형의 방정식', '집합과 명제', '함수와 그래프'],
  },
  {
    sectionKey: 'algebra',
    gradeGroup: '대수',
    title: '대수 성취기준',
    lineStart: 205,
    lineEnd: 231,
    domains: ['지수함수와 로그함수', '삼각함수', '수열'],
  },
  {
    sectionKey: 'calculus_1',
    gradeGroup: '미적분I',
    title: '미적분I 성취기준',
    lineStart: 238,
    lineEnd: 259,
    domains: ['함수의 극한과 연속', '미분', '적분'],
  },
  {
    sectionKey: 'prob_stat',
    gradeGroup: '확률과통계',
    title: '확률과 통계 성취기준',
    lineStart: 266,
    lineEnd: 292,
    domains: ['순열과 조합', '확률', '통계'],
  },
  {
    sectionKey: 'calculus_2',
    gradeGroup: '미적분II',
    title: '미적분II 성취기준',
    lineStart: 300,
    lineEnd: 326,
    domains: ['여러 가지 미분법', '여러 가지 적분법', '미분방정식'],
  },
  {
    sectionKey: 'geometry',
    gradeGroup: '기하',
    title: '기하 성취기준',
    lineStart: 327,
    lineEnd: 354,
    domains: ['이차곡선', '평면벡터', '공간도형과 공간좌표'],
  },
];

/** 페이지 머리글 노이즈 제거 */
function cleanPageHeaders(text: string): string {
  return text
    .replace(/공통 교육과정\s+\d+/g, '')
    .replace(/수학과 교육과정\s+\d+/g, '')
    .replace(/선택 중심 교육과정\s+[–\-]\s*공통 과목\s*-?\s*\d+/g, '')
    .replace(/선택 중심 교육과정\s+[–\-]\s*일반 선택 과목\s*-?\s*\d+/g, '')
    .replace(/선택 중심 교육과정\s+[–\-]\s*진로 선택 과목\s*-?\s*\d+/g, '')
    .replace(/선택 중심 교육과정\s+[–\-]\s*융합 선택 과목\s*-?\s*\d+/g, '')
    .replace(/\s{3,}/g, '  ')
    .trim();
}

async function main() {
  console.log('=== 2022 교육과정 Supabase 업로드 ===\n');

  /** 텍스트 파일 읽기 */
  const raw = readFileSync(CURRICULUM_PATH, 'utf-8');
  const lines = raw.split('\n');
  console.log(`총 ${lines.length}줄 읽음\n`);

  /** 각 섹션 추출 및 업로드 */
  let totalChars = 0;
  let successCount = 0;

  for (const sec of SECTIONS) {
    /** 줄 범위 추출 (1-based → 0-based) */
    const sectionLines = lines.slice(sec.lineStart - 1, sec.lineEnd);
    const content = cleanPageHeaders(sectionLines.join('\n'));

    console.log(
      `[${sec.sectionKey}] ${sec.title}: ` +
      `줄 ${sec.lineStart}-${sec.lineEnd} (${sectionLines.length}줄), ` +
      `${content.length.toLocaleString()}자`
    );

    /** Supabase upsert */
    const { error } = await supabase
      .from('curriculum_sections')
      .upsert(
        {
          section_key: sec.sectionKey,
          grade_group: sec.gradeGroup,
          title: sec.title,
          content,
          domains: sec.domains,
        },
        { onConflict: 'section_key' }
      );

    if (error) {
      console.error(`  ❌ 업로드 실패: ${error.message}`);
    } else {
      console.log(`  ✅ 업로드 성공`);
      successCount++;
      totalChars += content.length;
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`성공: ${successCount}/${SECTIONS.length}`);
  console.log(`총 문자 수: ${totalChars.toLocaleString()}`);
}

main().catch(console.error);

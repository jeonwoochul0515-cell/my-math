/**
 * Gemini API를 사용한 일본 수학 문제 현지화 번역
 *
 * 단순 번역이 아닌 완전 현지화:
 * - 일본 이름 → 한국 이름 (太郎→민수, 花子→영희)
 * - 엔화 → 원화 (×10 스케일링)
 * - 일본 지명 → 한국 지명 (東京→서울)
 * - 수학 표기 → 한국 관습 (≦→≤)
 * - 한국 교육과정 성취기준 코드 매칭
 * - 교육과정 범위 밖 문제 제외
 */

import { getAllGrades, getTopicList, getStandardsForTopic } from '../../src/data/curriculum2022.js';
import type { JapanRawProblem, TranslatedProblem, TranslationBatchResult } from './japan-types.js';
import type { CurriculumMapping } from './japan-korea-curriculum.js';
import { delay } from './voyage-embed.js';

// ─────────────────────────────────────────────
// Gemini API 호출
// ─────────────────────────────────────────────

/** 번역용 모델 */
export const TRANSLATE_MODEL = 'gemini-2.5-flash';

/** Gemini API 응답 타입 */
interface GeminiResponse {
  candidates?: { content: { parts: { text: string }[] } }[];
  error?: { message: string; code: number };
}

/**
 * Gemini API 직접 호출 (스크립트용)
 * 429 에러 시 지수 백오프 재시도 (최대 5회)
 */
async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TRANSLATE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 65536,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    /** 429 속도 제한 → 지수 백오프 */
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = Math.pow(2, attempt + 1) * 1000;
      console.warn(`  ⏳ Gemini API 속도 제한 — ${waitMs / 1000}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
      await delay(waitMs);
      continue;
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini API 오류 (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      throw new Error(`Gemini API 오류: ${data.error.message}`);
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API가 빈 응답을 반환했습니다.');
    }

    let text = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
    /** JSON 코드블록 제거 */
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    return text;
  }

  throw new Error('Gemini API 최대 재시도 횟수 초과');
}

// ─────────────────────────────────────────────
// 교육과정 데이터 빌드
// ─────────────────────────────────────────────

/** 프롬프트에 주입할 한국 교육과정 전체 성취기준 텍스트 생성 */
function buildCurriculumContext(): string {
  const grades = getAllGrades();
  const lines: string[] = [];

  for (const grade of grades) {
    const topics = getTopicList(grade);
    if (topics.length === 0) continue;

    lines.push(`\n### ${grade}`);
    for (const topic of topics) {
      const standards = getStandardsForTopic(grade, topic);
      if (standards.length === 0) {
        lines.push(`- ${topic}`);
      } else {
        const stdStr = standards.map((s) => `${s.code} ${s.description}`).join(' / ');
        lines.push(`- ${topic}: ${stdStr}`);
      }
    }
  }

  return lines.join('\n');
}

/** 프롬프트에 주입할 학년별 유효 단원명 목록 (topic 값 제한용) */
function buildValidTopicList(): string {
  const grades = getAllGrades();
  const lines: string[] = [];

  for (const grade of grades) {
    const topics = getTopicList(grade);
    if (topics.length === 0) continue;
    lines.push(`- ${grade}: ${topics.map((t) => `"${t}"`).join(', ')}`);
  }

  return lines.join('\n');
}

/** 교육과정 컨텍스트 캐시 (한 번만 빌드) */
let curriculumContextCache: string | null = null;
let validTopicListCache: string | null = null;

function getCurriculumContext(): string {
  if (!curriculumContextCache) {
    curriculumContextCache = buildCurriculumContext();
  }
  return curriculumContextCache;
}

function getValidTopicList(): string {
  if (!validTopicListCache) {
    validTopicListCache = buildValidTopicList();
  }
  return validTopicListCache;
}

// ─────────────────────────────────────────────
// 현지화 프롬프트
// ─────────────────────────────────────────────

/** 배치 번역 프롬프트 생성 */
function buildTranslationPrompt(
  problems: JapanRawProblem[],
  hints: (CurriculumMapping | null)[]
): string {
  const curriculumContext = getCurriculumContext();
  const validTopicList = getValidTopicList();

  const problemsWithHints = problems.map((p, i) => {
    const hint = hints[i];
    const hintStr = hint
      ? `\n[매핑 힌트: 한국 '${hint.koreanGrade} > ${hint.koreanTopic}' 가능성 높음]`
      : '';
    return {
      id: p.id,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      category: p.category,
      subcategory: p.subcategory,
      hint: hintStr,
    };
  });

  return `당신은 한국에서 20년, 일본에서 20년간 수학을 연구한 전문가입니다.
아래 일본 수학 문제들을 한국 학생용으로 완전히 현지화하세요.
번역된 문제에서는 일본 출처라는 흔적이 전혀 드러나지 않아야 합니다.

## 필수 현지화 규칙

### 1. 이름 변환 (일본 이름 완전 제거)
- 太郎→민수, 花子→영희, 次郎→준호, 健太→현우, 美咲→수진
- 大輔→동현, 陽菜→하은, 結衣→서연, 翔→지민, 悠→승우
- "~さん", "~くん" 등 일본어 경어 흔적 절대 남기지 않기

### 2. 통화 변환
- 円→원 (금액 ×10 적용: 100円→1,000원, 500円→5,000원)
- "~원짜리", "~원을 냈다" 등 한국식 표현

### 3. 지명 변환
- 東京→서울, 大阪→부산, 京都→경주, 名古屋→대전
- 北海道→강원도, 沖縄→제주도, 富士山→한라산
- 新幹線→KTX, 그 외 일본 지명도 적절한 한국 지명으로

### 4. 문화적 요소 변환
- おにぎり→김밥, 弁当→도시락, 畳→m²
- 文化祭→축제, 部活→동아리, お年玉→세뱃돈
- 일본 학교 체계(高校1年 등) 절대 언급 금지

### 5. 수학 표기 한국식 변환
- ≦→≤, ≧→≥
- 三平方の定理→피타고라스의 정리
- 漸化式→점화식, 場合の数→경우의 수

### 6. 문제 형식 한국식 변환
- "□に当てはまる数を求めよ" → "다음을 구하시오"
- "~であることを示せ" → "~임을 증명하시오"
- 유도형 빈칸 문제 → 직접 풀이 문제로

## 한국 2022 개정 교육과정 성취기준 (이 범위 내에서만 매핑)

${curriculumContext}

## ⚠️ grade와 topic 값 제한 (반드시 아래 목록에서만 선택!)

grade와 topic은 반드시 아래 목록의 정확한 문자열만 사용하세요.
자의적으로 단원명을 만들거나 변형하면 안 됩니다.

${validTopicList}

예시: grade="중3", topic="이차방정식" (O) / topic="이차방정식의 풀이" (X — 목록에 없음)

## 적합성 판단 기준
- fit: true → 위 성취기준 중 하나에 명확히 대응하는 문제
- fit: false → 위 성취기준에 대응하지 않는 문제 (벡터, 복소수평면, 정수론, 가설검정, 수학III 초월함수 미적분 등)

## 입력 문제들
${JSON.stringify(problemsWithHints, null, 2)}

## 출력 형식
반드시 아래 JSON 배열로만 응답하세요 (마크다운 코드블록 없이):
[
  {
    "originalId": "원본 ID",
    "content": "한국어로 현지화된 문제 (일본 흔적 없음)",
    "answer": "한국어 정답",
    "solution": "한국어 풀이 과정",
    "grade": "위 목록의 학년명 그대로 (예: 공통수학1, 중3)",
    "topic": "위 목록의 단원명 그대로 (예: 방정식과 부등식, 다항식)",
    "standardCode": "가장 가까운 성취기준 코드 (예: [10공수1-02-04])",
    "difficulty": "easy|medium|hard",
    "fit": true/false,
    "rejectReason": "fit=false일 때 사유 (한국어)",
    "translationNotes": "변경사항 요약 (예: 太郎→민수, 100円→1000원)"
  }
]`;
}

// ─────────────────────────────────────────────
// 배치 번역
// ─────────────────────────────────────────────

/**
 * 일본 문제 배치를 Gemini로 현지화 번역
 *
 * @param problems - 번역할 일본 문제 배열 (3~5개 권장)
 * @param hints - 각 문제에 대한 정적 매핑 힌트
 * @param apiKey - Gemini API 키
 * @returns 번역 결과
 */
export async function translateBatch(
  problems: JapanRawProblem[],
  hints: (CurriculumMapping | null)[],
  apiKey: string
): Promise<TranslationBatchResult> {
  const prompt = buildTranslationPrompt(problems, hints);

  try {
    const response = await callGemini(apiKey, prompt);
    const parsed = JSON.parse(response) as TranslatedProblem[];

    if (!Array.isArray(parsed)) {
      throw new Error('Gemini 응답이 배열이 아닙니다.');
    }

    /** 기본 검증 */
    const validated = parsed.filter((p) => {
      if (!p.originalId || !p.content || !p.answer) {
        return false;
      }
      return true;
    });

    return {
      translated: validated,
      failed: problems.length - validated.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ 번역 배치 실패: ${message}`);
    return { translated: [], failed: problems.length };
  }
}

/**
 * 번역 결과의 grade/topic이 한국 교육과정에 유효한지 검증
 * 유효하지 않으면 가장 가까운 값으로 보정 시도
 */
export function validateCurriculumMapping(problem: TranslatedProblem): boolean {
  const grades = getAllGrades();

  /** 학년 검증 */
  if (!grades.includes(problem.grade)) {
    return false;
  }

  /** 단원 검증 */
  const topics = getTopicList(problem.grade);
  if (!topics.includes(problem.topic)) {
    return false;
  }

  return true;
}

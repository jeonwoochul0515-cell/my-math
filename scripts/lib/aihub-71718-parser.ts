/**
 * AIHub 71718 "수학 과목 문제생성 데이터" 전용 파서
 * Sublabel JSON 1개 = 문제 1개 구조를 ProblemRecord로 변환
 *
 * 71716(풀이과정 데이터)과 형식이 다름:
 * - question_info / OCR_info 구조
 * - 정답(answer)은 이미지에만 존재 → "(참조용)" 플레이스홀더
 */

import type { ProblemRecord } from './field-mapper.js';

// ---------------------------------------------------------------------------
// 71718 JSON 타입 정의
// ---------------------------------------------------------------------------

interface QuestionInfo {
  question_grade: string;      // "M1", "M2", "M3", "H", "P3"~"P6"
  question_term: number;       // 학기 (1 or 2)
  question_unit: string;       // 단원 코드 ("01"~"07"+)
  question_topic: string;      // 세부 토픽 코드 ("7102029")
  question_topic_name: string; // "덧셈과 뺄셈의 혼합 계산 - 부호가 있는 경우"
  question_type1: string;      // "선택형" | "단답형"
  question_type2: number;
  question_condition: number;
  question_sector1: string;    // "이해" | "문제해결" 등
  question_sector2: string;    // "수와 연산" | "변화와 관계" 등
  question_step: string;       // "기본" | "발전" | "심화"
  question_difficulty: number; // 1~5
  question_contents: number;
}

interface OCRInfo {
  figure_text: string;
  question_text: string;
  question_bbox: unknown[];
}

interface Aihub71718Json {
  question_filename: string;
  id: string;
  question_info: QuestionInfo[];
  OCR_info: OCRInfo[];
}

// ---------------------------------------------------------------------------
// 71718 형식 감지
// ---------------------------------------------------------------------------

/** 71718 형식인지 확인 (question_info + OCR_info 존재) */
export function is71718Format(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const obj = json as Record<string, unknown>;
  return 'question_info' in obj && 'OCR_info' in obj;
}

// ---------------------------------------------------------------------------
// 학년 매핑
// ---------------------------------------------------------------------------

const GRADE_MAP: Record<string, string> = {
  'P3': '초3', 'P4': '초4', 'P5': '초5', 'P6': '초6',
  'M1': '중1', 'M2': '중2', 'M3': '중3',
  'H': '고등',
};

/** question_grade → DB grade 필드 */
function mapGrade(qGrade: string): string {
  return GRADE_MAP[qGrade] ?? qGrade;
}

// ---------------------------------------------------------------------------
// 단원(topic) 정규화 — 2022 교육과정 기준
// ---------------------------------------------------------------------------

/** 키워드 기반 단원 매핑 (순서 중요: 구체적인 패턴을 먼저 배치) */
const TOPIC_KEYWORDS: [RegExp, string][] = [
  // ── 중1 ──
  [/소인수|배수|약수/, '소인수분해'],
  [/순환소수/, '유리수와 순환소수'], // 중2 — 순환소수가 먼저 매칭되도록
  [/정수|유리수|수직선|부호|절댓값|대소관계/, '정수와 유리수'],
  [/일차방정식|등식.*변형|등식.*성립/, '일차방정식'],
  [/문자.*식|일차식|식의 값|수량.*식|대입/, '문자와 식'],
  [/좌표|순서쌍|사분면/, '좌표평면과 그래프'],
  [/정비례|반비례|y=ax|y=a\/x/, '정비례와 반비례'],
  [/맞꼭지각|직선.*반직선|선분.*개수|수선|수직|평행선.*거리|평행선.*각|동위각|엇각|점.*직선.*거리|평면.*위치|공간.*위치|직선.*교점|평행.*알아보기|수직.*알아보기|점.*선.*면|평면의 개수|평행선 \d개|각의 등분|각의 이등분|두 쌍.*평행|두 직선.*평행|선분의 중점/, '기본 도형'],
  [/작도|합동|대응점|대응변|대응각/, '작도와 합동'],
  [/다각형|부채꼴|원주|호.*길이|중심각.*넓이|원.*넓이|종이.*접|종이접/, '평면도형의 성질'],
  [/기둥|뿔|구.*겉넓이|입체|회전체|겨냥도.*전개도|전개도.*겨냥도|다면체|정다면체|정육면체|직육면체/, '입체도형의 성질'],
  [/도수분포|히스토그램|상대도수/, '자료의 정리와 해석'],

  // ── 중2 ──
  [/단항식|다항식.*계산|지수법칙|식의 계산/, '식의 계산'],
  [/연립.*방정식/, '연립방정식'],
  [/일차부등식|부등식/, '일차부등식'],
  [/일차함수|기울기|절편|x절편|y절편/, '일차함수'],
  [/이등변|삼각형.*성질|외심|내심|삼각형.*각|꼭지각|밑각|삼각형.*내접원|삼각형.*중점|삼각형.*등분|삼각형.*평행|삼각형.*겹|삼각형.*정해지|삼각형.*선분/, '삼각형의 성질'],
  [/평행사변형|사각형.*성질|직사각형|마름모|등변사다리꼴|사다리꼴.*중점|사다리꼴.*평행|대변|대각|사각형.*중점|사각형.*판별|정사각형.*조건|여러.*사각형/, '사각형의 성질'],
  [/닮음|축소|확대|축도|축척/, '도형의 닮음'],
  [/확률|경우의 수|수형도|도로망|색칠.*경우|길.*선택|당첨|동시.*사건/, '확률'],

  // ── 중3 ──
  [/제곱근|실수|무리수|a루트/, '제곱근과 실수'],
  [/인수분해|곱셈.*공식|다항식.*곱셈/, '다항식의 곱셈과 인수분해'],
  [/이차방정식|근의.*공식/, '이차방정식'],
  [/이차함수|포물선/, '이차함수'],
  [/삼각비|sin|cos|tan|피타고라스|유클리드|바스카라|가필드/, '삼각비'],
  [/접선.*현|원주각|중심각|원.*접선|원.*성질|원.*할선|현.*길이|내접.*사각형|원.*내접|두 원|히포크라테스|한 원 위/, '원의 성질'],
  [/대푯값|분산|표준편차|산포도/, '대푯값과 산포도'],
  [/상관관계|상관표|산점도/, '상관관계'],

  // ── 고등 ──
  [/다항식.*나눗셈|항등식|나머지.*정리|인수정리|조립제법/, '다항식'],
  [/이차.*부등식|절대값.*방정식|복소수|삼차방정식|사차방정식|고차/, '방정식과 부등식'],
  [/직선.*방정식|원.*방정식|평행이동|대칭이동|점.*거리|두 점 사이/, '도형의 방정식'],
  [/집합|명제|필요.*충분|대우|기호.*∈|기호.*⊂/, '집합과 명제'],
  [/함수.*합성|역함수|유리.*함수|무리.*함수|합성함수|함숫값|f○g|함수.*뜻/, '함수'],
  [/순열|조합|최단거리.*방법|도로.*만드는|상자.*만드는/, '경우의 수'],

  // ── 초등 (넓은 패턴) ──
  [/덧셈|뺄셈/, '덧셈과 뺄셈'],
  [/곱셈|나눗셈|몫|나머지|묶음|올림|내림/, '곱셈과 나눗셈'],
  [/분수/, '분수'],
  [/소수.*크기|소수.*관계|1보다.*소수|소수.*점|소수.*자리|÷.*소수|\(소수\)/, '소수'],
  [/비.*비율|백분율|비례식|비례배분|비율.*활용|비 알아보기|간단한 자연수의 비/, '비와 비율'],
  [/각도|예각|둔각|평각|직각.*각|각.*알아보기|삼각자.*평행|삼각자.*수선/, '도형'],
  [/넓이|부피|들이|무게|길이|㎡|㎠|㎤|㎥|km|cm|mm|측정|60초/, '측정'],
  [/규칙|패턴|대응.*관계/, '규칙성'],
  [/자료|그래프|표|가능성|평균|물결선/, '자료와 가능성'],
  [/모양.*만들기|수.*비교|십만|백만|천만/, '수와 연산'],
];

/**
 * question_grade + question_sector2 기반 폴백 매핑
 * 키워드 매칭 실패 시 사용
 */
const SECTOR_FALLBACK: Record<string, Record<string, string>> = {
  '중1': { '수와 연산': '정수와 유리수', '문자와 식': '일차방정식', '함수': '좌표평면과 그래프', '기하': '기본 도형', '확률과 통계': '자료의 정리와 해석' },
  '중2': { '수와 연산': '유리수와 순환소수', '문자와 식': '식의 계산', '함수': '일차함수', '기하': '삼각형의 성질', '확률과 통계': '확률' },
  '중3': { '수와 연산': '제곱근과 실수', '문자와 식': '이차방정식', '함수': '이차함수', '기하': '삼각비', '확률과 통계': '대푯값과 산포도' },
  '고등': { '수와 연산': '다항식', '문자와 식': '방정식과 부등식', '변화와 관계': '함수', '기하': '도형의 방정식', '확률과 통계': '경우의 수' },
  '초3': { '수와 연산': '덧셈과 뺄셈', '도형과 측정': '도형', '변화와 관계': '규칙성', '자료와 가능성': '자료와 가능성' },
  '초4': { '수와 연산': '곱셈과 나눗셈', '도형과 측정': '도형', '변화와 관계': '규칙성', '자료와 가능성': '자료와 가능성' },
  '초5': { '수와 연산': '분수', '도형과 측정': '측정', '변화와 관계': '비와 비율', '자료와 가능성': '자료와 가능성' },
  '초6': { '수와 연산': '분수', '도형과 측정': '측정', '변화와 관계': '비와 비율', '자료와 가능성': '자료와 가능성' },
};

/** question_topic_name → 2022 교육과정 단원명 */
function normalizeTopic(topicName: string, grade: string, sector2: string): string {
  /** 1단계: 키워드 매칭 */
  for (const [pattern, topic] of TOPIC_KEYWORDS) {
    if (pattern.test(topicName)) {
      return topic;
    }
  }

  /** 2단계: grade + sector2 폴백 */
  const gradeMap = SECTOR_FALLBACK[grade];
  if (gradeMap) {
    const fallback = gradeMap[sector2];
    if (fallback) return fallback;
  }

  /** 3단계: 매칭 실패 시 원본 사용 */
  return topicName;
}

// ---------------------------------------------------------------------------
// 난이도 매핑
// ---------------------------------------------------------------------------

/** question_difficulty(숫자) + question_step(텍스트) → easy/medium/hard */
function mapDifficulty(diff: number, step: string): string {
  if (step === '심화' || diff >= 4) return 'hard';
  if (step === '기본' && diff <= 2) return 'easy';
  return 'medium';
}

// ---------------------------------------------------------------------------
// 메인 파서
// ---------------------------------------------------------------------------

/**
 * 71718 JSON 1개를 ProblemRecord로 변환
 *
 * @param json - 파싱된 71718 JSON 객체
 * @returns ProblemRecord 또는 null (필수 필드 누락 시)
 */
export function parse71718Json(json: unknown): ProblemRecord | null {
  const data = json as Aihub71718Json;

  if (!data?.question_info?.length || !data?.OCR_info?.length) {
    return null;
  }

  const qInfo = data.question_info[0];
  const ocrInfo = data.OCR_info[0];

  /** 문제 텍스트 추출 */
  const content = ocrInfo?.question_text?.trim();
  if (!content) return null;

  /** 학년 매핑 */
  const grade = mapGrade(qInfo.question_grade);

  /** 단원 매핑 (2022 교육과정) — grade + sector2 폴백 포함 */
  const topic = normalizeTopic(
    qInfo.question_topic_name ?? '',
    grade,
    qInfo.question_sector2 ?? ''
  );
  if (!topic) return null;

  /** 난이도 매핑 */
  const difficulty = mapDifficulty(
    qInfo.question_difficulty ?? 3,
    qInfo.question_step ?? '기본'
  );

  return {
    content,
    answer: '(참조용)',
    solution: null,
    grade,
    topic,
    difficulty,
    source: 'aihub-71718',
  };
}

/**
 * AIHub "수학 교과 문제 풀이과정 데이터" 전용 파서
 * 개별 JSON 파일 1개 = 문제 1개 구조를 problem_embeddings 레코드로 변환
 */

import type { ProblemRecord } from './field-mapper.js';

/** AIHub 원본 데이터 타입 */
interface AihubRawDataInfo {
  school: string;       // "고등학교", "중학교"
  grade: string;        // "1학년", "2학년", "3학년"
  semester: string;     // "1학기", "2학기"
  subject: string;      // "수학"
  publisher: string;
}

interface AihubSourceDataInfo {
  source_data_name: string;
  '2015_achievement_standard': string[];
  '2022_achievement_standard': string[];
  level_of_difficulty: string;  // "상", "중", "하"
  types_of_problems: string;    // "주관식", "객관식"
}

interface AihubClassInfo {
  Type: string;
  Type_value: number[][];
  text_description: string;
}

interface AihubLearningData {
  class_num: number;
  class_name: string;   // "문항(텍스트)", "정답(텍스트)", "해설(텍스트)", "해설(이미지)"
  class_info_list: AihubClassInfo[];
}

interface AihubJson {
  raw_data_info: AihubRawDataInfo;
  source_data_info: AihubSourceDataInfo;
  learning_data_info: AihubLearningData[];
}

// ---------------------------------------------------------------------------
// 학년 매핑
// ---------------------------------------------------------------------------

/**
 * AIHub의 school + grade + semester → DB grade 필드로 변환 (2022 개정 교육과정)
 * 예: "고등학교" + "1학년" + "1학기" → "공통수학1"
 */
function mapGrade(raw: AihubRawDataInfo): string {
  const { school, grade, semester } = raw;

  if (school === '중학교') {
    const num = grade.replace(/[^0-9]/g, '');
    return `중${num}`; // "중1", "중2", "중3"
  }

  if (school === '고등학교') {
    const num = grade.replace(/[^0-9]/g, '');
    if (num === '1') {
      return semester === '1학기' ? '공통수학1' : '공통수학2';
    }
    /** 고2/고3: 2022 개정에서는 선택과목(대수/미적분I/확률과통계)으로 분리 */
    if (num === '2' || num === '3') {
      return '미적분I'; // 기본값, 성취기준 코드로 세분화는 extractTopic에서 처리
    }
  }

  // 매핑 실패 시 원본 조합
  return `${school} ${grade}`;
}

// ---------------------------------------------------------------------------
// 단원(topic) 추출
// ---------------------------------------------------------------------------

/**
 * 성취기준 코드 → 2022 개정 교육과정 단원 매핑
 * 개별 코드를 정확히 매핑 (접두사 매칭은 fallback)
 */
const CODE_TO_TOPIC: Record<string, string> = {
  // ── 중1: 소인수분해 ──
  '9수01-01': '소인수분해',
  '9수01-02': '소인수분해',
  // ── 중1: 정수와 유리수 ──
  '9수01-03': '정수와 유리수',
  '9수01-04': '정수와 유리수',
  '9수01-05': '정수와 유리수',
  // ── 중2: 유리수와 순환소수 ──
  '9수01-06': '유리수와 순환소수',
  // ── 중3: 제곱근과 실수 ──
  '9수01-07': '제곱근과 실수',
  '9수01-08': '제곱근과 실수',
  '9수01-09': '제곱근과 실수',
  '9수01-10': '제곱근과 실수',
  // ── 중1: 문자와 식 ──
  '9수02-01': '문자와 식',
  '9수02-02': '문자와 식',
  '9수02-03': '문자와 식',
  // ── 중1: 일차방정식 ──
  '9수02-04': '일차방정식',
  '9수02-05': '일차방정식',
  // ── 중2: 식의 계산 ──
  '9수02-06': '식의 계산',
  '9수02-07': '식의 계산',
  '9수02-08': '식의 계산',
  // ── 중2: 일차부등식 ──
  '9수02-09': '일차부등식',
  '9수02-10': '일차부등식',
  // ── 중2: 연립방정식 ──
  '9수02-11': '연립방정식',
  // ── 중3: 다항식의 곱셈과 인수분해 ──
  '9수02-12': '다항식의 곱셈과 인수분해',
  // ── 중3: 이차방정식 ──
  '9수02-13': '이차방정식',
  // ── 중1: 좌표평면과 그래프 ──
  '9수03-01': '좌표평면과 그래프',
  '9수03-02': '좌표평면과 그래프',
  // ── 중1: 정비례와 반비례 ──
  '9수03-03': '정비례와 반비례',
  // ── 중2: 일차함수 ──
  '9수03-04': '일차함수',
  '9수03-05': '일차함수',
  '9수03-06': '일차함수',
  '9수03-07': '일차함수',
  '9수03-08': '일차함수',
  // ── 중3: 이차함수 ──
  '9수03-09': '이차함수',
  '9수03-10': '이차함수',
  // ── 중1: 기본 도형 ──
  '9수04-01': '기본 도형',
  '9수04-02': '기본 도형',
  // ── 중1: 작도와 합동 ──
  '9수04-03': '작도와 합동',
  '9수04-04': '작도와 합동',
  // ── 중1: 평면도형의 성질 ──
  '9수04-05': '평면도형의 성질',
  '9수04-06': '평면도형의 성질',
  // ── 중1: 입체도형의 성질 ──
  '9수04-07': '입체도형의 성질',
  '9수04-08': '입체도형의 성질',
  '9수04-09': '입체도형의 성질',
  // ── 중2: 삼각형의 성질 ──
  '9수04-10': '삼각형의 성질',
  '9수04-11': '삼각형의 성질',
  // ── 중2: 사각형의 성질 ──
  '9수04-12': '사각형의 성질',
  // ── 중2: 도형의 닮음 ──
  '9수04-13': '도형의 닮음',
  '9수04-14': '도형의 닮음',
  '9수04-15': '도형의 닮음',
  // ── 중3: 삼각비 ──
  '9수04-16': '삼각비',
  '9수04-17': '삼각비',
  '9수04-18': '삼각비',
  // ── 중3: 원의 성질 ──
  '9수04-19': '원의 성질',
  '9수04-20': '원의 성질',
  // ── 중1: 자료의 정리와 해석 ──
  '9수05-01': '자료의 정리와 해석',
  '9수05-02': '자료의 정리와 해석',
  // ── 중2: 확률 ──
  '9수05-04': '확률',
  '9수05-05': '확률',
  // ── 중3: 대푯값과 산포도 ──
  '9수05-06': '대푯값과 산포도',
  '9수05-07': '대푯값과 산포도',
  // ── 중3: 상관관계 ──
  '9수05-08': '상관관계',
  // ── 공통수학1: 다항식 (2015 코드) ──
  '10수학01-01': '다항식',
  '10수학01-02': '다항식',
  '10수학01-03': '다항식',
  '10수학01-04': '다항식',
  // ── 공통수학1: 방정식과 부등식 (2015 코드) ──
  '10수학01-05': '방정식과 부등식',
  '10수학01-06': '방정식과 부등식',
  '10수학01-07': '방정식과 부등식',
  '10수학01-08': '방정식과 부등식',
  '10수학01-09': '방정식과 부등식',
  '10수학01-10': '방정식과 부등식',
  '10수학01-11': '방정식과 부등식',
  '10수학01-12': '방정식과 부등식',
  '10수학01-13': '방정식과 부등식',
  '10수학01-14': '방정식과 부등식',
  '10수학01-15': '방정식과 부등식',
  '10수학01-16': '방정식과 부등식',
  // ── 공통수학1: 도형의 방정식 (2015 코드) ──
  '10수학02-01': '도형의 방정식',
  '10수학02-02': '도형의 방정식',
  '10수학02-03': '도형의 방정식',
  '10수학02-04': '도형의 방정식',
  '10수학02-05': '도형의 방정식',
  '10수학02-06': '도형의 방정식',
  '10수학02-07': '도형의 방정식',
  '10수학02-08': '도형의 방정식',
  '10수학02-09': '도형의 방정식',
  // ── 공통수학2: 집합과 명제 (2015 코드) ──
  '10수학03-01': '집합과 명제',
  '10수학03-02': '집합과 명제',
  '10수학03-03': '집합과 명제',
  '10수학03-04': '집합과 명제',
  '10수학03-05': '집합과 명제',
  '10수학03-06': '집합과 명제',
  '10수학03-07': '집합과 명제',
  '10수학03-08': '집합과 명제',
  // ── 공통수학2: 함수 (2015 코드) ──
  '10수학04-01': '함수',
  '10수학04-02': '함수',
  '10수학04-03': '함수',
  '10수학04-04': '함수',
  '10수학04-05': '함수',
  // ── 공통수학2: 경우의 수 (2015 코드) ──
  '10수학05-01': '경우의 수',
  '10수학05-02': '경우의 수',
  '10수학05-03': '경우의 수',
  // ── 공통수학 2022 코드 ──
  '10공수1-01': '다항식',
  '10공수1-02': '방정식과 부등식',
  '10공수1-03': '도형의 방정식',
  '10공수2-01': '집합과 명제',
  '10공수2-02': '함수',
  '10공수2-03': '경우의 수',
  // ── 대수 ──
  '12수학I-01': '지수와 로그',
  '12수학I-03': '수열',
  '12대수-01': '지수와 로그',
  '12대수-02': '수열',
  // ── 미적분I ──
  '12수학I-02': '삼각함수',
  '12수학II-01': '함수의 극한과 연속',
  '12수학II-02': '미분',
  '12수학II-03': '적분',
  '12미적I-01': '삼각함수',
  '12미적I-02': '함수의 극한과 연속',
  '12미적I-03': '미분',
  '12미적I-04': '적분',
  // ── 확률과 통계 ──
  '12확통-01': '순열과 조합',
  '12확통-02': '확률',
  '12확통-03': '통계',
};

/**
 * 성취기준 텍스트에서 단원을 추출 (2022 개정 교육과정)
 * 예: "[10수학01-01] 다항식의 사칙연산을 할 수 있다." → "다항식"
 */
function extractTopic(standards: string[]): string {
  for (const std of standards) {
    const trimmed = std.trim();
    if (!trimmed || trimmed === ' ') continue;

    /** [코드] 형태에서 코드 추출 */
    const codeMatch = trimmed.match(/\[([^\]]+)\]/);
    if (!codeMatch) continue;

    const fullCode = codeMatch[1]; // "9수01-01", "10수학01-01", "10공수1-01"

    /** 1단계: 정확한 코드 매핑 (개별 성취기준 코드) */
    if (CODE_TO_TOPIC[fullCode]) {
      return CODE_TO_TOPIC[fullCode];
    }

    /** 2단계: 2022 코드의 경우 상위 코드로 재시도 (예: "10공수1-01-01" → "10공수1-01") */
    const parentCode = fullCode.replace(/-\d+$/, '');
    if (parentCode !== fullCode && CODE_TO_TOPIC[parentCode]) {
      return CODE_TO_TOPIC[parentCode];
    }
  }

  return '기타';
}

// ---------------------------------------------------------------------------
// 난이도 매핑
// ---------------------------------------------------------------------------

function mapDifficulty(level: string): string {
  const l = level.trim();
  if (l === '상') return 'hard';
  if (l === '하') return 'easy';
  return 'medium'; // "중" 또는 기타
}

// ---------------------------------------------------------------------------
// 학습 데이터에서 문항/정답/해설 추출
// ---------------------------------------------------------------------------

/**
 * learning_data_info에서 class_name 기준으로 텍스트 추출
 */
function extractByClassName(
  data: AihubLearningData[],
  targetName: string
): string {
  const texts: string[] = [];

  for (const section of data) {
    if (section.class_name.includes(targetName)) {
      for (const info of section.class_info_list) {
        if (info.text_description?.trim()) {
          texts.push(info.text_description.trim());
        }
      }
    }
  }

  return texts.join('\n');
}

// ---------------------------------------------------------------------------
// 메인 파서
// ---------------------------------------------------------------------------

/**
 * AIHub JSON 1개를 ProblemRecord로 변환
 *
 * @param json - 파싱된 AIHub JSON 객체
 * @returns ProblemRecord 또는 null (필수 필드 누락 시)
 */
export function parseAihubJson(json: unknown): ProblemRecord | null {
  const data = json as AihubJson;

  if (!data?.raw_data_info || !data?.source_data_info || !data?.learning_data_info) {
    return null;
  }

  /** 문항 텍스트 추출 */
  const content = extractByClassName(data.learning_data_info, '문항');
  if (!content) return null;

  /** 정답 추출 */
  const answer = extractByClassName(data.learning_data_info, '정답');
  if (!answer) return null;

  /** 해설 추출 (텍스트 + 이미지 해설 모두) */
  const solution = extractByClassName(data.learning_data_info, '해설') || null;

  /** 학년 매핑 */
  const grade = mapGrade(data.raw_data_info);

  /** 단원 추출 (2015 기준 우선, 없으면 2022 기준) */
  const standards = [
    ...data.source_data_info['2015_achievement_standard'],
    ...data.source_data_info['2022_achievement_standard'],
  ];
  const topic = extractTopic(standards);

  /** 난이도 매핑 */
  const difficulty = mapDifficulty(data.source_data_info.level_of_difficulty);

  return {
    content,
    answer,
    solution,
    grade,
    topic,
    difficulty,
    source: 'aihub',
  };
}

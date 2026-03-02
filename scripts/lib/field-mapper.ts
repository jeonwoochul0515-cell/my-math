/**
 * AIHub JSON 필드 매핑 유틸리티
 * 다양한 AIHub 데이터 형식에 대응하는 유연한 필드 매퍼
 */

/** Supabase problem_embeddings 테이블에 삽입할 레코드 타입 */
export interface ProblemRecord {
  content: string;
  answer: string;
  solution: string | null;
  grade: string;
  topic: string;
  difficulty: string;
  source: string;
}

/** 필드 매핑 설정 (각 필드별 후보 키 목록) */
interface FieldMapping {
  content: string[];
  answer: string[];
  solution: string[];
  grade: string[];
  topic: string[];
  difficulty: string[];
}

/** 기본 필드 매핑 - AIHub 수학 데이터에서 자주 쓰이는 키들 */
const DEFAULT_MAPPING: FieldMapping = {
  content: ['question', 'content', 'problem', '문제', 'text', 'problem_text'],
  answer: ['answer', 'correct_answer', '정답', 'ans', 'correct'],
  solution: ['explanation', 'solution', '풀이', '해설', 'solve', 'solving'],
  grade: ['grade', '학년', 'school_grade', 'level_grade'],
  topic: ['category', 'topic', '단원', 'unit', 'subject', 'chapter'],
  difficulty: ['level', 'difficulty', '난이도', 'diff', 'problem_level'],
};

/**
 * 난이도 값을 표준화 (easy/medium/hard)
 * 한국어, 영어, 숫자 모두 처리
 */
function normalizeDifficulty(value: string): string {
  const lower = value.toLowerCase().trim();

  /** hard 매핑 */
  if (['상', '어려움', '어려운', 'hard', 'difficult', 'high', '3', 'h'].includes(lower)) {
    return 'hard';
  }

  /** easy 매핑 */
  if (['하', '쉬움', '쉬운', 'easy', 'low', '1', 'e', 'basic'].includes(lower)) {
    return 'easy';
  }

  /** medium (기본값) */
  return 'medium';
}

/**
 * 객체에서 후보 키 목록 중 첫 번째로 값이 있는 것을 반환
 */
function findField(
  obj: Record<string, unknown>,
  candidates: string[]
): string | null {
  for (const key of candidates) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return null;
}

/**
 * 단일 AIHub 레코드를 ProblemRecord로 변환
 * 필수 필드(content, answer, grade, topic)가 없으면 null 반환
 *
 * @param raw - AIHub JSON의 개별 레코드
 * @param customMapping - 커스텀 필드 매핑 (선택)
 * @returns 변환된 레코드 또는 null (매핑 실패 시)
 */
export function mapRecord(
  raw: Record<string, unknown>,
  customMapping?: Partial<FieldMapping>
): ProblemRecord | null {
  const mapping: FieldMapping = {
    ...DEFAULT_MAPPING,
    ...customMapping,
  };

  const content = findField(raw, mapping.content);
  const answer = findField(raw, mapping.answer);
  const grade = findField(raw, mapping.grade);
  const topic = findField(raw, mapping.topic);

  /** 필수 필드 검증 */
  if (!content || !answer || !grade || !topic) {
    return null;
  }

  const solution = findField(raw, mapping.solution);
  const difficultyRaw = findField(raw, mapping.difficulty);
  const difficulty = difficultyRaw ? normalizeDifficulty(difficultyRaw) : 'medium';

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

/**
 * JSON 데이터에서 레코드 배열을 추출
 * 최상위 배열 또는 .data / .problems / .items 키를 순서대로 시도
 *
 * @param data - 파싱된 JSON 데이터
 * @returns 레코드 배열
 */
export function extractRecords(data: unknown): Record<string, unknown>[] {
  /** 최상위가 배열이면 그대로 반환 */
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  /** 객체에서 알려진 키를 순서대로 탐색 */
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidateKeys = ['data', 'problems', 'items', 'questions', 'records', 'list'];

    for (const key of candidateKeys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Record<string, unknown>[];
      }
    }
  }

  throw new Error(
    'JSON에서 레코드 배열을 찾을 수 없습니다. ' +
    '최상위가 배열이거나, data/problems/items 키에 배열이 있어야 합니다.'
  );
}

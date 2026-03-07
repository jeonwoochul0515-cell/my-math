/**
 * 일본 수학 문제 도입 관련 타입 정의
 * HuggingFace, FTEXT, Math-Aquarium 등 다양한 소스에 대응
 */

/** 일본 문제 소스 타입 */
export type JapanSourceType =
  | 'huggingface'
  | 'ftext'
  | 'math-aquarium'
  | 'kyotsu'
  | 'prefectural';

/** 스크래핑/다운로드된 원본 일본 문제 */
export interface JapanRawProblem {
  id: string;
  content: string;
  answer: string;
  solution: string;
  category: string;
  subcategory: string;
  difficulty: string;
  sourceType: JapanSourceType;
  sourceUrl: string;
}

/** Claude 번역 후 결과 */
export interface TranslatedProblem {
  originalId: string;
  content: string;
  answer: string;
  solution: string;
  grade: string;
  topic: string;
  standardCode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  fit: boolean;
  rejectReason?: string;
  translationNotes: string;
}

/** Claude API 번역 배치 응답 */
export interface TranslationBatchResult {
  translated: TranslatedProblem[];
  failed: number;
}

/** 임포트 CLI 인자 */
export interface ImportCliArgs {
  source: 'huggingface' | 'ftext' | 'math-aquarium' | 'all';
  inputPath: string;
  outputPath: string;
  dryRun: boolean;
  batchSize: number;
  delayMs: number;
  skipTranslation: boolean;
}

/** 임포트 통계 */
export interface ImportStats {
  totalRaw: number;
  excludedByCategory: number;
  excludedByClaude: number;
  translated: number;
  inserted: number;
  failed: number;
  gradeDist: Map<string, number>;
  topicDist: Map<string, number>;
}

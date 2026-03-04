/**
 * 교육과정 헬퍼 유틸리티
 * curriculum2022.ts 데이터를 활용한 편의 함수
 */
import { getGradeCurriculum, getStandardsForTopic } from '../data/curriculum2022';
import type { CurriculumStandard } from '../data/curriculum2022';

/**
 * 성취기준 코드로부터 해당 학년의 중단원(topic)을 역매핑한다.
 * 예: topicFromStandardCode('중1', '[9수01-01]') → '소인수분해'
 */
export function topicFromStandardCode(grade: string, code: string): string | undefined {
  const gc = getGradeCurriculum(grade);
  if (!gc) return undefined;
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      if (sc.standards.some((s: CurriculumStandard) => s.code === code)) {
        return sc.name;
      }
    }
  }
  return undefined;
}

/**
 * Claude 프롬프트에 넣을 교육과정 키워드 문자열을 생성한다.
 * subTopic이 있으면 해당 성취기준 설명, 없으면 전체 성취기준 코드 목록
 */
export function getStandardKeywords(grade: string, topic: string, subTopic?: string): string {
  if (subTopic) return subTopic;
  const standards = getStandardsForTopic(grade, topic);
  if (standards.length === 0) return topic;
  return standards.map((s: CurriculumStandard) => `${s.code} ${s.description}`).join('\n');
}

/**
 * 학년에 대한 전체 성취기준 수를 반환한다.
 */
export function getStandardCount(grade: string): number {
  const gc = getGradeCurriculum(grade);
  if (!gc) return 0;
  let count = 0;
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      count += sc.standards.length;
    }
  }
  return count;
}

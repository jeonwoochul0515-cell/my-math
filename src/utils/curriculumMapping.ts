/**
 * 교육과정 매핑 유틸리티
 * 학년/단원 → curriculum_sections 테이블의 section_key + 영역(domain) 매핑
 */
import { CURRICULUM_2022 } from '../data/curriculum2022';

/** 학년 → section_key 매핑 */
const GRADE_TO_SECTION: Record<string, string> = {
  '초1': 'elem_12',
  '초2': 'elem_12',
  '초3': 'elem_34',
  '초4': 'elem_34',
  '초5': 'elem_56',
  '초6': 'elem_56',
  '중1': 'middle_123',
  '중2': 'middle_123',
  '중3': 'middle_123',
  '공통수학1': 'common_math_1',
  '공통수학2': 'common_math_2',
  '대수': 'algebra',
  '미적분I': 'calculus_1',
  '확률과 통계': 'prob_stat',
  '확률과통계': 'prob_stat',
  '미적분II': 'calculus_2',
  '기하': 'geometry',
};

/**
 * curriculum2022.ts에서 자동 생성된 단원→영역(domain) 매핑
 * 초/중학교: 대단원명이 곧 영역명 (수와 연산, 변화와 관계, 도형과 측정, 자료와 가능성)
 */
const TOPIC_TO_DOMAIN: Record<string, string> = {};
for (const gc of CURRICULUM_2022) {
  const sectionKey = GRADE_TO_SECTION[gc.grade];
  // 초등/중학교만 domain 매핑 (고등은 과목 자체가 section)
  if (!sectionKey || (!sectionKey.startsWith('elem') && !sectionKey.startsWith('middle'))) continue;
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      if (!TOPIC_TO_DOMAIN[sc.name]) {
        TOPIC_TO_DOMAIN[sc.name] = mc.name;
      }
    }
  }
}

/** 교육과정 조회 결과 */
export interface CurriculumLookup {
  sectionKey: string;
  domain: string | null;
}

/**
 * 학년과 단원으로부터 교육과정 섹션 키 + 영역을 결정한다.
 * 고등 과목은 과목 자체가 section이므로 domain은 null을 반환한다.
 */
export function getCurriculumLookup(grade: string, topic: string): CurriculumLookup {
  const sectionKey = GRADE_TO_SECTION[grade] ?? '';
  if (!sectionKey) {
    return { sectionKey: '', domain: null };
  }

  /* 초등/중학교는 단원 → 영역 매핑으로 domain 결정 */
  if (sectionKey.startsWith('elem') || sectionKey.startsWith('middle')) {
    const domain = TOPIC_TO_DOMAIN[topic] ?? null;
    return { sectionKey, domain };
  }

  /* 고등 과목은 domain 불필요 */
  return { sectionKey, domain: null };
}

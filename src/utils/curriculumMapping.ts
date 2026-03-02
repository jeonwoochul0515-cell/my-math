/**
 * 교육과정 매핑 유틸리티
 * 학년/단원 → curriculum_sections 테이블의 section_key + 영역(domain) 매핑
 */

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
 * 단원 → 영역(domain) 매핑 (초/중학교 공통교육과정 4개 영역)
 * 고등 과목은 과목 자체가 section이므로 여기에 포함하지 않는다.
 */
const TOPIC_TO_DOMAIN: Record<string, string> = {
  /* 수와 연산 */
  '소인수분해': '수와 연산',
  '정수와 유리수': '수와 연산',
  '유리수와 순환소수': '수와 연산',
  '제곱근과 실수': '수와 연산',
  '덧셈과 뺄셈': '수와 연산',
  '곱셈과 나눗셈': '수와 연산',
  '분수': '수와 연산',
  '소수': '수와 연산',

  /* 변화와 관계 */
  '문자와 식': '변화와 관계',
  '일차방정식': '변화와 관계',
  '좌표평면과 그래프': '변화와 관계',
  '정비례와 반비례': '변화와 관계',
  '식의 계산': '변화와 관계',
  '일차부등식': '변화와 관계',
  '연립방정식': '변화와 관계',
  '일차함수': '변화와 관계',
  '다항식의 곱셈과 인수분해': '변화와 관계',
  '이차방정식': '변화와 관계',
  '이차함수': '변화와 관계',
  '비와 비율': '변화와 관계',
  '규칙성': '변화와 관계',

  /* 도형과 측정 */
  '기본 도형': '도형과 측정',
  '작도와 합동': '도형과 측정',
  '평면도형의 성질': '도형과 측정',
  '입체도형의 성질': '도형과 측정',
  '삼각형의 성질': '도형과 측정',
  '사각형의 성질': '도형과 측정',
  '도형의 닮음': '도형과 측정',
  '피타고라스 정리': '도형과 측정',
  '삼각비': '도형과 측정',
  '원의 성질': '도형과 측정',
  '도형': '도형과 측정',
  '측정': '도형과 측정',

  /* 자료와 가능성 */
  '자료의 정리와 해석': '자료와 가능성',
  '확률': '자료와 가능성',
  '대푯값과 산포도': '자료와 가능성',
  '상관관계': '자료와 가능성',
  '자료와 가능성': '자료와 가능성',
  '경우의 수': '자료와 가능성',
};

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

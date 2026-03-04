/**
 * 2022 개정 교육과정 수학 단원 체계
 * 교육부 고시 제2022-33호 [별책 8] 수학과 교육과정 기반
 *
 * - 초등학교 (초1~초6): 개별 학년 분리
 * - 중학교 (중1~중3): 개별 학년 분리
 * - 고등학교 (공통수학1, 공통수학2, 대수, 미적분I, 확률과 통계)
 *
 * 각 학년은 대단원(MajorChapter) → 소단원(SubChapter) → 성취기준(CurriculumStandard) 구조
 * 초·중학교 대단원명: 수와 연산, 변화와 관계, 도형과 측정, 자료와 가능성
 * 고등학교 대단원명: 과목별 내용 영역명 사용
 *
 * SubChapter.name 값은 scripts/lib/aihub-parser.ts의 CODE_TO_TOPIC과 정확히 일치해야 한다.
 */

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

/** 성취기준 코드 + 설명 */
export interface CurriculumStandard {
  code: string;
  description: string;
}

/** 소단원 (중단원에 해당) */
export interface SubChapter {
  name: string;
  standards: CurriculumStandard[];
}

/** 대단원 (영역) */
export interface MajorChapter {
  name: string;
  subChapters: SubChapter[];
}

/** 학년별 교육과정 */
export interface GradeCurriculum {
  grade: string;
  majorChapters: MajorChapter[];
}

/** 대단원 그룹 (optgroup용) */
export interface TopicGroup {
  major: string;
  topics: string[];
}

// 하위 호환을 위한 타입 별칭
export type AchievementStandard = CurriculumStandard;

// ─────────────────────────────────────────────
// 초등학교 1학년
// ─────────────────────────────────────────────

const GRADE_E1: GradeCurriculum = {
  grade: '초1',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '9까지의 수', standards: [
          { code: '[2수01-01]', description: '수의 필요성을 인식하면서 0과 100까지의 수 개념을 이해하고, 수를 세고 읽고 쓸 수 있다.' },
          { code: '[2수01-02]', description: '일, 십, 백, 천의 자릿값과 위치적 기수법을 이해하고, 네 자리 이하의 수를 읽고 쓸 수 있다.' },
        ]},
        { name: '덧셈과 뺄셈(1)', standards: [
          { code: '[2수01-05]', description: '덧셈과 뺄셈이 이루어지는 실생활 상황과 연결하여 덧셈과 뺄셈의 의미를 이해한다.' },
        ]},
        { name: '50까지의 수', standards: [
          { code: '[2수01-03]', description: '네 자리 이하의 수의 범위에서 수의 계열을 이해하고, 수의 크기를 비교할 수 있다.' },
        ]},
        { name: '덧셈과 뺄셈(2)', standards: [
          { code: '[2수01-06]', description: '두 자리 수의 범위에서 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '여러 가지 모양', standards: [
          { code: '[2수03-01]', description: '교실 및 생활 주변에서 여러 가지 물건을 관찰하여 직육면체, 원기둥, 구의 모양을 찾고, 이를 이용하여 여러 가지 모양을 만들 수 있다.' },
        ]},
        { name: '비교하기', standards: [
          { code: '[2수03-06]', description: '구체물의 길이, 들이, 무게, 넓이를 비교하여 각각 길다/짧다, 많다/적다, 무겁다/가볍다, 넓다/좁다 등을 구별하여 말할 수 있다.' },
        ]},
        { name: '시계 보기', standards: [
          { code: '[2수03-07]', description: '시계를 보고 시각을 몇 시 몇 분까지 읽을 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 초등학교 2학년
// ─────────────────────────────────────────────

const GRADE_E2: GradeCurriculum = {
  grade: '초2',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '세 자리 수', standards: [
          { code: '[2수01-02]', description: '일, 십, 백, 천의 자릿값과 위치적 기수법을 이해하고, 네 자리 이하의 수를 읽고 쓸 수 있다.' },
        ]},
        { name: '덧셈과 뺄셈', standards: [
          { code: '[2수01-06]', description: '두 자리 수의 범위에서 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
          { code: '[2수01-08]', description: '두 자리 수의 범위에서 세 수의 덧셈과 뺄셈을 할 수 있다.' },
        ]},
        { name: '곱셈', standards: [
          { code: '[2수01-10]', description: '곱셈이 이루어지는 실생활 상황과 연결하여 곱셈의 의미를 이해한다.' },
        ]},
        { name: '곱셈구구', standards: [
          { code: '[2수01-11]', description: '곱셈구구를 이해하고, 한 자리 수의 곱셈을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '규칙 찾기', standards: [
          { code: '[2수02-01]', description: '물체, 무늬, 수 등의 배열에서 규칙을 찾아 여러 가지 방법으로 표현할 수 있다.' },
          { code: '[2수02-02]', description: '자신이 정한 규칙에 따라 물체, 무늬, 수 등을 배열할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '길이 재기', standards: [
          { code: '[2수03-10]', description: '길이 단위 1cm와 1m를 알고, 이를 이용하여 주변 사물의 길이를 측정할 수 있다.' },
        ]},
        { name: '시각과 시간', standards: [
          { code: '[2수03-08]', description: '1시간과 1분의 관계를 이해하고, 시간을 시간, 분으로 표현할 수 있다.' },
          { code: '[2수03-09]', description: '실생활 문제 상황과 연결하여 1분, 1시간, 1일, 1주일, 1개월, 1년 사이의 관계를 이해한다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '분류하기', standards: [
          { code: '[2수04-01]', description: '여러 가지 사물을 정해진 기준 또는 자신이 정한 기준으로 분류하여 개수를 세어 보고, 기준에 따른 결과를 말할 수 있다.' },
          { code: '[2수04-02]', description: '자료를 분류하여 표로 나타내고, 자료를 표로 나타내면 편리한 점을 말할 수 있다.' },
          { code: '[2수04-03]', description: '자료를 분류하여 ○, ×, / 등을 이용한 그래프로 나타내고, 자료를 그래프로 나타내면 편리한 점을 말할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 초등학교 3학년
// ─────────────────────────────────────────────

const GRADE_E3: GradeCurriculum = {
  grade: '초3',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '덧셈과 뺄셈', standards: [
          { code: '[4수01-03]', description: '세 자리 수의 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
        { name: '나눗셈', standards: [
          { code: '[4수01-05]', description: '나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.' },
          { code: '[4수01-06]', description: '나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
        { name: '곱셈', standards: [
          { code: '[4수01-04]', description: '곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
        { name: '분수와 소수', standards: [
          { code: '[4수01-09]', description: '양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.' },
          { code: '[4수01-12]', description: '분모가 10인 진분수와 연결하여 소수 한 자리 수를 이해하고 읽고 쓸 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '평면도형', standards: [
          { code: '[4수03-01]', description: '직선, 선분, 반직선을 이해하고 구별할 수 있다.' },
          { code: '[4수03-02]', description: '각과 직각을 이해하고, 직각과 비교하는 활동을 통하여 예각과 둔각을 구별할 수 있다.' },
        ]},
        { name: '길이와 시간', standards: [
          { code: '[4수03-15]', description: '길이 단위 1mm와 1km를 알고, 이를 이용하여 길이를 측정하고 어림하며 수학의 유용성을 인식할 수 있다.' },
          { code: '[4수03-13]', description: '1분과 1초의 관계를 이해하고, 초 단위까지 시각을 읽을 수 있다.' },
        ]},
        { name: '원', standards: [
          { code: '[4수02-06]', description: '원의 중심, 반지름, 지름을 이해하고, 원의 성질을 탐구하고 설명할 수 있다.' },
          { code: '[4수02-07]', description: '컴퍼스를 이용하여 원을 그릴 수 있다.' },
        ]},
        { name: '삼각형', standards: [
          { code: '[4수02-08]', description: '삼각형을 변의 길이에 따라 이등변삼각형, 정삼각형으로 분류하고, 그 성질을 탐구하고 설명할 수 있다.' },
          { code: '[4수02-09]', description: '삼각형을 각의 크기에 따라 직각삼각형, 예각삼각형, 둔각삼각형으로 분류할 수 있다.' },
        ]},
        { name: '들이와 무게', standards: [
          { code: '[4수03-17]', description: '들이 단위 1L와 1mL를 알고, 이를 이용하여 들이를 측정하고 어림하며 수학의 유용성을 인식할 수 있다.' },
          { code: '[4수03-20]', description: '실생활에서 무게를 나타낼 때 사용하는 단위 1g과 1kg을 알고, 이를 이용하여 무게를 측정하고 어림할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '자료의 정리', standards: [
          { code: '[4수04-01]', description: '자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 초등학교 4학년
// ─────────────────────────────────────────────

const GRADE_E4: GradeCurriculum = {
  grade: '초4',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '큰 수', standards: [
          { code: '[4수01-01]', description: '큰 수의 필요성을 인식하면서 10000 이상의 큰 수에 대한 자릿값과 위치적 기수법을 이해하고, 수를 읽고 쓸 수 있다.' },
          { code: '[4수01-02]', description: '다섯 자리 이상의 수의 범위에서 수의 계열을 이해하고, 수의 크기를 비교하며 그 방법을 설명할 수 있다.' },
        ]},
        { name: '곱셈과 나눗셈', standards: [
          { code: '[4수01-04]', description: '곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
          { code: '[4수01-07]', description: '나누는 수가 두 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
        { name: '분수의 덧셈과 뺄셈', standards: [
          { code: '[4수01-15]', description: '분모가 같은 분수의 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
        { name: '소수의 덧셈과 뺄셈', standards: [
          { code: '[4수01-16]', description: '소수 두 자리 수의 범위에서 소수의 덧셈과 뺄셈의 계산 원리를 이해하고 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '규칙 찾기', standards: [
          { code: '[4수02-01]', description: '다양한 변화 규칙을 찾아 설명하고, 그 규칙을 수나 식으로 나타낼 수 있다.' },
          { code: '[4수02-02]', description: '계산식의 배열에서 규칙을 찾고, 계산 결과를 추측할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '각도', standards: [
          { code: '[4수03-24]', description: '각의 크기의 단위인 1도(°)를 알고, 각도기를 이용하여 각의 크기를 측정하고 어림할 수 있다.' },
          { code: '[4수03-25]', description: '여러 가지 방법으로 삼각형과 사각형의 내각의 크기의 합을 추론하고, 자신의 추론 과정을 설명할 수 있다.' },
        ]},
        { name: '평면도형의 이동', standards: [
          { code: '[4수03-04]', description: '구체물이나 평면도형의 밀기, 뒤집기, 돌리기 활동을 통하여 그 변화를 이해한다.' },
          { code: '[4수03-05]', description: '평면에서 점의 이동에 대해 위치와 방향을 이용하여 설명할 수 있다.' },
        ]},
        { name: '사각형', standards: [
          { code: '[4수03-10]', description: '여러 가지 모양의 사각형에 대한 분류 활동을 통하여 직사각형, 정사각형, 사다리꼴, 평행사변형, 마름모를 이해하고, 그 성질을 탐구하고 설명할 수 있다.' },
        ]},
        { name: '다각형', standards: [
          { code: '[4수03-11]', description: '다각형과 정다각형을 이해한다.' },
          { code: '[4수03-12]', description: '주어진 도형을 이용하여 여러 가지 모양을 만들거나 채우고 설명할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '막대그래프', standards: [
          { code: '[4수04-01]', description: '자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.' },
          { code: '[4수04-03]', description: '탐구 문제를 해결하기 위해 자료를 수집, 정리하여 막대그래프나 꺾은선그래프로 나타내고 해석할 수 있다.' },
        ]},
        { name: '꺾은선그래프', standards: [
          { code: '[4수04-02]', description: '자료를 수집하여 꺾은선그래프로 나타내고 해석할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 초등학교 5학년
// ─────────────────────────────────────────────

const GRADE_E5: GradeCurriculum = {
  grade: '초5',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '자연수의 혼합 계산', standards: [
          { code: '[6수01-01]', description: '덧셈, 뺄셈, 곱셈, 나눗셈의 혼합 계산에서 계산하는 순서를 알고, 혼합 계산을 할 수 있다.' },
        ]},
        { name: '약수와 배수', standards: [
          { code: '[6수01-04]', description: '약수, 공약수, 최대공약수를 이해하고 구할 수 있다.' },
          { code: '[6수01-05]', description: '배수, 공배수, 최소공배수를 이해하고 구할 수 있다.' },
        ]},
        { name: '약분과 통분', standards: [
          { code: '[6수01-06]', description: '크기가 같은 분수를 만드는 방법을 이해하고, 분수를 약분, 통분할 수 있다.' },
          { code: '[6수01-07]', description: '분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다.' },
        ]},
        { name: '분수의 덧셈과 뺄셈', standards: [
          { code: '[6수01-08]', description: '분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.' },
        ]},
        { name: '수의 범위와 어림', standards: [
          { code: '[6수01-02]', description: '실생활과 연결하여 이상, 이하, 초과, 미만의 의미와 쓰임을 알고, 이를 활용하여 수의 범위를 나타낼 수 있다.' },
          { code: '[6수01-03]', description: '어림값을 구하기 위한 방법으로 올림, 버림, 반올림의 의미와 필요성을 알고, 이를 실생활에 활용할 수 있다.' },
        ]},
        { name: '분수의 곱셈', standards: [
          { code: '[6수01-09]', description: '분수의 곱셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.' },
        ]},
        { name: '소수의 곱셈', standards: [
          { code: '[6수01-13]', description: '소수의 곱셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '규칙과 대응', standards: [
          { code: '[6수02-01]', description: '한 양이 변할 때 다른 양이 그에 종속하여 변하는 대응 관계를 나타낸 표에서 규칙을 찾아 설명하고, □, △ 등을 사용하여 식으로 나타낼 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '합동과 대칭', standards: [
          { code: '[6수03-01]', description: '도형의 합동을 이해하고, 합동인 도형의 성질을 탐구하고 설명할 수 있다.' },
          { code: '[6수03-02]', description: '실생활과 연결하여 선대칭도형과 점대칭도형을 이해하고 그릴 수 있다.' },
        ]},
        { name: '직육면체', standards: [
          { code: '[6수02-04]', description: '직육면체와 정육면체를 이해하고, 구성 요소와 성질을 탐구하고 설명할 수 있다.' },
          { code: '[6수02-05]', description: '직육면체의 겨냥도와 전개도를 그릴 수 있다.' },
        ]},
        { name: '다각형의 둘레와 넓이', standards: [
          { code: '[6수03-11]', description: '평면도형의 둘레를 이해하고, 기본적인 평면도형의 둘레를 구할 수 있다.' },
          { code: '[6수03-13]', description: '직사각형과 정사각형의 넓이를 구하는 방법을 이해하고, 이를 구할 수 있다.' },
          { code: '[6수03-14]', description: '평행사변형, 삼각형, 사다리꼴, 마름모의 넓이를 구하는 방법을 다양하게 추론하고, 이와 관련된 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '평균과 가능성', standards: [
          { code: '[6수04-01]', description: '평균의 의미를 알고, 자료를 수집하여 평균을 구하고 해석할 수 있다.' },
          { code: '[6수04-04]', description: '사건이 일어날 가능성을 말로 표현하고 비교할 수 있다.' },
          { code: '[6수04-05]', description: '사건이 일어날 가능성을 수로 나타낼 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 초등학교 6학년
// ─────────────────────────────────────────────

const GRADE_E6: GradeCurriculum = {
  grade: '초6',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '분수의 나눗셈', standards: [
          { code: '[6수01-10]', description: '(자연수)÷(자연수)에서 나눗셈의 몫을 분수로 나타낼 수 있다.' },
          { code: '[6수01-11]', description: '분수의 나눗셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.' },
        ]},
        { name: '소수의 나눗셈', standards: [
          { code: '[6수01-14]', description: '(자연수)÷(자연수)에서 나눗셈의 몫을 소수로 나타낼 수 있다.' },
          { code: '[6수01-15]', description: '소수의 나눗셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '비와 비율', standards: [
          { code: '[6수02-02]', description: '두 양의 크기를 비교하는 상황을 통해 비의 개념을 이해하고, 두 양의 관계를 비로 나타낼 수 있다.' },
          { code: '[6수02-03]', description: '비율을 이해하고, 비율을 분수, 소수, 백분율로 나타낼 수 있다.' },
        ]},
        { name: '비례식과 비례배분', standards: [
          { code: '[6수02-04]', description: '비례식을 알고, 그 성질을 이해하며, 이를 활용하여 간단한 비례식을 풀 수 있다.' },
          { code: '[6수02-05]', description: '비례배분을 알고, 주어진 양을 비례배분할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '각기둥과 각뿔', standards: [
          { code: '[6수03-05]', description: '각기둥과 각뿔을 이해하고, 구성 요소와 성질을 탐구하고 설명할 수 있다.' },
          { code: '[6수03-06]', description: '각기둥의 전개도를 그릴 수 있다.' },
        ]},
        { name: '직육면체의 부피와 겉넓이', standards: [
          { code: '[6수03-17]', description: '직육면체와 정육면체의 겉넓이를 구하는 방법을 이해하고, 이를 구할 수 있다.' },
          { code: '[6수03-18]', description: '부피 단위 1cm³, 1m³를 알며, 그 관계를 이해한다.' },
          { code: '[6수03-19]', description: '직육면체와 정육면체의 부피를 구하는 방법을 이해하고, 이를 구할 수 있다.' },
        ]},
        { name: '원의 넓이', standards: [
          { code: '[6수03-15]', description: '여러 가지 원 모양 물체의 원주와 지름을 측정하는 활동을 통하여, 원주율이 일정한 값임을 알고 그 근삿값을 사용할 수 있다.' },
          { code: '[6수03-16]', description: '원주와 원의 넓이를 구하는 방법을 이해하고, 이를 구할 수 있다.' },
        ]},
        { name: '원기둥·원뿔·구', standards: [
          { code: '[6수03-07]', description: '원기둥, 원뿔, 구를 이해하고, 구성 요소와 성질을 탐구하고 설명할 수 있다.' },
          { code: '[6수03-08]', description: '원기둥의 전개도를 그릴 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '여러 가지 그래프', standards: [
          { code: '[6수04-02]', description: '자료를 수집하여 띠그래프나 원그래프로 나타내고 해석할 수 있다.' },
          { code: '[6수04-03]', description: '탐구 문제를 설정하고, 그에 맞는 자료를 수집, 정리하여 적절한 그래프로 나타내고 해석할 수 있다.' },
        ]},
        { name: '비율 그래프', standards: [
          { code: '[6수05-02]', description: '자료를 수집하여 비율 그래프(띠그래프, 원그래프)로 나타내고 해석할 수 있다.' },
        ]},
        { name: '경우의 수', standards: [
          { code: '[6수04-06]', description: '자료를 이용하여 가능성을 예상하고, 가능성에 근거하여 적절한 판단을 내릴 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 중학교 1학년
// ─────────────────────────────────────────────

const GRADE_M1: GradeCurriculum = {
  grade: '중1',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '소인수분해', standards: [
          { code: '[9수01-01]', description: '소인수분해의 뜻을 알고, 자연수를 소인수분해할 수 있다.' },
          { code: '[9수01-02]', description: '소인수분해를 이용하여 최대공약수와 최소공배수를 구할 수 있다.' },
        ]},
        { name: '정수와 유리수', standards: [
          { code: '[9수01-03]', description: '다양한 상황을 이용하여 음수의 필요성을 인식하고, 양수와 음수, 정수와 유리수의 개념을 이해한다.' },
          { code: '[9수01-04]', description: '정수와 유리수의 대소 관계를 판단할 수 있다.' },
          { code: '[9수01-05]', description: '정수와 유리수의 사칙계산의 원리를 이해하고, 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '문자와 식', standards: [
          { code: '[9수02-01]', description: '다양한 상황을 문자를 사용한 식으로 나타내어 그 유용성을 인식하고, 식의 값을 구할 수 있다.' },
          { code: '[9수02-02]', description: '일차식의 덧셈과 뺄셈의 원리를 이해하고, 그 계산을 할 수 있다.' },
          { code: '[9수02-03]', description: '방정식과 그 해의 뜻을 알고, 등식의 성질을 설명할 수 있다.' },
        ]},
        { name: '일차방정식', standards: [
          { code: '[9수02-04]', description: '일차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[9수02-05]', description: '순서쌍과 좌표를 이해하고, 그 편리함을 인식할 수 있다.' },
        ]},
        { name: '좌표평면과 그래프', standards: [
          { code: '[9수02-05]', description: '순서쌍과 좌표를 이해하고, 그 편리함을 인식할 수 있다.' },
          { code: '[9수02-06]', description: '다양한 상황을 그래프로 나타내고, 주어진 그래프를 해석할 수 있다.' },
        ]},
        { name: '정비례와 반비례', standards: [
          { code: '[9수02-07]', description: '정비례, 반비례 관계를 이해하고, 그 관계를 표, 식, 그래프로 나타낼 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '기본 도형', standards: [
          { code: '[9수03-01]', description: '점, 선, 면, 각을 이해하고, 실생활 상황과 연결하여 점, 직선, 평면의 위치 관계를 설명할 수 있다.' },
          { code: '[9수03-02]', description: '평행선에서 동위각과 엇각의 성질을 이해하고 설명할 수 있다.' },
        ]},
        { name: '작도와 합동', standards: [
          { code: '[9수03-03]', description: '삼각형을 작도하고, 그 과정을 설명할 수 있다.' },
          { code: '[9수03-04]', description: '삼각형의 합동 조건을 이해하고, 이를 이용하여 두 삼각형이 합동인지 판별할 수 있다.' },
        ]},
        { name: '평면도형의 성질', standards: [
          { code: '[9수03-05]', description: '다각형의 성질을 이해하고 설명할 수 있다.' },
          { code: '[9수03-06]', description: '부채꼴의 중심각과 호의 관계를 이해하고, 이를 이용하여 부채꼴의 호의 길이와 넓이를 구할 수 있다.' },
        ]},
        { name: '입체도형의 성질', standards: [
          { code: '[9수03-07]', description: '구체적인 모형이나 공학 도구를 이용하여 다면체와 회전체의 성질을 탐구하고, 이를 설명할 수 있다.' },
          { code: '[9수03-08]', description: '입체도형의 겉넓이와 부피를 구할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '자료의 정리와 해석', standards: [
          { code: '[9수04-02]', description: '자료를 줄기와 잎 그림, 도수분포표, 히스토그램, 도수분포다각형으로 나타내고 해석할 수 있다.' },
          { code: '[9수04-03]', description: '상대도수를 구하고, 상대도수의 분포를 표나 그래프로 나타내고 해석할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 중학교 2학년
// ─────────────────────────────────────────────

const GRADE_M2: GradeCurriculum = {
  grade: '중2',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '유리수와 순환소수', standards: [
          { code: '[9수01-06]', description: '순환소수의 뜻을 알고, 유리수와 순환소수의 관계를 설명할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '식의 계산', standards: [
          { code: '[9수02-08]', description: '지수법칙을 이해하고, 이를 이용하여 식을 간단히 할 수 있다.' },
          { code: '[9수02-09]', description: '다항식의 덧셈과 뺄셈의 원리를 이해하고, 그 계산을 할 수 있다.' },
          { code: '[9수02-10]', description: '(단항식)×(다항식), (다항식)÷(단항식)과 같은 곱셈과 나눗셈의 원리를 이해하고, 그 계산을 할 수 있다.' },
        ]},
        { name: '일차부등식', standards: [
          { code: '[9수02-11]', description: '부등식과 그 해의 뜻을 알고, 부등식의 성질을 설명할 수 있다.' },
          { code: '[9수02-12]', description: '일차부등식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
        { name: '연립방정식', standards: [
          { code: '[9수02-13]', description: '미지수가 2개인 연립일차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
        { name: '일차함수', standards: [
          { code: '[9수02-14]', description: '함수의 개념을 이해하고, 함숫값을 구할 수 있다.' },
          { code: '[9수02-15]', description: '일차함수의 개념을 이해하고, 그 그래프를 그릴 수 있다.' },
          { code: '[9수02-16]', description: '일차함수의 그래프의 성질을 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[9수02-17]', description: '일차함수와 미지수가 2개인 일차방정식의 관계를 설명할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '삼각형의 성질', standards: [
          { code: '[9수03-09]', description: '이등변삼각형의 성질을 이해하고 정당화할 수 있다.' },
          { code: '[9수03-10]', description: '삼각형의 외심과 내심의 성질을 이해하고 정당화할 수 있다.' },
        ]},
        { name: '사각형의 성질', standards: [
          { code: '[9수03-11]', description: '사각형의 성질을 이해하고 정당화할 수 있다.' },
        ]},
        { name: '도형의 닮음', standards: [
          { code: '[9수03-12]', description: '도형의 닮음의 뜻과 닮은 도형의 성질을 이해하고, 닮음비를 구할 수 있다.' },
          { code: '[9수03-13]', description: '삼각형의 닮음 조건을 이해하고, 이를 이용하여 두 삼각형이 닮음인지 판별할 수 있다.' },
          { code: '[9수03-14]', description: '평행선 사이의 선분의 길이의 비를 구할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '확률', standards: [
          { code: '[9수04-05]', description: '경우의 수를 구할 수 있다.' },
          { code: '[9수04-06]', description: '확률의 개념과 그 기본 성질을 이해하고, 확률을 구할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 중학교 3학년
// ─────────────────────────────────────────────

const GRADE_M3: GradeCurriculum = {
  grade: '중3',
  majorChapters: [
    {
      name: '수와 연산',
      subChapters: [
        { name: '제곱근과 실수', standards: [
          { code: '[9수01-07]', description: '제곱근의 뜻과 성질을 알고, 제곱근의 대소 관계를 판단할 수 있다.' },
          { code: '[9수01-08]', description: '무리수의 개념을 이해하고, 무리수의 유용성을 인식할 수 있다.' },
          { code: '[9수01-09]', description: '실수의 대소 관계를 판단하고 설명할 수 있다.' },
          { code: '[9수01-10]', description: '근호를 포함한 식의 사칙계산의 원리를 이해하고, 그 계산을 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '변화와 관계',
      subChapters: [
        { name: '다항식의 곱셈과 인수분해', standards: [
          { code: '[9수02-19]', description: '다항식의 곱셈과 인수분해를 할 수 있다.' },
        ]},
        { name: '이차방정식', standards: [
          { code: '[9수02-20]', description: '이차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
        { name: '이차함수', standards: [
          { code: '[9수02-21]', description: '이차함수의 개념을 이해한다.' },
          { code: '[9수02-22]', description: '이차함수의 그래프를 그릴 수 있고, 그 성질을 설명할 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형과 측정',
      subChapters: [
        { name: '삼각비', standards: [
          { code: '[9수03-16]', description: '삼각비의 뜻을 알고, 간단한 삼각비의 값을 구할 수 있다.' },
          { code: '[9수03-17]', description: '삼각비를 활용하여 여러 가지 문제를 해결할 수 있다.' },
        ]},
        { name: '원의 성질', standards: [
          { code: '[9수03-18]', description: '원의 현에 관한 성질과 접선에 관한 성질을 이해하고 정당화할 수 있다.' },
          { code: '[9수03-19]', description: '원주각의 성질을 이해하고 정당화할 수 있다.' },
        ]},
      ],
    },
    {
      name: '자료와 가능성',
      subChapters: [
        { name: '대푯값과 산포도', standards: [
          { code: '[9수04-01]', description: '중앙값, 최빈값의 뜻을 알고, 자료의 특성에 따라 적절한 대푯값을 선택하여 구할 수 있다.' },
          { code: '[9수04-07]', description: '분산과 표준편차를 구하고 자료의 분포를 설명할 수 있다.' },
        ]},
        { name: '상관관계', standards: [
          { code: '[9수04-08]', description: '공학 도구를 이용하여 자료를 상자그림으로 나타내고 분포를 비교할 수 있다.' },
          { code: '[9수04-09]', description: '자료를 산점도로 나타내고 상관관계를 말할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 고등학교 공통수학1
// ─────────────────────────────────────────────

const GRADE_H_COMMON1: GradeCurriculum = {
  grade: '공통수학1',
  majorChapters: [
    {
      name: '다항식',
      subChapters: [
        { name: '다항식', standards: [
          { code: '[10공수1-01-01]', description: '다항식의 사칙연산의 원리를 설명하고, 그 계산을 할 수 있다.' },
          { code: '[10공수1-01-02]', description: '항등식의 성질과 나머지정리를 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[10공수1-01-03]', description: '다항식의 인수분해를 할 수 있다.' },
        ]},
      ],
    },
    {
      name: '방정식과 부등식',
      subChapters: [
        { name: '방정식과 부등식', standards: [
          { code: '[10공수1-02-01]', description: '복소수의 뜻과 성질을 설명하고, 사칙연산을 수행할 수 있다.' },
          { code: '[10공수1-02-02]', description: '이차방정식의 실근과 허근을 이해하고, 판별식을 이용하여 이차방정식의 근을 판별할 수 있다.' },
          { code: '[10공수1-02-03]', description: '이차방정식의 근과 계수의 관계를 설명할 수 있다.' },
          { code: '[10공수1-02-04]', description: '이차방정식과 이차함수를 연결하여 그 관계를 설명할 수 있다.' },
          { code: '[10공수1-02-05]', description: '이차함수의 그래프와 직선의 위치 관계를 판단할 수 있다.' },
          { code: '[10공수1-02-06]', description: '이차함수의 최대, 최소를 탐구하고, 이를 실생활과 연결하여 유용성을 인식할 수 있다.' },
          { code: '[10공수1-02-07]', description: '간단한 삼차방정식과 사차방정식을 풀 수 있다.' },
          { code: '[10공수1-02-08]', description: '미지수가 2개인 연립이차방정식을 풀 수 있다.' },
          { code: '[10공수1-02-09]', description: '미지수가 1개인 연립일차부등식을 풀 수 있다.' },
          { code: '[10공수1-02-10]', description: '절댓값을 포함한 일차부등식을 풀 수 있다.' },
          { code: '[10공수1-02-11]', description: '이차부등식과 이차함수를 연결하여 그 관계를 설명하고, 이차부등식과 연립이차부등식을 풀 수 있다.' },
        ]},
      ],
    },
    {
      name: '도형의 방정식',
      subChapters: [
        { name: '도형의 방정식', standards: [
          { code: '[10공수1-03-01]', description: '합의 법칙과 곱의 법칙을 이해하고, 적절한 전략을 사용하여 경우의 수와 관련된 문제를 해결할 수 있다.' },
          { code: '[10공수1-03-02]', description: '순열의 개념을 이해하고, 순열의 수를 구하는 방법을 설명할 수 있다.' },
          { code: '[10공수1-03-03]', description: '조합의 개념을 이해하고, 조합의 수를 구하는 방법을 설명할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 고등학교 공통수학2
// ─────────────────────────────────────────────

const GRADE_H_COMMON2: GradeCurriculum = {
  grade: '공통수학2',
  majorChapters: [
    {
      name: '집합과 명제',
      subChapters: [
        { name: '집합과 명제', standards: [
          { code: '[10공수2-02-01]', description: '집합의 개념을 이해하고, 집합을 표현할 수 있다.' },
          { code: '[10공수2-02-02]', description: '두 집합 사이의 포함관계를 판단할 수 있다.' },
          { code: '[10공수2-02-03]', description: '집합의 연산을 수행하고, 벤 다이어그램을 이용하여 나타낼 수 있다.' },
          { code: '[10공수2-02-04]', description: '명제와 조건의 뜻을 알고, 모든, 어떤을 포함한 명제를 이해하고 설명할 수 있다.' },
          { code: '[10공수2-02-05]', description: '명제의 역과 대우를 이해하고 설명할 수 있다.' },
          { code: '[10공수2-02-06]', description: '충분조건과 필요조건을 이해하고 판단할 수 있다.' },
          { code: '[10공수2-02-07]', description: '대우를 이용한 증명법과 귀류법을 이해하고 관련된 명제를 증명할 수 있다.' },
          { code: '[10공수2-02-08]', description: '절대부등식의 뜻을 알고, 간단한 절대부등식을 증명할 수 있다.' },
        ]},
      ],
    },
    {
      name: '함수',
      subChapters: [
        { name: '함수', standards: [
          { code: '[10공수2-03-01]', description: '함수의 개념을 설명하고, 그 그래프를 이해한다.' },
          { code: '[10공수2-03-02]', description: '함수의 합성을 설명하고, 합성함수를 구할 수 있다.' },
          { code: '[10공수2-03-03]', description: '역함수의 개념을 설명하고, 역함수를 구할 수 있다.' },
          { code: '[10공수2-03-04]', description: '유리함수 y=k/(x-p)+q의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구할 수 있다.' },
          { code: '[10공수2-03-05]', description: '무리함수 y=a√(x-p)+q의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구할 수 있다.' },
        ]},
      ],
    },
    {
      name: '경우의 수',
      subChapters: [
        { name: '경우의 수', standards: [
          { code: '[10공수2-01-01]', description: '선분의 내분을 이해하고, 내분점의 좌표를 계산할 수 있다.' },
          { code: '[10공수2-01-02]', description: '두 직선의 평행 조건과 수직 조건을 탐구하고 이해한다.' },
          { code: '[10공수2-01-03]', description: '점과 직선 사이의 거리를 구하고, 관련된 문제를 해결할 수 있다.' },
          { code: '[10공수2-01-04]', description: '원의 방정식을 구하고, 그래프를 그릴 수 있다.' },
          { code: '[10공수2-01-05]', description: '좌표평면에서 원과 직선의 위치 관계를 판단하고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 고등학교 대수
// ─────────────────────────────────────────────

const GRADE_H_ALGEBRA: GradeCurriculum = {
  grade: '대수',
  majorChapters: [
    {
      name: '지수와 로그',
      subChapters: [
        { name: '지수와 로그', standards: [
          { code: '[12대수01-01]', description: '거듭제곱과 거듭제곱근의 뜻을 알고, 그 성질을 이용하여 계산할 수 있다.' },
          { code: '[12대수01-02]', description: '지수가 유리수, 실수까지 확장될 수 있음을 이해하고, 이를 설명할 수 있다.' },
          { code: '[12대수01-03]', description: '지수법칙을 이해하고, 이를 이용하여 식을 간단히 나타낼 수 있다.' },
          { code: '[12대수01-04]', description: '로그의 뜻을 알고, 그 성질을 이용하여 계산할 수 있다.' },
          { code: '[12대수01-05]', description: '상용로그를 이해하고, 이를 실생활과 연결하여 문제를 해결할 수 있다.' },
          { code: '[12대수01-06]', description: '지수함수와 로그함수의 뜻을 알고, 이를 설명할 수 있다.' },
          { code: '[12대수01-07]', description: '지수함수와 로그함수의 그래프를 그릴 수 있고, 그 성질을 설명할 수 있다.' },
          { code: '[12대수01-08]', description: '지수함수, 로그함수를 활용하여 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '수열',
      subChapters: [
        { name: '수열', standards: [
          { code: '[12대수03-01]', description: '수열의 뜻을 설명할 수 있다.' },
          { code: '[12대수03-02]', description: '등차수열의 뜻을 알고, 일반항, 첫째항부터 제n항까지의 합을 구할 수 있다.' },
          { code: '[12대수03-03]', description: '등비수열의 뜻을 알고, 일반항, 첫째항부터 제n항까지의 합을 구할 수 있다.' },
          { code: '[12대수03-04]', description: 'Σ의 뜻과 성질을 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[12대수03-05]', description: '여러 가지 수열의 첫째항부터 제n항까지의 합을 구하는 방법을 설명할 수 있다.' },
          { code: '[12대수03-06]', description: '수열의 귀납적 정의를 설명할 수 있다.' },
          { code: '[12대수03-07]', description: '수학적 귀납법의 원리를 이해하고, 이를 이용하여 명제를 증명할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 고등학교 미적분I
// ─────────────────────────────────────────────

const GRADE_H_CALCULUS1: GradeCurriculum = {
  grade: '미적분I',
  majorChapters: [
    {
      name: '삼각함수',
      subChapters: [
        { name: '삼각함수', standards: [
          { code: '[12대수02-01]', description: '일반각과 호도법의 뜻을 알고, 그 관계를 설명할 수 있다.' },
          { code: '[12대수02-02]', description: '삼각함수의 개념을 이해하여 사인함수, 코사인함수, 탄젠트함수의 그래프를 그리고, 그 성질을 설명할 수 있다.' },
          { code: '[12대수02-03]', description: '사인법칙과 코사인법칙을 이해하고, 실생활 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '함수의 극한과 연속',
      subChapters: [
        { name: '함수의 극한과 연속', standards: [
          { code: '[12미적I-01-01]', description: '함수의 극한의 뜻을 알고, 이를 설명할 수 있다.' },
          { code: '[12미적I-01-02]', description: '함수의 극한에 대한 성질을 이해하고, 함수의 극한값을 구할 수 있다.' },
          { code: '[12미적I-01-03]', description: '함수의 연속을 극한으로 탐구하고 이해한다.' },
          { code: '[12미적I-01-04]', description: '연속함수의 성질을 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '미분',
      subChapters: [
        { name: '미분', standards: [
          { code: '[12미적I-02-01]', description: '미분계수를 이해하고, 이를 구할 수 있다.' },
          { code: '[12미적I-02-02]', description: '함수의 미분가능성과 연속성의 관계를 설명하고, 이를 활용할 수 있다.' },
          { code: '[12미적I-02-03]', description: '함수 f(x)=xⁿ (n은 양의 정수)의 도함수를 구할 수 있다.' },
          { code: '[12미적I-02-04]', description: '함수의 실수배, 합, 차, 곱의 미분법을 알고, 다항함수의 도함수를 구할 수 있다.' },
          { code: '[12미적I-02-05]', description: '미분계수와 접선의 기울기의 관계를 이해하고, 접선의 방정식을 구할 수 있다.' },
          { code: '[12미적I-02-06]', description: '함수에 대한 평균값 정리를 설명하고, 이를 활용할 수 있다.' },
          { code: '[12미적I-02-07]', description: '함수의 증가와 감소, 극대와 극소를 판정하고 설명할 수 있다.' },
          { code: '[12미적I-02-08]', description: '함수의 그래프의 개형을 그릴 수 있다.' },
          { code: '[12미적I-02-09]', description: '방정식과 부등식에 대한 문제를 해결할 수 있다.' },
          { code: '[12미적I-02-10]', description: '미분을 속도와 가속도에 대한 문제에 활용하고, 그 유용성을 인식할 수 있다.' },
        ]},
      ],
    },
    {
      name: '적분',
      subChapters: [
        { name: '적분', standards: [
          { code: '[12미적I-03-01]', description: '부정적분의 뜻을 알고, 이를 설명할 수 있다.' },
          { code: '[12미적I-03-02]', description: '함수의 실수배, 합, 차의 부정적분을 알고, 다항함수의 부정적분을 구할 수 있다.' },
          { code: '[12미적I-03-03]', description: '정적분의 개념을 탐구하고, 그 성질을 이해한다.' },
          { code: '[12미적I-03-04]', description: '부정적분과 정적분의 관계를 이해하고, 다항함수의 정적분을 구할 수 있다.' },
          { code: '[12미적I-03-05]', description: '곡선으로 둘러싸인 도형의 넓이에 대한 문제를 해결할 수 있다.' },
          { code: '[12미적I-03-06]', description: '적분을 속도와 거리에 대한 문제에 활용하고, 그 유용성을 인식할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 고등학교 확률과 통계
// ─────────────────────────────────────────────

const GRADE_H_PROB_STAT: GradeCurriculum = {
  grade: '확률과 통계',
  majorChapters: [
    {
      name: '순열과 조합',
      subChapters: [
        { name: '순열과 조합', standards: [
          { code: '[12확통01-01]', description: '중복순열, 같은 것이 있는 순열을 이해하고, 그 순열의 수를 구하는 방법을 설명할 수 있다.' },
          { code: '[12확통01-02]', description: '중복조합을 이해하고, 중복조합의 수를 구하는 방법을 설명할 수 있다.' },
          { code: '[12확통01-03]', description: '이항정리를 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '확률',
      subChapters: [
        { name: '확률', standards: [
          { code: '[12확통02-01]', description: '확률의 개념을 이해하고 기본 성질을 설명할 수 있다.' },
          { code: '[12확통02-02]', description: '확률의 덧셈정리를 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[12확통02-03]', description: '여사건의 확률을 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
          { code: '[12확통02-04]', description: '조건부확률을 이해하고, 이를 실생활과 연결하여 문제를 해결할 수 있다.' },
          { code: '[12확통02-05]', description: '사건의 독립과 종속을 이해하고, 이를 판단할 수 있다.' },
          { code: '[12확통02-06]', description: '확률의 곱셈정리를 이해하고, 이를 활용하여 문제를 해결할 수 있다.' },
        ]},
      ],
    },
    {
      name: '통계',
      subChapters: [
        { name: '통계', standards: [
          { code: '[12확통03-01]', description: '확률변수와 확률분포의 뜻을 설명할 수 있다.' },
          { code: '[12확통03-02]', description: '이산확률변수의 기댓값(평균)과 표준편차를 구할 수 있다.' },
          { code: '[12확통03-03]', description: '이항분포의 뜻과 성질을 이해하고, 평균과 표준편차를 구할 수 있다.' },
          { code: '[12확통03-04]', description: '정규분포의 뜻과 성질을 이해하고, 이항분포와의 관계를 설명할 수 있다.' },
          { code: '[12확통03-05]', description: '모집단과 표본의 뜻을 알고, 표본추출의 방법을 설명할 수 있다.' },
          { code: '[12확통03-06]', description: '표본평균과 모평균, 표본비율과 모비율의 관계를 이해하고 설명할 수 있다.' },
          { code: '[12확통03-07]', description: '공학 도구를 이용하여 모평균 및 모비율을 추정하고 그 결과를 해석할 수 있다.' },
        ]},
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 전체 교육과정 데이터 (exported)
// ─────────────────────────────────────────────

/** 2022 개정 교육과정 전체 학년 배열 */
export const CURRICULUM_2022: GradeCurriculum[] = [
  GRADE_E1,
  GRADE_E2,
  GRADE_E3,
  GRADE_E4,
  GRADE_E5,
  GRADE_E6,
  GRADE_M1,
  GRADE_M2,
  GRADE_M3,
  GRADE_H_COMMON1,
  GRADE_H_COMMON2,
  GRADE_H_ALGEBRA,
  GRADE_H_CALCULUS1,
  GRADE_H_PROB_STAT,
];

// ─────────────────────────────────────────────
// 교과서 출판사 데이터
// ─────────────────────────────────────────────

/** 지원 교과서 출판사 목록 */
export const SUPPORTED_PUBLISHERS = [
  '교육과정 순서',
  '비상교육',
  '미래엔',
  '동아출판',
  '지학사',
  '천재교육',
  '금성출판사',
  '신사고',
  '대교',
  '아이스크림',
] as const;

/** 출판사별 학년-단원 순서 (향후 확장용, 현재는 교육과정 기본 순서) */
export const PUBLISHER_ORDERS: Record<string, Record<string, string[]>> = {
  // 향후 출판사별 단원 순서 매핑 추가
  // 예: '비상교육': { '중1': ['소인수분해', '정수와 유리수', ...], ... }
};

// ─────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────

/** 학년명 → GradeCurriculum 내부 인덱스 캐시 (빠른 조회용) */
const _gradeIndex = new Map<string, number>();
for (let i = 0; i < CURRICULUM_2022.length; i++) {
  _gradeIndex.set(CURRICULUM_2022[i].grade, i);
}

/**
 * 특정 학년의 GradeCurriculum 객체를 반환한다.
 * 학년 이름이 유효하지 않으면 undefined를 반환한다.
 */
export function getGradeCurriculum(grade: string): GradeCurriculum | undefined {
  const idx = _gradeIndex.get(grade);
  if (idx === undefined) return undefined;
  return CURRICULUM_2022[idx];
}

/**
 * 특정 학년의 모든 단원(소단원) 이름을 평면 배열로 반환한다.
 */
export function getTopicList(grade: string): string[] {
  const gc = getGradeCurriculum(grade);
  if (!gc) return [];
  const topics: string[] = [];
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      topics.push(sc.name);
    }
  }
  return topics;
}

/** getTopicList의 별칭 (기존 코드 호환) */
export const getTopicsFlat = getTopicList;

/**
 * 특정 학년, 특정 단원(소단원)의 성취기준 목록을 반환한다.
 */
export function getStandardsForTopic(grade: string, topicName: string): CurriculumStandard[] {
  const gc = getGradeCurriculum(grade);
  if (!gc) return [];
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      if (sc.name === topicName) {
        return sc.standards;
      }
    }
  }
  return [];
}

/**
 * 특정 학년, 특정 단원이 속한 대단원(MajorChapter) 이름을 반환한다.
 * 해당 단원이 없으면 undefined를 반환한다.
 */
export function getMajorChapterForTopic(grade: string, topicName: string): string | undefined {
  const gc = getGradeCurriculum(grade);
  if (!gc) return undefined;
  for (const mc of gc.majorChapters) {
    for (const sc of mc.subChapters) {
      if (sc.name === topicName) {
        return mc.name;
      }
    }
  }
  return undefined;
}

/**
 * 특정 학년의 단원을 대단원별로 그룹화하여 반환한다.
 * publisher 파라미터는 향후 출판사별 단원 순서를 지원하기 위해 예약됨.
 */
export function getGroupedTopics(grade: string, publisher?: string): TopicGroup[] {
  const gc = getGradeCurriculum(grade);
  if (!gc) return [];

  // 출판사별 순서가 등록되어 있으면 해당 순서를 사용
  if (publisher && PUBLISHER_ORDERS[publisher]?.[grade]) {
    const order = PUBLISHER_ORDERS[publisher][grade];
    // 기존 대단원 그룹을 구한 뒤 순서를 재배치
    const topicToMajor = new Map<string, string>();
    for (const mc of gc.majorChapters) {
      for (const sc of mc.subChapters) {
        topicToMajor.set(sc.name, mc.name);
      }
    }
    const groupMap = new Map<string, string[]>();
    for (const topic of order) {
      const major = topicToMajor.get(topic);
      if (!major) continue;
      const existing = groupMap.get(major);
      if (existing) {
        existing.push(topic);
      } else {
        groupMap.set(major, [topic]);
      }
    }
    return Array.from(groupMap.entries()).map(([major, topics]) => ({ major, topics }));
  }

  // 기본 교육과정 순서
  return gc.majorChapters.map(mc => ({
    major: mc.name,
    topics: mc.subChapters.map(sc => sc.name),
  }));
}

/**
 * 모든 학년 목록을 반환한다.
 * CURRICULUM_2022 배열 순서를 그대로 유지한다.
 */
export function getAllGrades(): string[] {
  return CURRICULUM_2022.map(gc => gc.grade);
}

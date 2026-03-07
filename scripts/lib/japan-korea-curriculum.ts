/**
 * 일본 → 한국 교육과정 매핑 테이블 + 제외 목록
 *
 * 한국 2022 개정 교육과정 범위 밖의 일본 단원을 제외하고,
 * 범위 내 단원을 한국 grade/topic에 매핑한다.
 */

// ─────────────────────────────────────────────
// 제외 카테고리 (한국 교육과정에 없는 일본 단원)
// ─────────────────────────────────────────────

/** 한국 2022 개정 교육과정에 존재하지 않는 일본 수학 카테고리 */
export const EXCLUDED_CATEGORIES: string[] = [
  // 기하 (진로선택) — 표준 교육과정 아님
  '平面ベクトル', '空間ベクトル', 'ベクトル', '球',
  '二次曲線', '楕円', '双曲線', '放物線',
  'vector', 'vectors', 'plane vector', 'space vector',

  // 복소수평면 — 한국에 없음
  '複素数平面', '複素数', '極座標', '極形式',
  'complex plane', 'polar coordinates',

  // 정수론 — 2022 개정에서 삭제
  '整数の性質', '整数', 'N進法', '進法', 'ユークリッドの互除法',
  'number theory', 'integers',

  // 가설검정 — 한국에 없음
  '仮説検定', 'hypothesis testing',

  // 수학III 고급 미적분 — 미적분II (진로선택)
  '無限級数', '漸化式と極限', '極限と漸化式',
  'infinite series', 'sequences and limits',

  // 수학III 초월함수 미적분 — 미적분II (진로선택)
  // (주의: 다항함수 미적분은 미적분I에 해당하므로 제외하지 않음)

  // 행렬 — 인공지능수학(진로선택)에만
  '行列', 'matrix', 'matrices',
];

/** 제외 키워드 (카테고리명에 포함되면 제외) */
const EXCLUDED_KEYWORDS: string[] = [
  'ベクトル', '複素数平面', '極座標', '仮説検定',
  '無限級数', '行列', 'N進法',
];

/**
 * 일본 카테고리가 한국 교육과정 범위 밖인지 판별
 * 정확한 매치 + 키워드 포함 모두 검사
 */
export function isExcluded(category: string, subcategory: string): boolean {
  const cat = category.trim();
  const sub = subcategory.trim();

  /** 정확한 매치 */
  if (EXCLUDED_CATEGORIES.includes(cat) || EXCLUDED_CATEGORIES.includes(sub)) {
    return true;
  }

  /** 키워드 포함 검사 */
  const combined = `${cat} ${sub}`;
  return EXCLUDED_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * 수학III 고급 미적분인지 판별 (초월함수 미분·적분)
 * 다항함수 미적분(수학II)과 구분해야 함
 */
export function isMath3Calculus(category: string, subcategory: string): boolean {
  const combined = `${category} ${subcategory}`;
  const math3Keywords = [
    '数学III', '数III', '3C',
    '三角関数の微分', '三角関数の積分',
    '指数関数の微分', '対数関数の微分',
    '媒介変数', '極方程式',
    '分数関数の微分', '無理関数の微分',
    '合成関数の微分', '逆関数の微分',
    '区分求積', '体積', '弧長', '曲線の長さ',
  ];
  return math3Keywords.some((kw) => combined.includes(kw));
}

// ─────────────────────────────────────────────
// 매핑 테이블 (적합 카테고리 → 한국 grade/topic)
// ─────────────────────────────────────────────

export interface CurriculumMapping {
  japaneseCategory: string;
  japaneseSubcategory: string;
  koreanGrade: string;
  koreanTopic: string;
  confidence: 'high' | 'medium' | 'low';
}

export const JAPAN_KOREA_MAPPING: CurriculumMapping[] = [
  // ── 数学I ──
  { japaneseCategory: '展開', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '다항식', confidence: 'high' },
  { japaneseCategory: '因数分解', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '다항식', confidence: 'high' },
  { japaneseCategory: '数と式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '다항식', confidence: 'high' },
  { japaneseCategory: '根号', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '제곱근과 실수', confidence: 'high' },
  { japaneseCategory: '二重根号', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '제곱근과 실수', confidence: 'high' },
  { japaneseCategory: '絶対値', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '不等式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '二次関数', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '2次関数', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '2次方程式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '2次不等式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '命題', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '집합과 명제', confidence: 'high' },
  { japaneseCategory: '集合', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '집합과 명제', confidence: 'high' },
  { japaneseCategory: '三角比', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '삼각비', confidence: 'high' },
  { japaneseCategory: '図形と計量', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '삼각비', confidence: 'high' },
  { japaneseCategory: 'データの分析', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '대푯값과 산포도', confidence: 'medium' },
  { japaneseCategory: 'データ', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '대푯값과 산포도', confidence: 'medium' },

  // ── 数学A ──
  { japaneseCategory: '場合の数', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '도형의 방정식', confidence: 'high' },
  { japaneseCategory: '順列', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '도형의 방정식', confidence: 'high' },
  { japaneseCategory: '組み合わせ', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '도형의 방정식', confidence: 'high' },
  { japaneseCategory: '確率', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '확률', confidence: 'high' },
  { japaneseCategory: '期待値', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '図形の性質', japaneseSubcategory: '三角形',
    koreanGrade: '중2', koreanTopic: '삼각형의 성질', confidence: 'high' },
  { japaneseCategory: '図形の性質', japaneseSubcategory: '円',
    koreanGrade: '중3', koreanTopic: '원의 성질', confidence: 'high' },

  // ── 数学II ──
  { japaneseCategory: '整式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '다항식', confidence: 'high' },
  { japaneseCategory: '式と証明', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '다항식', confidence: 'high' },
  { japaneseCategory: '高次方程式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '複素数と方程式', japaneseSubcategory: '',
    koreanGrade: '공통수학1', koreanTopic: '방정식과 부등식', confidence: 'high' },
  { japaneseCategory: '点と直線', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '경우의 수', confidence: 'high' },
  { japaneseCategory: '図形と方程式', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '경우의 수', confidence: 'high' },
  { japaneseCategory: '領域', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '경우의 수', confidence: 'high' },
  { japaneseCategory: '軌跡', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '경우의 수', confidence: 'medium' },
  { japaneseCategory: '円', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '경우의 수', confidence: 'high' },
  { japaneseCategory: '三角関数', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '삼각함수', confidence: 'high' },
  { japaneseCategory: '加法定理', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '삼각함수', confidence: 'high' },
  { japaneseCategory: '指数関数', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '지수와 로그', confidence: 'high' },
  { japaneseCategory: '対数関数', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '지수와 로그', confidence: 'high' },
  { japaneseCategory: '指数・対数', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '지수와 로그', confidence: 'high' },
  { japaneseCategory: '指数・対数関数', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '지수와 로그', confidence: 'high' },
  { japaneseCategory: '微分', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '미분', confidence: 'high' },
  { japaneseCategory: '微分基礎', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '미분', confidence: 'high' },
  { japaneseCategory: '積分', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '적분', confidence: 'high' },
  { japaneseCategory: '微分・積分', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '미분', confidence: 'high' },
  { japaneseCategory: '微積基礎', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '미분', confidence: 'high' },

  // ── 数学B ──
  { japaneseCategory: '数列', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '수열', confidence: 'high' },
  { japaneseCategory: '数列の和', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '수열', confidence: 'high' },
  { japaneseCategory: '群数列', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '수열', confidence: 'high' },
  { japaneseCategory: '漸化式', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '수열', confidence: 'high' },
  { japaneseCategory: '数学的帰納法', japaneseSubcategory: '',
    koreanGrade: '대수', koreanTopic: '수열', confidence: 'high' },
  { japaneseCategory: '確率と漸化式', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '확률', confidence: 'high' },
  { japaneseCategory: '確率分布', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '二項分布', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '確率密度関数', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '正規分布', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '推定', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },
  { japaneseCategory: '統計的な推測', japaneseSubcategory: '',
    koreanGrade: '확률과 통계', koreanTopic: '통계', confidence: 'high' },

  // ── 数学III (다항함수 범위만, 초월함수는 제외) ──
  { japaneseCategory: '分数関数', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '함수', confidence: 'high' },
  { japaneseCategory: '無理関数', japaneseSubcategory: '',
    koreanGrade: '공통수학2', koreanTopic: '함수', confidence: 'high' },
  { japaneseCategory: '極限基本', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '함수의 극한과 연속', confidence: 'medium' },
  { japaneseCategory: '極限', japaneseSubcategory: '',
    koreanGrade: '미적분I', koreanTopic: '함수의 극한과 연속', confidence: 'medium' },

  // ── 중학교 ──
  { japaneseCategory: '正の数・負の数', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '정수와 유리수', confidence: 'high' },
  { japaneseCategory: '文字と式', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '문자와 식', confidence: 'high' },
  { japaneseCategory: '一次方程式', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '일차방정식', confidence: 'high' },
  { japaneseCategory: '比例と反比例', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '정비례와 반비례', confidence: 'high' },
  { japaneseCategory: '平面図形', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '평면도형의 성질', confidence: 'high' },
  { japaneseCategory: '空間図形', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '입체도형의 성질', confidence: 'high' },
  { japaneseCategory: '資料の整理', japaneseSubcategory: '',
    koreanGrade: '중1', koreanTopic: '자료의 정리와 해석', confidence: 'high' },
  { japaneseCategory: '式の計算', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '식의 계산', confidence: 'high' },
  { japaneseCategory: '連立方程式', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '연립방정식', confidence: 'high' },
  { japaneseCategory: '一次関数', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '일차함수', confidence: 'high' },
  { japaneseCategory: '平行と合同', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '삼각형의 성질', confidence: 'high' },
  { japaneseCategory: '三角形と四角形', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '사각형의 성질', confidence: 'high' },
  { japaneseCategory: '確率', japaneseSubcategory: '中学',
    koreanGrade: '중2', koreanTopic: '확률', confidence: 'high' },
  { japaneseCategory: '平方根', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '제곱근과 실수', confidence: 'high' },
  { japaneseCategory: '多項式', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '다항식의 곱셈과 인수분해', confidence: 'high' },
  { japaneseCategory: '二次方程式', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '이차방정식', confidence: 'high' },
  { japaneseCategory: '関数y=ax²', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '이차함수', confidence: 'high' },
  { japaneseCategory: '相似', japaneseSubcategory: '',
    koreanGrade: '중2', koreanTopic: '도형의 닮음', confidence: 'high' },
  { japaneseCategory: '三平方の定理', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '삼각비', confidence: 'high' },
  { japaneseCategory: '円の性質', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '원의 성질', confidence: 'high' },
  { japaneseCategory: '標本調査', japaneseSubcategory: '',
    koreanGrade: '중3', koreanTopic: '대푯값과 산포도', confidence: 'medium' },
];

/**
 * 일본 카테고리에 대응하는 한국 교육과정 매핑을 찾는다.
 * 정확히 일치하는 항목이 없으면 null 반환 → Claude에게 위임
 */
export function findMapping(
  category: string,
  subcategory: string
): CurriculumMapping | null {
  const cat = category.trim();
  const sub = subcategory.trim();

  /** subcategory까지 정확히 일치하는 항목 우선 */
  if (sub) {
    const exact = JAPAN_KOREA_MAPPING.find(
      (m) => m.japaneseCategory === cat && m.japaneseSubcategory === sub
    );
    if (exact) return exact;
  }

  /** category만 일치하는 항목 (subcategory가 빈 문자열) */
  const catOnly = JAPAN_KOREA_MAPPING.find(
    (m) => m.japaneseCategory === cat && m.japaneseSubcategory === ''
  );
  if (catOnly) return catOnly;

  /** 부분 일치 시도 (카테고리명이 포함되는 경우) */
  const partial = JAPAN_KOREA_MAPPING.find(
    (m) => cat.includes(m.japaneseCategory) || m.japaneseCategory.includes(cat)
  );
  return partial ?? null;
}

/**
 * 제외 사유를 한국어로 반환
 */
export function getExclusionReason(category: string, subcategory: string): string {
  const combined = `${category} ${subcategory}`;

  if (combined.includes('ベクトル')) return '벡터 — 기하(진로선택)';
  if (combined.includes('複素数')) return '복소수평면 — 한국 교육과정에 없음';
  if (combined.includes('極座標')) return '극좌표 — 한국 교육과정에 없음';
  if (combined.includes('整数') || combined.includes('N進法')) return '정수론 — 2022 개정에서 삭제';
  if (combined.includes('仮説検定')) return '가설검정 — 한국 교육과정에 없음';
  if (combined.includes('無限級数')) return '무한급수 — 미적분II(진로선택)';
  if (combined.includes('行列')) return '행렬 — 인공지능수학(진로선택)에만 존재';
  return '한국 교육과정 범위 밖';
}

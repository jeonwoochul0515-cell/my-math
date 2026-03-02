import { useState } from 'react';
import { Sparkles, Loader2, Printer, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useProblems } from '../../hooks/useProblems';
import Loading from '../common/Loading';
import MathText from '../common/MathText';
import type { Problem } from '../../types';

/** 학년-단원 매핑 (2022 개정 교육과정 기준) */
const CURRICULUM: Record<string, string[]> = {
  중1: ['소인수분해', '정수와 유리수', '문자와 식', '일차방정식', '좌표평면과 그래프', '정비례와 반비례', '기본 도형', '작도와 합동', '평면도형의 성질', '입체도형의 성질', '자료의 정리와 해석'],
  중2: ['유리수와 순환소수', '식의 계산', '일차부등식', '연립방정식', '일차함수', '삼각형의 성질', '사각형의 성질', '도형의 닮음', '확률'],
  중3: ['제곱근과 실수', '다항식의 곱셈과 인수분해', '이차방정식', '이차함수', '삼각비', '원의 성질', '대푯값과 산포도', '상관관계'],
  공통수학1: ['다항식', '방정식과 부등식', '도형의 방정식'],
  공통수학2: ['집합과 명제', '함수', '경우의 수'],
  대수: ['지수와 로그', '수열'],
  미적분I: ['삼각함수', '함수의 극한과 연속', '미분', '적분'],
  '확률과 통계': ['순열과 조합', '확률', '통계'],
};

/** 난이도 옵션 */
const DIFFICULTIES = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
] as const;

const DIFFICULTY_LABEL: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

/** 학년 목록 */
const GRADES = Object.keys(CURRICULUM);

/** 오늘 날짜 (YYYY.MM.DD) */
function todayString(): string {
  const d = new Date();
  return `${String(d.getFullYear())}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** AI 문제 생성 페이지 */
export default function AIGeneration() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const { generating, error, generate } = useProblems(academy?.id ?? null);

  const [grade, setGrade] = useState(GRADES[0]);
  const [topic, setTopic] = useState(CURRICULUM[GRADES[0]][0]);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [count, setCount] = useState(5);
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);

  /** 학년 변경 시 단원을 첫 번째로 초기화 */
  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    setTopic(CURRICULUM[newGrade][0]);
  };

  /** 문제 생성 실행 */
  const handleGenerate = async () => {
    setShowAnswers(false);
    const results = await generate(grade, topic, difficulty, count);
    if (results.length > 0) {
      setGeneratedProblems(results);
    }
  };

  if (academyLoading) {
    return <Loading role="owner" message="로딩 중..." />;
  }

  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 먼저 등록해주세요</p>
      </div>
    );
  }

  const hasProblems = generatedProblems.length > 0;

  return (
    <div className="space-y-6">
      {/* ========== 프린트 전용 시험지 헤더 ========== */}
      {hasProblems && (
        <div className="hidden print:block print:mb-6">
          <div className="border-b-2 border-black pb-3 mb-4">
            <h1 className="text-center text-xl font-bold">{academy.name} 수학 문제지</h1>
            <div className="mt-2 flex justify-between text-sm">
              <span>{grade} · {topic} · {DIFFICULTY_LABEL[difficulty] ?? difficulty}</span>
              <span>{todayString()}</span>
            </div>
            <div className="mt-2 flex gap-8 text-sm">
              <span>이름: ________________</span>
              <span>점수: ______ / {String(generatedProblems.length * 10)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========== 화면 전용: 제목 ========== */}
      <h2 className="text-xl font-bold text-gray-900 print:hidden">AI 문제 생성</h2>

      {/* ========== 화면 전용: 조건 입력 폼 ========== */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4 print:hidden">
        {/* 학년 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
          <select value={grade} onChange={(e) => handleGradeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* 단원 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">단원</label>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            {CURRICULUM[grade].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 난이도 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
          <div className="flex gap-4">
            {DIFFICULTIES.map((d) => (
              <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="difficulty" value={d.value} checked={difficulty === d.value}
                  onChange={(e) => setDifficulty(e.target.value)} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 문제 수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">문제 수</label>
          <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        {/* 에러 메시지 */}
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {/* 생성 버튼 */}
        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? '생성 및 검증 중...' : '문제 생성'}
        </button>

        {generating && (
          <p className="text-xs text-gray-400">AI가 문제를 생성하고 독립 검증합니다. 최대 30초 소요될 수 있습니다.</p>
        )}
      </div>

      {/* ========== 생성된 문제 영역 ========== */}
      {hasProblems && (
        <div className="rounded-xl bg-white p-5 shadow-sm print:shadow-none print:p-0 print:rounded-none">
          {/* 화면 전용: 툴바 */}
          <div className="mb-5 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                검증 완료 {generatedProblems.length}문제
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAnswers((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  showAnswers
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAnswers ? '정답 숨기기' : '정답 보기'}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Printer className="h-4 w-4" />
                프린트
              </button>
            </div>
          </div>

          {/* 문제 목록 */}
          <div className="space-y-6 print:space-y-4">
            {generatedProblems.map((problem, index) => (
              <ProblemCard key={problem.id} problem={problem} index={index + 1} showAnswer={showAnswers} />
            ))}
          </div>

          {/* 정답표 (토글 시 화면 + 프린트 모두 표시) */}
          {showAnswers && <AnswerKeyTable problems={generatedProblems} />}
        </div>
      )}

      {/* 빈 상태 */}
      {!hasProblems && !generating && (
        <div className="rounded-xl bg-white p-5 shadow-sm print:hidden">
          <p className="py-6 text-center text-sm text-gray-400">
            위에서 조건을 설정한 후 문제를 생성해보세요.
          </p>
        </div>
      )}
    </div>
  );
}

/** 보기 원문자 ①②③④ */
const CIRCLE_NUMS = ['①', '②', '③', '④'];

/** 문제 카드 */
function ProblemCard({ problem, index, showAnswer }: { problem: Problem; index: number; showAnswer: boolean }) {
  const answerIndex = problem.choices.indexOf(problem.answer);

  return (
    <div className="pb-5 border-b border-gray-100 last:border-0 last:pb-0 print:pb-4 print:border-gray-300">
      {/* 문제 번호 + 내용 */}
      <div className="flex gap-2 mb-3">
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white print:bg-black">
          {String(index)}
        </span>
        <p className="text-sm leading-relaxed text-gray-800 pt-0.5">
          <MathText text={problem.content} />
        </p>
      </div>

      {/* 보기 */}
      {problem.choices.length > 0 && (
        <div className="ml-8 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {problem.choices.map((c, i) => (
            <div key={CIRCLE_NUMS[i]} className="flex items-baseline gap-1.5 text-sm text-gray-700">
              <span className="shrink-0">{CIRCLE_NUMS[i]}</span>
              <MathText text={c} />
            </div>
          ))}
        </div>
      )}

      {/* 정답/풀이 (토글 시) */}
      {showAnswer && (
        <div className="ml-8 mt-3 rounded-lg bg-blue-50 p-3 border border-blue-100 print:bg-white print:border-gray-300">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            정답: {answerIndex >= 0 ? CIRCLE_NUMS[answerIndex] : '-'} <MathText text={problem.answer} />
          </p>
          {problem.solution && (
            <p className="text-xs text-gray-600 leading-relaxed">
              <MathText text={problem.solution} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** 정답표 (하단 요약) */
function AnswerKeyTable({ problems }: { problems: Problem[] }) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 print:border-black print:mt-8 print:pt-6">
      <h4 className="text-sm font-bold text-gray-900 mb-3">정답표</h4>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {problems.map((p, i) => {
          const ai = p.choices.indexOf(p.answer);
          return (
            <div key={p.id} className="flex flex-col items-center rounded border border-gray-200 py-1.5 text-xs print:border-gray-400">
              <span className="font-bold text-gray-500">{String(i + 1)}</span>
              <span className="font-semibold text-blue-700 print:text-black">
                {ai >= 0 ? CIRCLE_NUMS[ai] : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

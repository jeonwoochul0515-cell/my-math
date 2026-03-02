import { useState } from 'react';
import { Sparkles, Loader2, Printer, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useProblems } from '../../hooks/useProblems';
import Loading from '../common/Loading';
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

/** 학년 목록 */
const GRADES = Object.keys(CURRICULUM);

/** AI 문제 생성 페이지 - 조건 설정 및 문제 미리보기 */
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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">AI 문제 생성</h2>

      {/* 조건 입력 폼 */}
      <div className="rounded-xl bg-white p-5 shadow-sm space-y-4" data-no-print>
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
          {generating ? '생성 중...' : '문제 생성'}
        </button>
      </div>

      {/* 생성된 문제 목록 */}
      {generatedProblems.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between" data-no-print>
            <h3 className="text-base font-semibold text-gray-900">
              생성된 문제 ({generatedProblems.length}개)
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setShowAnswers((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAnswers ? '정답지 숨기기' : '정답지 보기'}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Printer className="h-4 w-4" />
                프린트
              </button>
            </div>
          </div>
          <div className="space-y-6">
            {generatedProblems.map((problem, index) => (
              <ProblemCard key={problem.id} problem={problem} index={index + 1} showAnswer={showAnswers} />
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {generatedProblems.length === 0 && !generating && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="py-6 text-center text-sm text-gray-400">
            위에서 조건을 설정한 후 문제를 생성해보세요.
          </p>
        </div>
      )}
    </div>
  );
}

/** 생성된 문제 카드 컴포넌트 */
function ProblemCard({ problem, index, showAnswer }: { problem: Problem; index: number; showAnswer: boolean }) {
  const answerIndex = problem.choices.indexOf(problem.answer);
  const answerLabel = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '-';

  return (
    <div className="space-y-3 border-b border-gray-100 pb-5 last:border-0 last:pb-0">
      <p className="text-sm font-medium text-blue-600">문제 {String(index)}</p>
      <p className="text-sm leading-relaxed text-gray-800">{problem.content}</p>
      {problem.choices.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {problem.choices.map((c, i) => {
            const label = String.fromCharCode(65 + i);
            return (
              <div key={label}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                {label}. {c}
              </div>
            );
          })}
        </div>
      )}
      {showAnswer && (
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">정답: {answerLabel} ({problem.answer})</p>
          {problem.solution && (
            <p className="text-xs text-gray-600 leading-relaxed">풀이: {problem.solution}</p>
          )}
        </div>
      )}
    </div>
  );
}

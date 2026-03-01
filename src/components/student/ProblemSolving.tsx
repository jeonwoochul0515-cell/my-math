import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, ArrowRight, Lightbulb, Loader2, BookOpen } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { getProblems, submitAnswer } from '../../services/problems';
import type { Problem } from '../../types';

/** 선택지 라벨 배열 */
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

/** 안내 메시지 컴포넌트 */
function EmptyMessage({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      {icon}
      <p className="text-lg font-semibold">{title}</p>
      {sub && <p className="mt-1 text-sm">{sub}</p>}
    </div>
  );
}

/** 문제 풀기 페이지 - 수학 문제 표시 및 답안 제출 */
export default function ProblemSolving() {
  const { student } = useStudentContext();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 문제 목록 로드 */
  const loadProblems = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      setProblems(await getProblems(student.academyId, { grade: student.grade }));
    } catch {
      setError('문제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => { loadProblems(); }, [loadProblems]);

  const problem: Problem | undefined = problems[currentIndex];

  /** 답안 제출 처리 */
  const handleSubmit = async () => {
    if (!selectedAnswer || !problem || !student) return;
    const correct = selectedAnswer === problem.answer;
    setIsCorrect(correct);
    setIsSubmitted(true);
    setSubmitting(true);
    try { await submitAnswer(student.id, problem.id, selectedAnswer, correct); }
    catch { /* 제출 실패 시에도 UI 유지 */ }
    finally { setSubmitting(false); }
  };

  /** 다음 문제로 이동 */
  const handleNext = () => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setCurrentIndex((prev) => prev + 1);
  };

  /** 선택지 버튼 스타일 계산 */
  const getChoiceStyle = (choice: string): string => {
    const base = 'flex items-center gap-3 w-full rounded-xl border-2 p-4 text-left text-base font-medium transition-all';
    if (!problem) return base;
    if (isSubmitted) {
      if (choice === problem.answer) return `${base} border-green-500 bg-green-50 text-green-800`;
      if (choice === selectedAnswer) return `${base} border-red-500 bg-red-50 text-red-800`;
      return `${base} border-gray-200 bg-gray-50 text-gray-400`;
    }
    if (choice === selectedAnswer) return `${base} border-indigo-600 bg-indigo-50 text-indigo-800`;
    return `${base} border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50`;
  };

  if (!student) return <EmptyMessage icon={<BookOpen className="mb-3 h-12 w-12 text-gray-300" />} title="먼저 홈에서 로그인해주세요." />;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-red-500">
      <p>{error}</p>
      <button onClick={loadProblems} className="mt-3 text-sm text-indigo-600 underline">다시 시도</button>
    </div>
  );
  if (problems.length === 0) return <EmptyMessage icon={<BookOpen className="mb-3 h-12 w-12 text-gray-300" />} title="문제가 없습니다" sub="선생님이 문제를 출제하면 여기에 표시됩니다." />;
  if (currentIndex >= problems.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-700">
      <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
      <p className="text-lg font-bold">모든 문제를 풀었습니다!</p>
      <button onClick={() => { setCurrentIndex(0); loadProblems(); }} className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700">
        처음부터 다시 풀기
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 문제 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700">{problem.topic}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
            {problem.difficulty === 'easy' ? '쉬움' : problem.difficulty === 'medium' ? '보통' : '어려움'}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-400">{currentIndex + 1} / {problems.length}</span>
      </div>

      {/* 문제 내용 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold leading-relaxed text-gray-900">{problem.content}</p>
      </div>

      {/* 선택지 */}
      <div className="space-y-3">
        {problem.choices.map((choice, index) => (
          <button key={choice} onClick={() => !isSubmitted && setSelectedAnswer(choice)} disabled={isSubmitted} className={getChoiceStyle(choice)}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">{CHOICE_LABELS[index]}</span>
            <span>{choice}</span>
          </button>
        ))}
      </div>

      {/* 제출 / 다음 문제 버튼 */}
      {!isSubmitted ? (
        <button onClick={handleSubmit} disabled={!selectedAnswer || submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '제출'}
        </button>
      ) : (
        <button onClick={handleNext} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700">
          <span>{currentIndex + 1 < problems.length ? '다음 문제' : '결과 보기'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      )}

      {/* 정오답 피드백 */}
      {isSubmitted && (
        <div className={`rounded-xl p-5 ${isCorrect ? 'border border-green-200 bg-green-50' : 'border border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {isCorrect ? <CheckCircle className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
            <span className={`text-lg font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '정답입니다!' : '오답입니다'}
            </span>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-white p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-gray-700">풀이 해설</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{problem.solution}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { CheckCircle, XCircle, ArrowRight, Lightbulb, Loader2, BookOpen, TrendingUp, RotateCcw } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { submitAnswer } from '../../services/problems';
import { composeAdaptiveSet, recordSetResult, getIncompleteSet } from '../../services/adaptiveLearning';
import type { AdaptiveSet } from '../../services/adaptiveLearning';
import MathText from '../common/MathText';
import type { Problem } from '../../types';

/** 도형/그래프 렌더러 (lazy load) */
const MathFigure = lazy(() => import('../common/MathFigure'));

/** 선택지 라벨 */
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

/** 세트 결과 화면 props */
interface SetResultProps {
  problems: Problem[];
  answers: { problemId: string; selected: string; isCorrect: boolean }[];
  promoted: boolean;
  newDifficulty: string;
  promotedTopic: string;
  onNext: () => void;
}

/** 세트 완료 결과 화면 */
function SetResultView({ problems, answers, promoted, newDifficulty, promotedTopic, onNext }: SetResultProps) {
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const isPerfect = correctCount === 4;
  const diffLabel: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 결과 헤더 */}
      <div className={`rounded-xl p-6 text-center ${isPerfect ? 'bg-green-50 border border-green-200' : 'bg-indigo-50 border border-indigo-200'}`}>
        {isPerfect ? (
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
        ) : (
          <RotateCcw className="mx-auto mb-3 h-12 w-12 text-indigo-500" />
        )}
        <p className="text-2xl font-bold text-gray-900">{correctCount} / 4</p>
        <p className="mt-1 text-sm text-gray-500">
          {isPerfect ? '모두 맞혔습니다!' : '틀린 문제는 다음에 다시 나옵니다'}
        </p>

        {/* 승급 알림 */}
        {promoted && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">
              {promotedTopic} 난이도 승급! → {diffLabel[newDifficulty] ?? newDifficulty}
            </span>
          </div>
        )}
      </div>

      {/* 문제별 결과 */}
      <div className="space-y-3">
        {problems.map((p, i) => {
          const ans = answers[i];
          return (
            <div key={p.id} className={`rounded-xl border p-4 ${ans.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-start gap-3">
                {ans.isCorrect ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <MathText text={p.content} className="text-sm leading-relaxed text-gray-800 line-clamp-2" />
                  {!ans.isCorrect && (
                    <div className="mt-2 text-xs">
                      <span className="text-red-600">내 답: {ans.selected}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-medium text-green-700">정답: {p.answer}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 다음 세트 버튼 */}
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700"
      >
        다음 4문제
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/** 적응형 문제 풀기 — 4문제 세트 기반 맞춤 학습 */
export default function AdaptiveProblemSolving() {
  const { student } = useStudentContext();
  const [adaptiveSet, setAdaptiveSet] = useState<AdaptiveSet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 세트 내 각 문제 답변 기록 */
  const [setAnswers, setSetAnswers] = useState<{ problemId: string; selected: string; isCorrect: boolean }[]>([]);

  /** 세트 완료 상태 */
  const [showResult, setShowResult] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [newDifficulty, setNewDifficulty] = useState('');
  const [promotedTopic, setPromotedTopic] = useState('');

  /** 적응형 세트 로드 */
  const loadSet = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    setShowResult(false);
    setSetAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setPromoted(false);

    try {
      /** 미완료 세트가 있으면 이어풀기 */
      const incomplete = await getIncompleteSet(student.id);
      if (incomplete && incomplete.problems.length > 0) {
        setAdaptiveSet(incomplete);
      } else {
        /** 새 세트 구성 */
        const newSet = await composeAdaptiveSet(student.id, student.grade);
        setAdaptiveSet(newSet);
      }
    } catch {
      setError('문제를 구성하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => { loadSet(); }, [loadSet]);

  const problems = adaptiveSet?.problems ?? [];
  const problem: Problem | undefined = problems[currentIndex];

  /** 답안 제출 */
  const handleSubmit = async () => {
    if (!selectedAnswer || !problem || !student) return;
    const correct = selectedAnswer === problem.answer;
    setIsCorrect(correct);
    setIsSubmitted(true);
    setSubmitting(true);

    /** 답변 기록 */
    setSetAnswers((prev) => [...prev, { problemId: problem.id, selected: selectedAnswer, isCorrect: correct }]);

    try {
      await submitAnswer(student.id, problem.id, selectedAnswer, correct);
    } catch {
      /* 제출 실패해도 UI 유지 */
    } finally {
      setSubmitting(false);
    }
  };

  /** 다음 문제 / 세트 완료 */
  const handleNext = async () => {
    if (currentIndex + 1 < problems.length) {
      /** 다음 문제 */
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setIsCorrect(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      /** 세트 완료 → 결과 기록 + 승급 판정 */
      if (!adaptiveSet || !student) return;

      const allAnswers = [...setAnswers];
      /** 현재 문제의 답변이 아직 추가 안됐을 수 있음 */
      if (allAnswers.length < problems.length && selectedAnswer && problem) {
        allAnswers.push({
          problemId: problem.id,
          selected: selectedAnswer,
          isCorrect: selectedAnswer === problem.answer,
        });
      }

      try {
        const result = await recordSetResult(student.id, {
          setId: adaptiveSet.id,
          answers: allAnswers.map((a) => ({ problemId: a.problemId, isCorrect: a.isCorrect })),
        });

        if (result?.promoted) {
          setPromoted(true);
          setNewDifficulty(result.newDifficulty);
          setPromotedTopic(result.topic);
        }
      } catch {
        /* 기록 실패해도 결과 표시 */
      }

      setShowResult(true);
    }
  };

  /** 선택지 스타일 */
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

  /** 난이도 한글 라벨 */
  const diffLabel = (d: string) => d === 'easy' ? '쉬움' : d === 'medium' ? '보통' : '어려움';

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-semibold">먼저 홈에서 로그인해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-gray-500">맞춤 문제를 구성하고 있습니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <p>{error}</p>
        <button onClick={loadSet} className="mt-3 text-sm text-indigo-600 underline">다시 시도</button>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-semibold">풀 수 있는 문제가 없습니다</p>
        <p className="mt-1 text-sm">선생님이 문제를 출제하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  /** 세트 결과 화면 */
  if (showResult) {
    return (
      <SetResultView
        problems={problems}
        answers={setAnswers}
        promoted={promoted}
        newDifficulty={newDifficulty}
        promotedTopic={promotedTopic}
        onNext={loadSet}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 세트 정보 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700">
            {problem.topic}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
            {diffLabel(problem.difficulty)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* 진행률 도트 */}
          <div className="flex gap-1.5">
            {problems.map((_, i) => {
              const answered = setAnswers[i];
              let color = 'bg-gray-200';
              if (answered) {
                color = answered.isCorrect ? 'bg-green-500' : 'bg-red-500';
              } else if (i === currentIndex) {
                color = 'bg-indigo-500';
              }
              return <div key={i} className={`h-2.5 w-2.5 rounded-full ${color}`} />;
            })}
          </div>
          <span className="text-sm font-medium text-gray-400">{currentIndex + 1} / 4</span>
        </div>
      </div>

      {/* 문제 내용 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <MathText text={problem.content} className="text-lg font-semibold leading-relaxed text-gray-900" />
        {problem.figure && (
          <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
            <MathFigure spec={problem.figure} className="mt-4" />
          </Suspense>
        )}
      </div>

      {/* 선택지 */}
      <div className="space-y-3">
        {problem.choices.map((choice, index) => (
          <button
            key={choice}
            onClick={() => !isSubmitted && setSelectedAnswer(choice)}
            disabled={isSubmitted}
            className={getChoiceStyle(choice)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
              {CHOICE_LABELS[index]}
            </span>
            <MathText text={choice} />
          </button>
        ))}
      </div>

      {/* 제출 / 다음 버튼 */}
      {!isSubmitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '제출'}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-bold text-white transition-colors hover:bg-indigo-700"
        >
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
              <MathText text={problem.solution} className="mt-1 text-sm leading-relaxed text-gray-600" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

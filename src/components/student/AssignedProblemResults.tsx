import { CheckCircle, XCircle } from 'lucide-react';
import MathText from '../common/MathText';
import type { Problem } from '../../types';

/** 개별 채점 결과 타입 */
export interface GradingResult {
  problem: Problem;
  studentAnswer: string;
  isCorrect: boolean;
  errorAnalysis: string;
}

/** 채점 결과 요약 props */
interface AssignedProblemResultsProps {
  results: GradingResult[];
  onAddToWrongNotes: () => void;
  onRetry: () => void;
}

/** 배부 문제 채점 결과 화면 */
export default function AssignedProblemResults({
  results,
  onAddToWrongNotes,
  onRetry,
}: AssignedProblemResultsProps) {
  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const hasWrong = correctCount < total;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 요약 카드 */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 text-center text-white shadow-lg">
        <p className="text-sm font-medium text-indigo-200">채점 결과</p>
        <p className="mt-2 text-4xl font-extrabold">
          {total}문제 중 {correctCount}문제 정답
        </p>
        <p className="mt-1 text-lg font-semibold text-indigo-100">({accuracy}%)</p>
      </div>

      {/* 문제별 결과 목록 */}
      <div className="space-y-3">
        {results.map((r, idx) => (
          <div
            key={r.problem.id}
            className={`rounded-xl border p-4 ${
              r.isCorrect
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {r.isCorrect ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-700">문제 {idx + 1}</p>
                <div className="mt-1 text-sm text-gray-600">
                  <MathText text={r.problem.content} className="line-clamp-2" />
                </div>
                {!r.isCorrect && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-red-600">내 답: {r.studentAnswer}</p>
                    <p className="font-medium text-green-700">정답: {r.problem.answer}</p>
                    {r.errorAnalysis && (
                      <p className="mt-1 text-gray-500">{r.errorAnalysis}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        {hasWrong && (
          <button
            onClick={onAddToWrongNotes}
            className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition-colors hover:bg-red-600"
          >
            오답노트에 추가
          </button>
        )}
        <button
          onClick={onRetry}
          className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}

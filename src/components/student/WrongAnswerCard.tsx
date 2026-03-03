import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import MathText from '../common/MathText';
import type { Problem, WrongAnswerNote } from '../../types';

/** 쌍둥이 문제 타입 */
interface TwinProblem {
  content: string;
  choices: string[];
  answer: string;
  solution: string;
}

/** 오답 카드 props */
interface WrongAnswerCardProps {
  note: WrongAnswerNote;
  problem: Problem;
  onResolve: (noteId: string, resolved: boolean) => void;
  onDelete: (noteId: string) => void;
  studentId: string;
}

/** 선택지 라벨 */
const LABELS = ['A', 'B', 'C', 'D'];

/** 오답 카드 — 개별 오답 문제 표시, 쌍둥이 문제 생성, 해결 토글, 삭제 */
export default function WrongAnswerCard({
  note,
  problem,
  onResolve,
  onDelete,
  studentId,
}: WrongAnswerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [twin, setTwin] = useState<TwinProblem | null>(null);
  const [twinLoading, setTwinLoading] = useState(false);
  const [twinAnswer, setTwinAnswer] = useState<string | null>(null);
  const [twinSubmitted, setTwinSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** 쌍둥이 문제 생성 */
  const generateTwin = async () => {
    setTwinLoading(true);
    try {
      const res = await fetch('/api/generate-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          originalContent: problem.content,
          originalAnswer: problem.answer,
          studentError: note.errorAnalysis ?? '',
          grade: problem.grade,
          topic: problem.topic,
          difficulty: problem.difficulty,
          studentId,
        }),
      });
      if (!res.ok) throw new Error('생성 실패');
      const data = (await res.json()) as TwinProblem;
      setTwin(data);
      setTwinAnswer(null);
      setTwinSubmitted(false);
    } catch {
      /* 실패 시 조용히 처리 */
    } finally {
      setTwinLoading(false);
    }
  };

  /** 쌍둥이 문제 답안 제출 */
  const submitTwin = () => {
    if (!twinAnswer || !twin) return;
    setTwinSubmitted(true);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* 문제 내용 */}
      <div className="mb-3">
        <span className="mr-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
          {problem.topic}
        </span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {problem.difficulty === 'easy' ? '쉬움' : problem.difficulty === 'medium' ? '보통' : '어려움'}
        </span>
      </div>
      <MathText text={problem.content} className="text-base leading-relaxed text-gray-900" />

      {/* 내 답 / 정답 */}
      <div className="mt-3 space-y-1 text-sm">
        <p className="text-red-600">내 답: {note.originalAnswer}</p>
        <p className="font-medium text-green-700">정답: {note.correctAnswer}</p>
      </div>

      {/* 오답 분석 (접기/펼치기) */}
      {note.errorAnalysis && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          오답 분석
        </button>
      )}
      {expanded && note.errorAnalysis && (
        <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          {note.errorAnalysis}
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={generateTwin}
          disabled={twinLoading}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-gray-300"
        >
          {twinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '쌍둥이 문제'}
        </button>
        <button
          onClick={() => onResolve(note.id, !note.isResolved)}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            note.isResolved
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-green-50'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          {note.isResolved ? '해결됨' : '해결'}
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => onDelete(note.id)} className="font-bold text-red-600">삭제 확인</button>
            <button onClick={() => setConfirmDelete(false)} className="text-gray-400">취소</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 쌍둥이 문제 표시 */}
      {twin && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-2 text-sm font-bold text-indigo-700">쌍둥이 문제</p>
          <MathText text={twin.content} className="text-sm leading-relaxed text-gray-800" />
          <div className="mt-3 space-y-2">
            {twin.choices.map((c, i) => (
              <button
                key={c}
                onClick={() => !twinSubmitted && setTwinAnswer(c)}
                disabled={twinSubmitted}
                className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm ${
                  twinSubmitted && c === twin.answer ? 'border-green-500 bg-green-50' :
                  twinSubmitted && c === twinAnswer && c !== twin.answer ? 'border-red-500 bg-red-50' :
                  !twinSubmitted && c === twinAnswer ? 'border-indigo-500 bg-indigo-50' :
                  'border-gray-200'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">{LABELS[i]}</span>
                <MathText text={c} />
              </button>
            ))}
          </div>
          {!twinSubmitted && twinAnswer && (
            <button onClick={submitTwin} className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              제출
            </button>
          )}
          {twinSubmitted && (
            <p className={`mt-2 text-sm font-bold ${twinAnswer === twin.answer ? 'text-green-600' : 'text-red-600'}`}>
              {twinAnswer === twin.answer ? '정답입니다!' : `오답입니다. 정답: ${twin.answer}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

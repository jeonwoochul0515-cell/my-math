import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight, Camera, Send, Loader2, BookOpen } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { getStudentAssignments, updateAssignmentStatus } from '../../services/assignments';
import { collectWrongAnswers } from '../../services/wrongAnswers';
import { submitAnswer } from '../../services/problems';
import MathText from '../common/MathText';
import AssignedProblemResults, { type GradingResult } from './AssignedProblemResults';
import type { Problem, ProblemAssignment } from '../../types';

/** 도형/그래프 렌더러 (lazy load) */
const MathFigure = lazy(() => import('../common/MathFigure'));

/** 선택지 라벨 */
const CHOICE_LABELS = ['A', 'B', 'C', 'D'];

/** 배부된 문제 풀기 — 원장이 배부한 문제를 풀고 채점하는 화면 */
export default function AssignedProblemSolving() {
  const { student } = useStudentContext();
  const [assignments, setAssignments] = useState<ProblemAssignment[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [gradingMode, setGradingMode] = useState<'manual' | 'photo'>('manual');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [results, setResults] = useState<GradingResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 배부된 문제 로드 */
  const loadAssigned = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      const { assignments: asgn, problems: probs } = await getStudentAssignments(student.id);
      setAssignments(asgn);
      setProblems(probs);
    } catch {
      setError('배부된 문제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => { loadAssigned(); }, [loadAssigned]);

  /** 사진 촬영 후 처리 */
  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCapturedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  /** 채점 실행 (직접 입력 모드) */
  const gradeManual = async () => {
    if (!student) return;
    setGrading(true);
    try {
      const graded: GradingResult[] = problems.map((p) => {
        const studentAnswer = answers[p.id] ?? '';
        const isCorrect = studentAnswer === p.answer;
        return { problem: p, studentAnswer, isCorrect, errorAnalysis: isCorrect ? '' : '선택한 답이 정답과 다릅니다.' };
      });
      await saveAll(graded);
      setResults(graded);
    } catch { setError('채점 중 오류가 발생했습니다.'); }
    finally { setGrading(false); }
  };

  /** 채점 실행 (사진 모드) */
  const gradePhoto = async () => {
    if (!student || !capturedImage) return;
    setGrading(true);
    try {
      const res = await fetch('/api/ocr-grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage.split(',')[1], problems: problems.map((p) => ({ id: p.id, answer: p.answer, content: p.content })), studentId: student.id }),
      });
      if (!res.ok) throw new Error('OCR 채점 실패');
      const data = await res.json() as { results: { problemId: string; recognizedAnswer: string; isCorrect: boolean; errorAnalysis: string }[] };
      const graded: GradingResult[] = data.results.map((r) => {
        const prob = problems.find((p) => p.id === r.problemId)!;
        return { problem: prob, studentAnswer: r.recognizedAnswer, isCorrect: r.isCorrect, errorAnalysis: r.errorAnalysis };
      });
      await saveAll(graded);
      setResults(graded);
    } catch { setError('사진 채점 중 오류가 발생했습니다.'); }
    finally { setGrading(false); }
  };

  /** 채점 결과 DB 저장 + assignment 상태 갱신 */
  const saveAll = async (graded: GradingResult[]) => {
    if (!student) return;
    for (const r of graded) {
      await submitAnswer(student.id, r.problem.id, r.studentAnswer, r.isCorrect);
    }
    await updateAssignmentStatus(assignments.map((a) => a.id), 'graded');
  };

  /** 오답노트에 추가 */
  const addToWrongNotes = async () => {
    if (!student || !results) return;
    await collectWrongAnswers(student.id, results.map((r) => ({
      problemId: r.problem.id, answer: r.studentAnswer,
      correctAnswer: r.problem.answer, isCorrect: r.isCorrect, errorAnalysis: r.errorAnalysis,
    })));
  };

  if (!student) return <EmptyState text="먼저 홈에서 로그인해주세요." />;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="flex flex-col items-center py-20 text-red-500"><p>{error}</p><button onClick={loadAssigned} className="mt-3 text-sm text-indigo-600 underline">다시 시도</button></div>;
  if (problems.length === 0) return <EmptyState text="배부된 문제가 없습니다" sub="선생님이 문제를 배부하면 여기에 표시됩니다." />;
  if (results) return <AssignedProblemResults results={results} onAddToWrongNotes={addToWrongNotes} onRetry={() => { setResults(null); loadAssigned(); }} />;

  const problem = problems[currentIdx];
  const selected = answers[problem.id] ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* 문제 번호 */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">{problem.topic}</span>
        {problem.subTopic && (
          <span className="ml-1 text-xs text-gray-400">{problem.subTopic}</span>
        )}
        <span className="text-sm font-medium text-gray-400">{currentIdx + 1}/{problems.length}</span>
      </div>
      {/* 문제 내용 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <MathText text={problem.content} className="text-lg font-semibold leading-relaxed text-gray-900" />
        {problem.figure && (
          <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
            <MathFigure spec={problem.figure} className="mt-4" />
          </Suspense>
        )}
      </div>
      {/* 선택지 (직접 입력 모드) */}
      {gradingMode === 'manual' && (
        <div className="space-y-3">
          {problem.choices.map((c, i) => (
            <button key={c} onClick={() => setAnswers((prev) => ({ ...prev, [problem.id]: c }))} className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left font-medium transition-all ${selected === c ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">{CHOICE_LABELS[i]}</span>
              <MathText text={c} />
            </button>
          ))}
        </div>
      )}
      {/* 사진 모드 */}
      {gradingMode === 'photo' && (
        <div className="space-y-3">
          {capturedImage ? (
            <img src={capturedImage} alt="촬영 이미지" className="w-full rounded-xl border border-gray-200" />
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 hover:border-indigo-400">
              <Camera className="h-10 w-10 text-gray-400" />
              <span className="text-sm text-gray-500">답안지를 촬영해주세요</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
            </label>
          )}
        </div>
      )}
      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))} disabled={currentIdx === 0} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" />이전</button>
        <button onClick={() => setCurrentIdx((p) => Math.min(problems.length - 1, p + 1))} disabled={currentIdx === problems.length - 1} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">다음<ChevronRight className="h-4 w-4" /></button>
      </div>
      {/* 채점 모드 선택 + 제출 */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <button onClick={() => setGradingMode('manual')} className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${gradingMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Send className="mb-0.5 mr-1 inline h-4 w-4" />직접 입력</button>
          <button onClick={() => setGradingMode('photo')} className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${gradingMode === 'photo' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Camera className="mb-0.5 mr-1 inline h-4 w-4" />사진 채점</button>
        </div>
        <button onClick={gradingMode === 'manual' ? gradeManual : gradePhoto} disabled={grading || (gradingMode === 'photo' && !capturedImage)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-700 disabled:bg-gray-300">
          {grading ? <Loader2 className="h-5 w-5 animate-spin" /> : '채점하기'}
        </button>
      </div>
    </div>
  );
}

/** 빈 상태 안내 */
function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
      <p className="text-lg font-semibold">{text}</p>
      {sub && <p className="mt-1 text-sm">{sub}</p>}
    </div>
  );
}

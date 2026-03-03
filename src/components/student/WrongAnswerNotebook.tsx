import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { useStudentContext } from '../../context/StudentContext';
import { getWrongAnswers, toggleWrongAnswerResolved, deleteWrongAnswer } from '../../services/wrongAnswers';
import WrongAnswerCard from './WrongAnswerCard';
import type { Problem, WrongAnswerNote } from '../../types';

/** 필터 타입 */
type FilterType = 'all' | 'unresolved' | 'resolved';

/** 오답노트 — 학생의 오답 모음, 쌍둥이 문제 생성, 해결 관리 */
export default function WrongAnswerNotebook() {
  const { student } = useStudentContext();
  const [notes, setNotes] = useState<(WrongAnswerNote & { problem: Problem })[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const touchStartX = useRef(0);

  /** 오답노트 목록 로드 */
  const loadNotes = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWrongAnswers(student.id);
      setNotes(data);
    } catch {
      setError('오답노트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  /** 필터된 노트 목록 */
  const filtered = notes.filter((n) => {
    if (filter === 'unresolved') return !n.isResolved;
    if (filter === 'resolved') return n.isResolved;
    return true;
  });

  /** 필터 변경 시 인덱스 리셋 */
  useEffect(() => { setCurrentIdx(0); }, [filter]);

  /** 해결 토글 */
  const handleResolve = async (noteId: string, resolved: boolean) => {
    try {
      await toggleWrongAnswerResolved(noteId, resolved);
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, isResolved: resolved } : n));
    } catch { /* 조용히 처리 */ }
  };

  /** 삭제 */
  const handleDelete = async (noteId: string) => {
    try {
      await deleteWrongAnswer(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setCurrentIdx((prev) => Math.max(0, prev - 1));
    } catch { /* 조용히 처리 */ }
  };

  /** 스와이프 핸들러 */
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60 && currentIdx > 0) setCurrentIdx((p) => p - 1);
    if (delta < -60 && currentIdx < filtered.length - 1) setCurrentIdx((p) => p + 1);
  };

  if (!student) return <Empty text="먼저 홈에서 로그인해주세요." />;
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="flex flex-col items-center py-20 text-red-500"><p>{error}</p><button onClick={loadNotes} className="mt-3 text-sm text-indigo-600 underline">다시 시도</button></div>;

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'unresolved', label: '미해결' }, { key: 'resolved', label: '해결됨' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">오답노트</h2>
        <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-bold text-indigo-700">{notes.length}문제</span>
      </div>
      {/* 필터 탭 */}
      <div className="flex gap-2">
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${filter === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty text={filter === 'all' ? '오답노트가 비어있습니다' : filter === 'unresolved' ? '미해결 문제가 없습니다' : '해결된 문제가 없습니다'} />
      ) : (
        <div className="flex flex-col md:flex-row md:gap-4">
          {/* 데스크톱: 왼쪽 리스트 */}
          <div className="hidden w-64 shrink-0 md:block">
            <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
              {filtered.map((n, idx) => (
                <button key={n.id} onClick={() => setCurrentIdx(idx)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${idx === currentIdx ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${n.isResolved ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="truncate">{n.problem.topic}: {n.problem.content.slice(0, 30)}</span>
                </button>
              ))}
            </div>
          </div>
          {/* 카드 뷰 (모바일 + 데스크톱 오른쪽) */}
          <div className="flex-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {filtered[currentIdx] && (
              <WrongAnswerCard
                note={filtered[currentIdx]}
                problem={filtered[currentIdx].problem}
                onResolve={handleResolve}
                onDelete={handleDelete}
                studentId={student.id}
              />
            )}
            {/* 네비게이션 */}
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))} disabled={currentIdx === 0} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />이전
              </button>
              <span className="text-sm font-medium text-gray-400">{currentIdx + 1}/{filtered.length}</span>
              <button onClick={() => setCurrentIdx((p) => Math.min(filtered.length - 1, p + 1))} disabled={currentIdx === filtered.length - 1} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                다음<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 빈 상태 안내 */
function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
      <p className="text-lg font-semibold">{text}</p>
    </div>
  );
}

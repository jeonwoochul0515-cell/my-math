import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, X, BookOpen, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import { useStudents } from '../../hooks/useStudents';
import { getClasses, createClass, deleteClass, updateCoveredTopics } from '../../services/classes';
import { getTopicList } from '../../data/curriculum2022';
import Loading from '../common/Loading';
import type { Class } from '../../types';

/** 수업 일정 문자열 포맷 */
function formatSchedule(schedule: Class['schedule']): string {
  return schedule.map((s) => `${s.day} ${s.startTime}~${s.endTime}`).join(', ');
}

/** 등록률 퍼센트 계산 */
function getPercent(enrolled: number, capacity: number): number {
  return capacity === 0 ? 0 : Math.round((enrolled / capacity) * 100);
}

/** 반 관리 페이지 - 반 목록, 일정, 인원 현황 */
export default function ClassManagement() {
  const { user } = useAuth();
  const { academy, loading: academyLoading } = useAcademy(user?.uid ?? null);
  const { students, loading: studentsLoading } = useStudents(academy?.id ?? null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('중1');
  const [formCapacity, setFormCapacity] = useState(10);
  /** 진도 관리 상태 */
  const [progressClassId, setProgressClassId] = useState<string | null>(null);
  const [progressTopics, setProgressTopics] = useState<string[]>([]);
  const [progressSaving, setProgressSaving] = useState(false);

  /** 반 목록 로드 */
  const loadClasses = useCallback(async () => {
    if (!academy?.id) { setDataLoading(false); return; }
    setDataLoading(true);
    try {
      const data = await getClasses(academy.id);
      setClasses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '반 목록을 불러오지 못했습니다.');
    } finally { setDataLoading(false); }
  }, [academy?.id]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  /** 반 추가 처리 */
  const handleCreate = async () => {
    if (!academy?.id || !formName.trim()) return;
    setFormLoading(true);
    try {
      const newClass = await createClass({
        name: formName.trim(), grade: formGrade, schedule: [],
        capacity: formCapacity, academyId: academy.id,
      });
      setClasses((prev) => [...prev, newClass]);
      setShowForm(false);
      setFormName('');
      setFormCapacity(10);
    } catch (err) {
      alert(err instanceof Error ? err.message : '반 생성에 실패했습니다.');
    } finally { setFormLoading(false); }
  };

  /** 반 삭제 처리 */
  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 반을 삭제하시겠습니까?')) return;
    setDeleteLoading(id);
    try {
      await deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '반 삭제에 실패했습니다.');
    } finally { setDeleteLoading(null); }
  };

  /** 진도 관리 패널 열기 */
  const openProgress = (cls: Class) => {
    setProgressClassId(cls.id);
    setProgressTopics([...cls.coveredTopics]);
  };

  /** 진도 토글 (개별 단원) */
  const toggleTopic = (topic: string) => {
    setProgressTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  /** 여기까지 전체 선택 (교육과정 순서대로 해당 단원까지 모두 체크) */
  const selectUpTo = (topic: string, allTopics: string[]) => {
    const idx = allTopics.indexOf(topic);
    if (idx < 0) return;
    setProgressTopics(allTopics.slice(0, idx + 1));
  };

  /** 진도 저장 */
  const saveProgress = async () => {
    if (!progressClassId) return;
    setProgressSaving(true);
    try {
      await updateCoveredTopics(progressClassId, progressTopics);
      setClasses((prev) =>
        prev.map((c) => c.id === progressClassId ? { ...c, coveredTopics: [...progressTopics] } : c)
      );
      setProgressClassId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '진도 저장에 실패했습니다.');
    } finally {
      setProgressSaving(false);
    }
  };

  if (academyLoading || studentsLoading) return <Loading role="owner" message="반 목록을 불러오는 중..." />;
  if (!academy) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium text-gray-700">학원을 먼저 등록해주세요</p>
      </div>
    );
  }

  const countByClass = (classId: string): number => students.filter((s) => s.classId === classId).length;
  const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">반 관리</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> 반 추가
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">새 반 추가</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">반 이름</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 중1A" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상 학년</label>
              <select value={formGrade} onChange={(e) => setFormGrade(e.target.value)} className={INPUT_CLASS}>
                {['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">정원</label>
              <input type="number" min={1} max={50} value={formCapacity} onChange={(e) => setFormCapacity(Number(e.target.value))} className={INPUT_CLASS} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={formLoading || !formName.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 추가하기
          </button>
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {dataLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : classes.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">등록된 반이 없습니다. 반을 추가해보세요.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {classes.map((cls) => {
            const enrolled = countByClass(cls.id);
            const percent = getPercent(enrolled, cls.capacity);
            const barColor = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-yellow-500' : 'bg-blue-500';
            return (
              <div key={cls.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">{cls.grade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{enrolled}/{cls.capacity}명</span>
                    <button onClick={() => handleDelete(cls.id)} disabled={deleteLoading === cls.id}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      {deleteLoading === cls.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {cls.schedule.length > 0 && <p className="mt-3 text-sm text-gray-600">{formatSchedule(cls.schedule)}</p>}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>등록률</span><span>{percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
                {/* 진도 현황 */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      진도: <span className="font-medium text-gray-700">{cls.coveredTopics.length}개 단원 완료</span>
                    </div>
                    <button
                      onClick={() => openProgress(cls)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      진도 관리
                    </button>
                  </div>
                  {cls.coveredTopics.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400 truncate">
                      최근: {cls.coveredTopics[cls.coveredTopics.length - 1]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 진도 관리 패널 (모달) */}
      {progressClassId && (() => {
        const cls = classes.find((c) => c.id === progressClassId);
        if (!cls) return null;
        const allTopics = getTopicList(cls.grade);
        const coveredCount = progressTopics.length;
        const totalCount = allTopics.length;
        const progressPercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
              {/* 헤더 */}
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{cls.name} 진도 관리</h3>
                    <p className="text-sm text-gray-500">{cls.grade} · {coveredCount}/{totalCount}개 단원 ({progressPercent}%)</p>
                  </div>
                  <button onClick={() => setProgressClassId(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* 진도 바 */}
                <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* 단원 목록 */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {allTopics.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">해당 학년의 교육과정 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-1">
                    {allTopics.map((topic, idx) => {
                      const checked = progressTopics.includes(topic);
                      return (
                        <div
                          key={topic}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                            checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleTopic(topic)}
                        >
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                          }`}>
                            {checked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                          <span className={`text-sm ${checked ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {topic}
                          </span>
                          {/* 여기까지 선택 버튼 */}
                          <button
                            onClick={(e) => { e.stopPropagation(); selectUpTo(topic, allTopics); }}
                            className="ml-auto text-xs text-blue-500 hover:text-blue-700 hover:underline whitespace-nowrap"
                          >
                            여기까지
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="border-t border-gray-200 px-5 py-4 flex items-center gap-3">
                <button
                  onClick={() => setProgressTopics(allTopics)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  전체 선택
                </button>
                <button
                  onClick={() => setProgressTopics([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  전체 해제
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setProgressClassId(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveProgress}
                  disabled={progressSaving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {progressSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

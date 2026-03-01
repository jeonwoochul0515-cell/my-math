import { useState, useEffect } from 'react';
import { Save, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import Loading from '../common/Loading';

/** 설정 페이지 - 학원 정보 수정 및 서비스 정보 */
export default function OwnerSettings() {
  const { user } = useAuth();
  const { academy, loading, error: academyError, create, update } = useAcademy(user?.uid ?? null);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 학원 정보가 로드되면 폼에 반영 */
  useEffect(() => {
    if (academy) {
      setName(academy.name);
    }
  }, [academy]);

  /** 학원 생성 핸들러 */
  const handleCreate = async () => {
    if (!name.trim()) {
      setError('학원명을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await create(name.trim());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '학원 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /** 학원 정보 저장 핸들러 */
  const handleSave = async () => {
    if (!name.trim()) {
      setError('학원명을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await update({ name: name.trim() });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading role="owner" message="설정을 불러오는 중..." />;
  }

  /** 학원 미등록 - 생성 폼 표시 */
  if (!academy) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">설정</h2>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">학원 등록</h3>
          <p className="mb-4 text-sm text-gray-500">
            학원을 등록하면 학생 관리, 출결 관리 등 모든 기능을 사용할 수 있습니다.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학원명</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setSaved(false); setError(null); }}
                placeholder="예: 이룸수학학원"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {(error || academyError) && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error ?? academyError}</div>
            )}
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              학원 등록
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">설정</h2>

      {/* 학원 정보 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">학원 정보</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학원명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); setError(null); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학원 ID</label>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">{academy.id}</p>
          </div>
          {(error || academyError) && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error ?? academyError}</div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              저장
            </button>
            {saved && (
              <span className="text-sm font-medium text-green-600">저장되었습니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* 서비스 정보 */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">서비스 정보</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 w-20">서비스명</dt>
            <dd className="text-gray-900">마이매쓰 (MyMath)</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 w-20">버전</dt>
            <dd className="text-gray-900">0.1.0</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 w-20">운영사</dt>
            <dd className="text-gray-900">이룸수학</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            본 서비스는 한국지능정보사회진흥원(NIA)의 AI 학습용 데이터를 활용하여 개발되었습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

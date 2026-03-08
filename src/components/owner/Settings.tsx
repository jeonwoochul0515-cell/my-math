import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Loader2, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAcademy } from '../../hooks/useAcademy';
import Loading from '../common/Loading';
import { SUPPORTED_PUBLISHERS } from '../../data/curriculum2022';
import { uploadLogo, deleteLogo } from '../../services/logo';

/** 설정 페이지 - 학원 정보 수정 및 서비스 정보 */
export default function OwnerSettings() {
  const { user } = useAuth();
  const { academy, loading, error: academyError, create, update } = useAcademy(user?.uid ?? null);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 로고 파일 업로드 공통 핸들러 */
  const handleLogoFile = async (file: File) => {
    if (!user?.uid) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('로고 파일은 2MB 이하만 가능합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setLogoUploading(true);
    setError(null);
    try {
      const url = await uploadLogo(user.uid, file);
      await update({ logoUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로고 업로드에 실패했습니다.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

      {/* 학원 로고 (화이트라벨) */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">학원 로고</h3>
        <p className="mb-4 text-sm text-gray-500">
          등록한 로고는 시험지 인쇄, 앱 헤더 등에 표시됩니다.
        </p>

        {/* 드래그앤드롭 영역 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) await handleLogoFile(file);
          }}
          onClick={() => !logoUploading && fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : academy.logoUrl
                ? 'border-gray-200 bg-gray-50 hover:border-gray-300'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          {academy.logoUrl ? (
            <img src={academy.logoUrl} alt="학원 로고" className="h-20 w-20 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
          )}
          {logoUploading ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              업로드 중...
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {dragging ? '여기에 놓으세요' : '클릭하거나 이미지를 드래그하세요'}
            </p>
          )}
          <p className="text-xs text-gray-400">PNG, JPG, SVG, WebP (최대 2MB)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleLogoFile(file);
          }}
        />

        {/* 로고 삭제 버튼 */}
        {academy.logoUrl && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user?.uid) return;
              setLogoUploading(true);
              setError(null);
              try {
                await deleteLogo(user.uid);
                await update({ logoUrl: null });
              } catch (err) {
                setError(err instanceof Error ? err.message : '로고 삭제에 실패했습니다.');
              } finally {
                setLogoUploading(false);
              }
            }}
            disabled={logoUploading}
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            로고 삭제
          </button>
        )}
      </div>

      {/* 교과서 설정 */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">교과서 설정</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">사용 교과서 출판사</label>
          <select
            value={academy?.textbookPublisher ?? '교육과정 순서'}
            onChange={e => update({ textbookPublisher: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {SUPPORTED_PUBLISHERS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">AI 출제 화면에서 단원 표시 순서가 변경됩니다.</p>
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

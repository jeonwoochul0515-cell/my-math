import { useState } from 'react';
import { Save } from 'lucide-react';

/** 학원 정보 폼 데이터 타입 */
interface AcademyForm {
  name: string;
  ownerName: string;
  phone: string;
}

/** 설정 페이지 - 학원 정보 수정 및 서비스 정보 */
export default function OwnerSettings() {
  const [form, setForm] = useState<AcademyForm>({
    name: '이룸수학학원',
    ownerName: '김우철',
    phone: '02-1234-5678',
  });
  const [saved, setSaved] = useState(false);

  /** 입력값 변경 핸들러 */
  const handleChange = (field: keyof AcademyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  /** 저장 버튼 클릭 핸들러 (목업 - 실제 API 호출 없음) */
  const handleSave = () => {
    try {
      setSaved(true);
    } catch {
      alert('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

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
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">원장명</label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              저장
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">저장되었습니다.</span>
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, ChevronRight, Phone, MapPin } from 'lucide-react';
import { getAllAcademies, getStudentCounts } from '../../services/admin';
import Loading from '../common/Loading';
import type { Academy } from '../../types';

/** 학원 관리 목록 페이지 */
export default function AcademyList() {
  const navigate = useNavigate();
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /** 데이터 로드 */
  useEffect(() => {
    Promise.all([getAllAcademies(), getStudentCounts()])
      .then(([a, c]) => {
        setAcademies(a);
        setStudentCounts(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loading role="admin" message="학원 목록을 불러오는 중..." />;
  }

  /** 검색 필터 */
  const filtered = academies.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.ownerPhone ?? '').includes(search) ||
    (a.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-gray-700" />
        <h2 className="text-xl font-bold text-gray-900">학원 관리</h2>
        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {academies.length}개
        </span>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="학원명, 연락처, 주소 검색..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-800"
        />
      </div>

      {/* 학원 목록 */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {search ? '검색 결과가 없습니다.' : '등록된 학원이 없습니다.'}
        </p>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">학원명</th>
                  <th className="px-4 py-3 font-medium text-gray-600">연락처</th>
                  <th className="px-4 py-3 font-medium text-gray-600">주소</th>
                  <th className="px-4 py-3 font-medium text-gray-600">학생 수</th>
                  <th className="px-4 py-3 font-medium text-gray-600">등록일</th>
                  <th className="px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/admin/academies/${a.id}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.ownerPhone || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.address || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {studentCounts[a.id] ?? 0}명
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.createdAt.toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/admin/academies/${a.id}`)}
                className="w-full rounded-xl bg-white p-4 shadow-sm text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">{a.name}</h3>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  {a.ownerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{a.ownerPhone}</span>
                    </div>
                  )}
                  {a.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{a.address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">
                      학생 {studentCounts[a.id] ?? 0}명
                    </span>
                    <span className="text-xs text-gray-400">
                      {a.createdAt.toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

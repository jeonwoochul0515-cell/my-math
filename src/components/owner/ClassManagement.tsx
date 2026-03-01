import { Plus } from 'lucide-react';

/** 반 데이터 타입 */
interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  enrolled: number;
  capacity: number;
}

/** 반 목업 데이터 */
const MOCK_CLASSES: ClassInfo[] = [
  {
    id: '1',
    name: '중1A',
    grade: '중1',
    schedule: [
      { day: '월', startTime: '16:00', endTime: '18:00' },
      { day: '수', startTime: '16:00', endTime: '18:00' },
    ],
    enrolled: 8,
    capacity: 10,
  },
  {
    id: '2',
    name: '중2A',
    grade: '중2',
    schedule: [
      { day: '화', startTime: '16:00', endTime: '18:00' },
      { day: '목', startTime: '16:00', endTime: '18:00' },
    ],
    enrolled: 12,
    capacity: 12,
  },
  {
    id: '3',
    name: '중2B',
    grade: '중2',
    schedule: [
      { day: '월', startTime: '18:00', endTime: '20:00' },
      { day: '수', startTime: '18:00', endTime: '20:00' },
    ],
    enrolled: 7,
    capacity: 12,
  },
  {
    id: '4',
    name: '고1A',
    grade: '고1',
    schedule: [
      { day: '화', startTime: '18:00', endTime: '20:30' },
      { day: '금', startTime: '18:00', endTime: '20:30' },
    ],
    enrolled: 10,
    capacity: 15,
  },
];

/** 수업 일정 문자열 포맷 */
function formatSchedule(schedule: ClassInfo['schedule']): string {
  return schedule
    .map((s) => `${s.day} ${s.startTime}~${s.endTime}`)
    .join(', ');
}

/** 등록률 퍼센트 계산 */
function getEnrollmentPercent(enrolled: number, capacity: number): number {
  return Math.round((enrolled / capacity) * 100);
}

/** 반 관리 페이지 - 반 목록, 일정, 인원 현황 */
export default function ClassManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">반 관리</h2>
        <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          반 추가
        </button>
      </div>

      {/* 반 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {MOCK_CLASSES.map((cls) => {
          const percent = getEnrollmentPercent(cls.enrolled, cls.capacity);
          const barColor = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-yellow-500' : 'bg-blue-500';

          return (
            <div key={cls.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                  <p className="text-sm text-gray-500">{cls.grade}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {cls.enrolled}/{cls.capacity}명
                </span>
              </div>

              {/* 일정 */}
              <p className="mt-3 text-sm text-gray-600">
                {formatSchedule(cls.schedule)}
              </p>

              {/* 등록률 프로그레스 바 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>등록률</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${barColor} transition-all`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

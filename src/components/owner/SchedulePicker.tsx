import { useState, useCallback } from 'react';

/** 요일 목록 */
const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 30분 단위 시간 슬롯 생성 (14:00 ~ 22:00) */
const TIME_SLOTS: string[] = [];
for (let h = 14; h < 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

/** 슬롯 키 (예: '월-14:00') */
type SlotKey = string;
function toKey(day: string, time: string): SlotKey {
  return `${day}-${time}`;
}

/** 선택된 슬롯으로부터 schedule 배열 생성 (연속 슬롯을 하나의 블록으로 합침) */
function slotsToSchedule(selected: Set<SlotKey>): { day: string; startTime: string; endTime: string }[] {
  const result: { day: string; startTime: string; endTime: string }[] = [];
  for (const day of DAYS) {
    let blockStart: string | null = null;
    let lastTime: string | null = null;
    for (let i = 0; i < TIME_SLOTS.length; i++) {
      const time = TIME_SLOTS[i];
      if (selected.has(toKey(day, time))) {
        if (!blockStart) blockStart = time;
        lastTime = time;
      }
      if (!selected.has(toKey(day, time)) || i === TIME_SLOTS.length - 1) {
        if (blockStart && lastTime) {
          // endTime = lastTime + 30분
          const lastIdx = TIME_SLOTS.indexOf(lastTime);
          const endTime = lastIdx < TIME_SLOTS.length - 1 ? TIME_SLOTS[lastIdx + 1] : '22:00';
          result.push({ day, startTime: blockStart, endTime });
        }
        blockStart = null;
        lastTime = null;
      }
    }
  }
  return result;
}

/** schedule 배열로부터 선택된 슬롯 Set 생성 */
function scheduleToSlots(schedule: { day: string; startTime: string; endTime: string }[]): Set<SlotKey> {
  const set = new Set<SlotKey>();
  for (const entry of schedule) {
    const startIdx = TIME_SLOTS.indexOf(entry.startTime);
    const endIdx = TIME_SLOTS.indexOf(entry.endTime);
    const end = endIdx >= 0 ? endIdx : TIME_SLOTS.length;
    for (let i = startIdx; i < end && i >= 0; i++) {
      set.add(toKey(entry.day, TIME_SLOTS[i]));
    }
  }
  return set;
}

/** 시간표 선택 컴포넌트 - 30분 단위 클릭/드래그 */
export default function SchedulePicker({
  value,
  onChange,
}: {
  value: { day: string; startTime: string; endTime: string }[];
  onChange: (schedule: { day: string; startTime: string; endTime: string }[]) => void;
}) {
  const [selected, setSelected] = useState<Set<SlotKey>>(() => scheduleToSlots(value));
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');

  /** 슬롯 토글 후 부모에 전달 */
  const updateSelected = useCallback((next: Set<SlotKey>) => {
    setSelected(next);
    onChange(slotsToSchedule(next));
  }, [onChange]);

  /** 마우스/터치 시작 */
  const handleStart = (day: string, time: string) => {
    const key = toKey(day, time);
    const mode = selected.has(key) ? 'remove' : 'add';
    setDragging(true);
    setDragMode(mode);
    const next = new Set(selected);
    mode === 'add' ? next.add(key) : next.delete(key);
    updateSelected(next);
  };

  /** 드래그 중 슬롯 진입 */
  const handleEnter = (day: string, time: string) => {
    if (!dragging) return;
    const key = toKey(day, time);
    const next = new Set(selected);
    dragMode === 'add' ? next.add(key) : next.delete(key);
    updateSelected(next);
  };

  /** 드래그 종료 */
  const handleEnd = () => setDragging(false);

  return (
    <div className="select-none" onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchEnd={handleEnd}>
      <label className="block text-sm font-medium text-gray-700 mb-2">수업 시간표</label>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-14 border-b border-r border-gray-200 bg-gray-50 px-1 py-2 text-gray-500">시간</th>
              {DAYS.map((d) => (
                <th key={d} className="border-b border-gray-200 bg-gray-50 px-1 py-2 text-center text-gray-700 font-medium min-w-[40px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time}>
                <td className="border-r border-gray-200 bg-gray-50 px-1 py-0.5 text-center text-gray-400 whitespace-nowrap">
                  {time}
                </td>
                {DAYS.map((day) => {
                  const key = toKey(day, time);
                  const isSelected = selected.has(key);
                  return (
                    <td
                      key={key}
                      className={`border border-gray-100 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500' : 'hover:bg-blue-100'
                      }`}
                      style={{ height: '24px' }}
                      onMouseDown={(e) => { e.preventDefault(); handleStart(day, time); }}
                      onMouseEnter={() => handleEnter(day, time)}
                      onTouchStart={(e) => { e.preventDefault(); handleStart(day, time); }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const d = el?.getAttribute('data-day');
                        const t = el?.getAttribute('data-time');
                        if (d && t) handleEnter(d, t);
                      }}
                      data-day={day}
                      data-time={time}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {slotsToSchedule(selected).map((s) => (
            <span key={`${s.day}-${s.startTime}`} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {s.day} {s.startTime}~{s.endTime}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

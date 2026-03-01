/** 사용자 역할 */
export type UserRole = 'owner' | 'student' | 'parent';

/** 학원 정보 */
export interface Academy {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

/** 학생 정보 */
export interface Student {
  id: string;
  name: string;
  grade: string;
  phone: string;
  parentPhone: string;
  pin: string;
  classId: string;
  academyId: string;
  createdAt: Date;
}

/** 반 정보 */
export interface Class {
  id: string;
  name: string;
  grade: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  capacity: number;
  academyId: string;
}

/** 출결 기록 */
export interface AttendanceRecord {
  id: string;
  studentId: string;
  checkIn: Date;
  checkOut?: Date;
  date: string;
}

/** 문제 */
export interface Problem {
  id: string;
  content: string;
  answer: string;
  solution: string;
  grade: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  choices: string[];
  source: 'aihub' | 'ai-generated' | 'manual';
}

/** 풀이 기록 */
export interface SolveLog {
  id: string;
  studentId: string;
  problemId: string;
  answer: string;
  isCorrect: boolean;
  solvedAt: Date;
}

/** 알림 */
export interface Notification {
  id: string;
  studentId: string;
  parentId: string;
  type: 'attendance' | 'grade' | 'weakness';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

/** 약점 분석 리포트 */
export interface WeaknessReport {
  topic: string;
  accuracy: number;
  totalProblems: number;
  correctCount: number;
  recommendation: string;
}

/** 내비게이션 메뉴 아이템 */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

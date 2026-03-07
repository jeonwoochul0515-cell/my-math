/** 사용자 역할 */
export type UserRole = 'owner' | 'student' | 'parent' | 'admin';

/** 학원 정보 */
export interface Academy {
  id: string;
  name: string;
  ownerId: string;
  ownerPhone?: string;
  address?: string;
  textbookPublisher?: string;
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

/** JSXGraph 도형/그래프 요소 */
export type FigureElement =
  | { type: 'point'; name: string; coords: [number, number]; label?: boolean }
  | { type: 'segment'; from: string; to: string }
  | { type: 'line'; from: string; to: string; dash?: boolean }
  | { type: 'circle'; center: string; radius?: number; through?: string }
  | { type: 'polygon'; vertices: string[] }
  | { type: 'angle'; points: [string, string, string]; label?: string }
  | { type: 'functiongraph'; fn: string; range?: [number, number] }
  | { type: 'text'; coords: [number, number]; value: string };

/** JSXGraph 도형/그래프 명세 */
export interface FigureSpec {
  boundingBox: [number, number, number, number];
  elements: FigureElement[];
  axis?: boolean;
  grid?: boolean;
}

/** 문제 */
export interface Problem {
  id: string;
  content: string;
  answer: string;
  solution: string;
  grade: string;
  topic: string;
  subTopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  choices: string[];
  source: 'aihub' | 'ai-generated' | 'manual' | 'japan-huggingface' | 'japan-ftext' | 'japan-aquarium';
  figure?: FigureSpec;
}

/** 풀이 기록 */
export interface SolveLog {
  id: string;
  studentId: string;
  problemId: string;
  answer: string;
  isCorrect: boolean;
  solvedAt: Date;
  assignmentId?: string;
  errorAnalysis?: string;
  weakTopics?: string[];
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
  subTopic?: string;
  majorChapter?: string;
  accuracy: number;
  totalProblems: number;
  correctCount: number;
  recommendation: string;
}

/** 결제 상태 */
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

/** 결제 내역 */
export interface Payment {
  id: string;
  academyId: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  memo: string;
  paidAt: Date | null;
  periodStart: string;
  periodEnd: string;
  createdAt: Date;
}

/** 문제 배부 */
export interface ProblemAssignment {
  id: string;
  studentId: string;
  problemId: string;
  assignedBy: string;
  academyId: string;
  status: 'pending' | 'submitted' | 'graded';
  assignedAt: Date;
  submittedAt: Date | null;
}

/** OCR 채점 결과 */
export interface OCRResult {
  id: string;
  studentId: string;
  problemId: string;
  assignmentId: string | null;
  recognizedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  errorAnalysis: string | null;
  weakTopics: string[];
  confidence: number;
  createdAt: Date;
}

/** 오답노트 항목 */
export interface WrongAnswerNote {
  id: string;
  studentId: string;
  problemId: string;
  originalAnswer: string;
  correctAnswer: string;
  errorAnalysis: string | null;
  retryCount: number;
  isResolved: boolean;
  createdAt: Date;
}

/** AI 분석 보고서 */
export interface AIReport {
  id: string;
  studentId: string;
  reportType: 'weakness' | 'parent_analysis' | 'guidance_plan';
  content: string;
  data: Record<string, unknown>;
  validUntil: Date | null;
  createdAt: Date;
}

/** 내비게이션 메뉴 아이템 */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

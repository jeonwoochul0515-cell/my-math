# CLAUDE.md — 마이매쓰(MyMath) 프로젝트 지시서

## 이 프로젝트가 뭔지

"마이매쓰"는 **소형 수학학원**(학생 50명 이하)을 위한 SaaS 앱이다.
운영사: 이룸수학 / 대표: 우철 / 목표 가격: 월 79,000원 / 타겟: 전국 2만개 소형학원

## 사용자 역할 3가지

| 역할 | 주요 기능 | 로그인 방식 |
|------|----------|------------|
| 원장(owner) | 대시보드, 출결관리, 반관리, AI출제, 설정 | 이메일/비밀번호 |
| 학생(student) | 홈, 문제풀기, 성적확인, 내정보 | 4자리 PIN |
| 학부모(parent) | 홈, 자녀성적, 출결확인, 알림 | 전화번호 인증 |

## 기술 스택

- **프론트엔드**: React 18 + TypeScript + Vite
- **스타일링**: Tailwind CSS (한글 폰트: Pretendard)
- **라우팅**: react-router-dom
- **차트**: recharts
- **아이콘**: lucide-react
- **인증**: Firebase Authentication
- **데이터베이스**: Supabase (PostgreSQL + pgvector)
- **호스팅**: Cloudflare Pages
- **AI 문제 생성**: Claude API (Cloudflare Pages Functions에서 호출)
- **벡터 검색**: Supabase pgvector (문제 유사도 검색)
- **임베딩**: Google Gemini Embedding API (text-embedding-004, 768차원)

## 폴더 구조

```
mymath-app/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # 역할 선택 화면
│   ├── index.css
│   ├── config/
│   │   ├── firebase.ts         # Firebase 초기화
│   │   └── supabase.ts         # Supabase 클라이언트
│   ├── types/
│   │   └── index.ts            # 모든 타입 정의
│   ├── hooks/
│   │   ├── useAuth.ts          # 인증 훅
│   │   ├── useStudents.ts
│   │   └── useProblems.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppLayout.tsx   # 사이드바(PC) + 하단탭(모바일) 레이아웃
│   │   │   ├── Header.tsx
│   │   │   └── Loading.tsx
│   │   ├── owner/
│   │   ├── student/
│   │   └── parent/
│   ├── pages/
│   │   ├── OwnerPage.tsx
│   │   ├── StudentPage.tsx
│   │   └── ParentPage.tsx
│   ├── services/
│   │   ├── ai.ts               # AI 문제 생성 + RAG 검색
│   │   ├── ocr.ts              # 손글씨 인식
│   │   └── analytics.ts        # 약점 분석 로직
│   └── utils/
│       ├── formatDate.ts
│       └── calculateScore.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql
│   └── functions/
│       └── generate-problem/
│           └── index.ts        # Claude API 호출 Edge Function
├── scripts/
│   ├── import-aihub.ts         # AIHub JSON → Supabase 임포트
│   └── generate-embeddings.ts  # 문제 벡터화
├── .env                        # 비밀키 (커밋 금지)
├── .env.example                # 환경변수 목록
├── CLAUDE.md                   # 이 파일
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 환경변수 (.env)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=              # 임베딩용 (서버사이드만)
ANTHROPIC_API_KEY=           # Claude API (Pages Functions에서만)
```

## Supabase 데이터베이스 스키마

### academies
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 학원 고유번호 |
| name | TEXT | 학원 이름 |
| owner_id | TEXT | Firebase UID |
| created_at | TIMESTAMPTZ | 생성일 |

### students
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 학생 고유번호 |
| name | TEXT | 이름 |
| grade | TEXT | 학년 (예: '중2') |
| phone | TEXT | 연락처 |
| parent_phone | TEXT | 학부모 연락처 |
| pin | TEXT | 4자리 출결 PIN |
| class_id | UUID FK | 소속 반 |
| academy_id | UUID FK | 소속 학원 |
| created_at | TIMESTAMPTZ | 등록일 |

### classes
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| name | TEXT | 반 이름 |
| grade | TEXT | 대상 학년 |
| schedule | JSONB | 요일/시간 |
| capacity | INT | 정원 |
| academy_id | UUID FK | |

### attendance
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| student_id | UUID FK | |
| check_in | TIMESTAMPTZ | 입실 시간 |
| check_out | TIMESTAMPTZ | 퇴실 시간 |
| date | DATE | 날짜 |

### problem_embeddings (AIHub 원본 문제 + 벡터)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| content | TEXT | 문제 내용 |
| answer | TEXT | 정답 |
| solution | TEXT | 풀이과정 |
| grade | TEXT | 학년 |
| topic | TEXT | 단원 |
| difficulty | TEXT | 난이도 (easy/medium/hard) |
| source | TEXT | 출처 (aihub/manual) |
| embedding | VECTOR(768) | 벡터 임베딩 (Gemini text-embedding-004) |

### generated_problems (AI가 생성한 문제)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| content | TEXT | 문제 내용 |
| answer | TEXT | 정답 |
| solution | TEXT | 풀이과정 |
| grade | TEXT | 학년 |
| topic | TEXT | 단원 |
| difficulty | TEXT | 난이도 |
| choices | JSONB | 보기 4개 배열 |
| source_refs | BIGINT[] | 참고한 원본 문제 ID 배열 |
| similarity_score | FLOAT | 원본과 유사도 (낮을수록 안전) |
| created_at | TIMESTAMPTZ | |

### solve_logs (학생 풀이 기록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| student_id | UUID FK | |
| problem_id | UUID FK | |
| answer | TEXT | 학생 답안 |
| is_correct | BOOLEAN | 정오답 |
| solved_at | TIMESTAMPTZ | 풀이 시각 |

### notifications
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| student_id | UUID FK | 대상 학생 |
| parent_id | TEXT | 학부모 Firebase UID |
| type | TEXT | attendance/grade/weakness |
| message | TEXT | 알림 내용 |
| is_read | BOOLEAN | 읽음 여부 |
| created_at | TIMESTAMPTZ | |

### pgvector 검색 함수
```sql
CREATE FUNCTION search_similar_problems(
  query_embedding VECTOR(768),
  match_grade TEXT,
  match_topic TEXT,
  match_count INT DEFAULT 5
) RETURNS TABLE (id BIGINT, content TEXT, answer TEXT, solution TEXT, similarity FLOAT)
AS $$
  SELECT id, content, answer, solution,
         1 - (embedding <=> query_embedding) AS similarity
  FROM problem_embeddings
  WHERE grade = match_grade AND topic = match_topic
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

## TypeScript 타입 정의 (src/types/index.ts)

```typescript
export type UserRole = 'owner' | 'student' | 'parent';

export interface Academy {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

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

export interface Class {
  id: string;
  name: string;
  grade: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  capacity: number;
  academyId: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  checkIn: Date;
  checkOut?: Date;
  date: string;
}

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

export interface SolveLog {
  id: string;
  studentId: string;
  problemId: string;
  answer: string;
  isCorrect: boolean;
  solvedAt: Date;
}

export interface Notification {
  id: string;
  studentId: string;
  parentId: string;
  type: 'attendance' | 'grade' | 'weakness';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface WeaknessReport {
  topic: string;
  accuracy: number;
  totalProblems: number;
  correctCount: number;
  recommendation: string;
}
```

## 반응형 디자인 규칙

- **PC (769px 이상)**: 왼쪽 사이드바 240px + 2컬럼 그리드 콘텐츠
- **모바일 (768px 이하)**: 하단 탭바 + 1컬럼 세로 배치
- 역할별 테마 색상:
  - 원장: blue-600 계열
  - 학생: indigo-600 계열
  - 학부모: purple-600 계열
- Tailwind CSS만 사용 (인라인 스타일, CSS 모듈 사용 금지)
- 모든 화면 모바일 우선 설계

## AI 문제 생성 로직 (RAG 방식)

```
학생/원장이 문제 요청
  ↓
1. 요청 조건 (학년, 단원, 난이도) 확인
  ↓
2. Supabase pgvector에서 비슷한 문제 5개 검색
   (search_similar_problems 함수 호출)
  ↓
3. Supabase Edge Function 호출
   → 참고 문제 5개 + 조건을 Claude API에 전달
   → 프롬프트: "아래 참고 문제를 바탕으로 새로운 문제를 만들어라.
      반드시 참고 문제와 다른 새 문제여야 한다.
      보기 4개, 정답, 풀이과정 포함. JSON 형식으로."
  ↓
4. 생성된 문제를 generated_problems 테이블에 저장
  ↓
5. 학생에게 표시
```

## 코딩 규칙

1. **한국어 주석**: 모든 함수/컴포넌트에 한국어 주석 달기
2. **에러 처리**: try-catch로 감싸고 사용자에게 친절한 한국어 에러 메시지 표시
3. **로딩 상태**: 모든 비동기 작업에 로딩 스피너 표시
4. **타입 안전**: any 타입 사용 금지. 모든 변수에 명시적 타입 지정
5. **컴포넌트 크기**: 한 파일 200줄 이하. 넘으면 분리
6. **네이밍**: 컴포넌트는 PascalCase, 함수/변수는 camelCase, 상수는 UPPER_SNAKE_CASE
7. **Tailwind**: 스타일은 반드시 Tailwind 유틸리티 클래스 사용
8. **환경변수**: 비밀키는 절대 코드에 직접 쓰지 않고 .env에서 읽기
9. **Supabase RLS**: 모든 테이블에 Row Level Security 활성화 (자기 학원 데이터만 접근)

## 수학 교과 단원 체계 (문제 분류용)

### 중학교
- 중1: 자연수와 정수, 유리수, 일차방정식, 좌표와 그래프, 비례와 반비례, 기본 도형, 작도와 합동, 통계
- 중2: 유리수와 순환소수, 식의 계산, 일차부등식, 연립방정식, 일차함수, 삼각형과 사각형, 확률
- 중3: 제곱근과 실수, 다항식의 곱셈과 인수분해, 이차방정식, 이차함수, 삼각비, 원, 통계

### 고등학교
- 수학(상): 다항식, 방정식과 부등식, 도형의 방정식
- 수학(하): 집합과 명제, 함수와 그래프, 경우의 수
- 수학I: 지수와 로그, 삼각함수, 수열
- 수학II: 함수의 극한과 연속, 미분, 적분

## AIHub 데이터 출처 표기 (필수)

앱 설정 또는 정보 페이지에 반드시 포함:
"본 서비스는 한국지능정보사회진흥원(NIA)의 AI 학습용 데이터를 활용하여 개발되었습니다."

## 현재 개발 단계

Phase 1 시작 전. 이 CLAUDE.md를 읽고 프로젝트 구조를 이해한 뒤, 사용자의 지시에 따라 순서대로 개발을 진행하라.

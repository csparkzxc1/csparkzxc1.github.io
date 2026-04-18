# IMPLEMENTATION_PLAN.md — 냠냠쿨쿨 Phase 1 MVP 태스크

> **목적**: Claude Code가 한 세션에 정확히 하나의 태스크를 완수하도록, 파일·의존성·완료 조건을 명시합니다.
> **전제**: `CLAUDE.md` 먼저 읽기. 태스크 시작 시 `git checkout -b feat/{태스크ID}` 후 작업.

---

## 태스크 아나토미 (모든 태스크가 따르는 양식)

```
### T### — 태스크 제목                          [예상 N시간] [의존: T###]

**목표**: 한 줄 요약
**생성/수정 파일**:
  - path/to/file.ts (new)
  - path/to/other.ts (modify)
**참조 문서**: 관련 섹션
**구현 요점**:
  - …
**수락 조건 (Done 정의)**:
  1. `npm run ...` 통과
  2. 수동 검증: …
**커밋 메시지 예**: `feat(home): …`
```

---

## 스프린트 개요

| 스프린트 | 목표 | 태스크 수 | 예상 시간 | 누적 |
|---|---|---|---|---|
| **S0** | 프로젝트 셋업 | 3 | 8h | 8h |
| **S1** | 코어 인프라 (Supabase, 스토어) | 5 | 14h | 22h |
| **S2** | 인증 & 온보딩 5단계 | 5 | 16h | 38h |
| **S3** | 홈 화면 MVP | 6 | 20h | 58h |
| **S4** | 예측 엔진 포팅 | 3 | 10h | 68h |
| **S5** | 기록 로깅 전체 | 4 | 12h | 80h |
| **S6** | 알림 시스템 | 4 | 14h | 94h |
| **S7** | 기록 뷰 & 가이드 | 4 | 12h | 106h |
| **S8** | 가족 공유 | 3 | 10h | 116h |
| **S9** | 마무리 · 이상감지 · 출시 | 3 | 12h | 128h |
| **합계** | **40 태스크** | | **~128시간** | |

단일 개발자 풀타임 기준 약 8주 (MVP 3개월 여유 있음).

---

# 🟡 Sprint 0 — 프로젝트 셋업

### T001 — Expo 프로젝트 초기화                          [3h] [의존: 없음]

**목표**: TypeScript + Expo Router 기반 모노레포 구조 생성

**생성 파일**:
- `package.json`, `tsconfig.json`, `app.json`, `babel.config.js`
- `.gitignore`, `.env.example`
- `app/_layout.tsx`, `app/index.tsx`
- `README.md`

**구현 요점**:
```bash
npx create-expo-app@latest nyamnyam-coolcool --template blank-typescript
cd nyamnyam-coolcool
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```
- `app.json`의 `scheme`은 `"nyamnyam"`로 설정 (딥링크)
- `tsconfig.json`에 `paths: { "@/*": ["./src/*"] }` 추가
- `app/index.tsx`는 임시로 "Hello" 렌더만

**수락 조건**:
1. `npm run typecheck` 통과
2. `npx expo start` 실행 → iOS 시뮬레이터에서 "Hello" 화면 표시
3. `@/` 경로 alias 테스트 import 성공

**커밋**: `chore(setup): initialize Expo + TypeScript project`

---

### T002 — NativeWind, 폰트, 테마 토큰 셋업              [3h] [의존: T001]

**목표**: 디자인 시스템 인프라 구축

**생성/수정 파일**:
- `tailwind.config.js` (new)
- `global.css` (new)
- `src/lib/theme.ts` (new)
- `assets/fonts/Pretendard-Variable.ttf` (다운로드)
- `assets/fonts/Fraunces-Variable.ttf` (다운로드)
- `app/_layout.tsx` (폰트 로드 로직 추가)
- `babel.config.js` (NativeWind 플러그인)

**구현 요점**:
```bash
npm install nativewind@^4
npm install --dev tailwindcss@^3.4
npx expo install expo-font
```
- `tailwind.config.js`의 `theme.extend`에 **프로토타입의 CSS 변수 그대로 이식**:
  - colors: `ink-primary`, `ink-secondary`, `bg-surface`, `accent-sienna`, `accent-plum` 등
  - fontFamily: `display: ['Fraunces', 'Pretendard', 'serif']`, `body: ['Pretendard']`
  - boxShadow: `soft`, `card`, `phone`
- dark mode: `class` 방식
- `src/lib/theme.ts`에 타입 안전한 컬러 객체 export (프로그래밍 참조용)

**참조**: `nyamnyam_coolcool_prototype.html` L11-L75의 `:root` CSS 변수

**수락 조건**:
1. 테스트 컴포넌트에 `className="font-display text-3xl text-ink-primary"` 적용 시 Fraunces 폰트 렌더
2. 다크모드 토글 시 색상 반전 작동
3. `npm run typecheck` 통과

**커밋**: `feat(design): setup NativeWind + Fraunces/Pretendard fonts`

---

### T003 — 린트·포매터·Husky 훅 설정                    [2h] [의존: T001]

**목표**: 코드 품질 자동화 및 커밋 훅

**생성 파일**:
- `.eslintrc.js`, `.prettierrc`, `.prettierignore`
- `.husky/pre-commit` (lint-staged 실행)
- `package.json` scripts 추가

**구현 요점**:
```bash
npm install --dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import prettier husky lint-staged
npx husky init
```
- ESLint 규칙: `CLAUDE.md §5` 반영 (`no-any`, `import/order`, `react-hooks/exhaustive-deps`)
- `package.json`에 scripts: `lint`, `lint:fix`, `format`, `typecheck`, `test`

**수락 조건**:
1. `npm run lint` 경고 없이 통과
2. 일부러 `any` 타입 삽입 → lint 에러로 검출
3. Git 커밋 시 pre-commit 훅이 자동으로 lint-staged 실행

**커밋**: `chore(lint): setup ESLint + Prettier + Husky`

---

# 🟡 Sprint 1 — 코어 인프라

### T101 — Supabase 프로젝트 생성 + 환경변수             [2h] [의존: T001]

**목표**: Supabase 로컬·프로덕션 환경 연결

**생성 파일**:
- `supabase/config.toml` (supabase init 결과)
- `.env.local` (local, gitignore)
- `.env.example` (커밋)
- `src/lib/supabase.ts` (new)

**구현 요점**:
```bash
npx supabase init
npx supabase start   # 로컬 Postgres + Auth + Studio 기동 (Docker 필요)
```
- Supabase 대시보드에서 새 프로젝트 생성 (명: `nyamnyam-coolcool-prod`)
- 환경변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

**수락 조건**:
1. `npx supabase status` 로컬 서비스 실행 확인
2. 앱에서 `supabase.auth.getSession()` 호출 → 에러 없이 null 반환
3. `.env.example`은 커밋, `.env.local`은 gitignore

**커밋**: `feat(infra): connect Supabase client`

---

### T102 — DB 스키마 마이그레이션                       [3h] [의존: T101]

**목표**: 4개 핵심 테이블 생성

**생성 파일**:
- `supabase/migrations/20260418000000_init.sql`
- `src/lib/database.types.ts` (자동 생성)

**구현 요점**:

```sql
-- babies
create table public.babies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date not null,
  gender char(1) check (gender in ('M','F')),
  weight_kg numeric(4,2),
  feeding_type text not null check (feeding_type in ('breast','formula','mixed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- caregivers (가족 공유용 조인 테이블)
create table public.caregivers (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('parent','grandparent','caregiver')),
  permissions text[] not null default array['read','write'],
  created_at timestamptz default now(),
  unique (baby_id, user_id)
);

-- feeding_records
create table public.feeding_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  type text not null check (type in ('breast_left','breast_right','formula','solid')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  amount_ml numeric(5,1),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- sleep_records
create table public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  type text not null check (type in ('nap','night')),
  start_at timestamptz not null,
  end_at timestamptz,  -- null = 진행 중
  quality smallint check (quality between 1 and 5),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- diaper_records
create table public.diaper_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  type text not null check (type in ('wet','dirty','both')),
  color text,
  at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- 조회 성능 인덱스
create index idx_feeding_baby_start on public.feeding_records(baby_id, start_at desc);
create index idx_sleep_baby_start on public.sleep_records(baby_id, start_at desc);
create index idx_diaper_baby_at on public.diaper_records(baby_id, at desc);
create index idx_caregivers_user on public.caregivers(user_id);
```

**수락 조건**:
1. `npx supabase db reset` 에러 없이 성공
2. `npx supabase gen types typescript --local > src/lib/database.types.ts` 실행 후 타입 파일 생성
3. Supabase Studio에서 4개 테이블 + 1개 조인 테이블 확인

**커밋**: `feat(db): initial schema migration`

---

### T103 — Row Level Security 정책                     [3h] [의존: T102]

**목표**: 아기 데이터를 오직 등록된 보호자만 접근 가능하게

**생성 파일**:
- `supabase/migrations/20260418000100_rls.sql`

**구현 요점**:

```sql
-- 모든 테이블에 RLS 활성화
alter table public.babies enable row level security;
alter table public.caregivers enable row level security;
alter table public.feeding_records enable row level security;
alter table public.sleep_records enable row level security;
alter table public.diaper_records enable row level security;

-- 보호자 판정 함수
create or replace function public.is_caregiver(_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.caregivers
    where baby_id = _baby_id and user_id = auth.uid()
  );
$$;

-- babies 정책
create policy "보호자만 조회" on public.babies
  for select using (public.is_caregiver(id));

create policy "본인이 생성자일 때만 수정" on public.babies
  for update using (created_by = auth.uid());

create policy "인증 유저만 아기 생성" on public.babies
  for insert with check (created_by = auth.uid());

-- 기록 테이블 (패턴 동일)
create policy "보호자만 기록 조회" on public.feeding_records
  for select using (public.is_caregiver(baby_id));

create policy "보호자만 기록 생성" on public.feeding_records
  for insert with check (public.is_caregiver(baby_id));

create policy "본인 생성 기록만 수정/삭제" on public.feeding_records
  for update using (created_by = auth.uid());

create policy "본인 생성 기록만 삭제" on public.feeding_records
  for delete using (created_by = auth.uid());

-- sleep_records, diaper_records도 동일 패턴 (복붙)
-- …
```

**수락 조건**:
1. 타 유저 A가 유저 B의 아기 id로 SELECT 시도 → 0 rows 반환
2. 비인증 상태에서 insert 시도 → RLS 에러
3. 본인이 caregiver인 baby_id로 정상 CRUD

**테스트 방법**: Supabase Studio의 SQL Editor에서 `set role authenticated; set request.jwt.claim.sub = '<user-uuid>';` 후 쿼리

**커밋**: `feat(db): row level security policies`

---

### T104 — supabase-js 쿼리 래퍼 (features/*/api.ts)  [3h] [의존: T102]

**목표**: 컴포넌트에서 직접 Supabase 호출 금지. 도메인별 api 레이어 구축

**생성 파일**:
- `src/features/prediction/api.ts` (조회)
- `src/features/logging/api.ts` (CRUD)
- `src/features/auth/api.ts` (로그인/회원가입)

**구현 요점**:
```typescript
// src/features/logging/api.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type FeedingInsert = Database['public']['Tables']['feeding_records']['Insert'];

export async function createFeedingRecord(input: FeedingInsert) {
  const { data, error } = await supabase
    .from('feeding_records')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listRecentFeedings(babyId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from('feeding_records')
    .select('*')
    .eq('baby_id', babyId)
    .gte('start_at', since)
    .order('start_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

**수락 조건**:
1. 각 api 함수에 단위 테스트 작성 (mock supabase client 사용)
2. `npm test -- api` 통과
3. 각 함수 JSDoc 주석 필수

**커밋**: `feat(api): domain API wrappers over Supabase`

---

### T105 — Zustand 세션 스토어 + TanStack Query 셋업    [3h] [의존: T101]

**목표**: 전역 상태 인프라 완성

**생성 파일**:
- `src/stores/sessionStore.ts`
- `src/lib/queryClient.ts`
- `app/_layout.tsx` (Provider 래핑)

**구현 요점**:
```bash
npm install zustand @tanstack/react-query @react-native-async-storage/async-storage
```

```typescript
// src/stores/sessionStore.ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface SessionState {
  session: Session | null;
  currentBabyId: string | null;
  setSession: (s: Session | null) => void;
  setCurrentBabyId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  currentBabyId: null,
  setSession: (session) => set({ session }),
  setCurrentBabyId: (currentBabyId) => set({ currentBabyId }),
}));
```

- `_layout.tsx`에서 `supabase.auth.onAuthStateChange`로 세션 동기화
- QueryClientProvider 래핑
- `staleTime: 30_000`, `retry: 2` 기본값

**수락 조건**:
1. 로그인/로그아웃 시 `useSessionStore.getState().session` 자동 갱신
2. TanStack Query devtools가 dev 모드에서 작동
3. 앱 재시작 시 세션 자동 복원

**커밋**: `feat(state): session store + react-query provider`

---

# 🟡 Sprint 2 — 인증 & 온보딩

### T201 — Supabase Auth (이메일 + 카카오 OAuth)          [4h] [의존: T105]

**생성/수정 파일**:
- `src/features/auth/api.ts` (확장)
- `supabase/config.toml` (OAuth provider)
- `app.json` (scheme for redirect)

**구현 요점**:
- Supabase 대시보드 → Auth → Providers → Kakao 활성화 (client ID, secret 설정)
- Redirect URL: `nyamnyam://auth/callback`
- 이메일 확인 비활성화 (MVP 편의)
- 카카오 로그인 플로우: `supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } })`

**수락 조건**:
1. 이메일/비번으로 회원가입 → 로그인 가능
2. 카카오 로그인 완료 후 앱으로 리다이렉트 → 세션 저장
3. 로그아웃 시 세션 제거

**커밋**: `feat(auth): email + Kakao OAuth`

---

### T202 — 로그인 / 회원가입 화면                        [3h] [의존: T201, T002]

**생성 파일**:
- `app/auth/login.tsx`
- `app/auth/signup.tsx`
- `src/components/auth/AuthForm.tsx`

**구현 요점**:
- react-hook-form + zod 스키마 검증
- 카카오 버튼 강조 (노란색), 이메일은 보조
- 에러 메시지 한국어
- 프로토타입의 미색 배경·Fraunces 헤드라인 톤 유지

**수락 조건**:
1. 빈 이메일 제출 → 인라인 에러 "이메일을 입력해 주세요"
2. 비밀번호 6자 미만 → 에러
3. 카카오 로그인 플로우 정상
4. 성공 시 `/onboarding/1`로 라우팅 (신규) 또는 `/home`으로 (기존)

**커밋**: `feat(auth): login + signup screens`

---

### T203 — 온보딩 Step 1~2 (환영 + 아이 정보)           [3h] [의존: T202]

**생성 파일**:
- `app/onboarding/_layout.tsx` (진행도 표시)
- `app/onboarding/[step].tsx` (동적 라우팅)
- `src/components/onboarding/WelcomeScreen.tsx`
- `src/components/onboarding/BabyInfoForm.tsx`

**구현 요점**:
- Step 1: 풀스크린 히어로 일러스트 + "시작하기" 버튼 (스킵 불가)
- Step 2: 이름(필수·기본값 "우리아기"), 생년월일(필수), 성별(선택), 체중(선택)
- 생년월일 선택 시 실시간 "생후 N일 · N개월" 계산 표시
- 폼 검증: 생년월일이 미래면 에러
- 완료 시 `babies` 테이블 insert + `caregivers`에 본인을 'parent'로 추가

**참조**: 스펙 문서 §4 (온보딩 5단계)

**수락 조건**:
1. Step 2 진행 시 DB에 baby + caregiver 레코드 생성
2. 뒤로가기 제스처로 Step 1로 복귀 가능
3. 폼 검증 에러 인라인 표시

**커밋**: `feat(onboarding): steps 1-2 welcome and baby info`

---

### T204 — 온보딩 Step 3~4 (수유 방식 + 알림)           [3h] [의존: T203]

**생성 파일**:
- `src/components/onboarding/FeedingTypeSelect.tsx`
- `src/components/onboarding/InitialStateForm.tsx`
- `src/components/onboarding/NotificationSetup.tsx`

**구현 요점**:
- Step 3: 수유 방식 (모유/분유/혼합/이유식) 큰 버튼 카드. "마지막 수유 언제였나요?" 빠른 옵션 (방금/30분전/1시간전/직접입력/모름)
- Step 4: 알림 토글 (수유·수면 ON, 방해금지 22-06), 톤 선택(부드러운 차임/무음/진동)
- **iOS/Android 알림 권한 요청은 Step 4 마지막에만** (거부 시 재요청 어려움 경고)

**수락 조건**:
1. "방금 수유함" 선택 시 빈 feeding_records 임시 레코드(?) 생성 — 또는 sessionStore에 저장
2. 알림 권한 거부 시 이후 앱 전체에서 알림 기능 비활성화 + 설정에서 재요청 UI 표시
3. 선택값은 Zustand에 일시 저장, Step 5 완료 시 babies에 업데이트

**커밋**: `feat(onboarding): steps 3-4 feeding type and notifications`

---

### T205 — 온보딩 Step 5 (가족 공유) + 완료           [3h] [의존: T204]

**생성 파일**:
- `src/components/onboarding/FamilyShareStep.tsx`
- `src/features/sharing/api.ts` (초대 링크 생성)

**구현 요점**:
- Step 5: "남편·가족도 함께 기록하면 교대 수유가 쉬워져요" 문구
- 3가지 옵션: 카카오톡 초대(Share API) / 링크 복사 / 나중에
- 초대는 Supabase에서 초대 토큰 생성 → 딥링크 `nyamnyam://invite/<token>`
- 최종 CTA "냠냠쿨쿨 시작하기" → `/home`으로 라우팅

**수락 조건**:
1. 링크 복사 시 클립보드에 `https://nyamnyam.app/invite/<token>` 저장
2. 카카오톡 공유 시트 정상 호출 (React Native Share API)
3. "나중에" 선택 시에도 정상 진행
4. Step 5 완료 시 `onboarding_completed_at` 타임스탬프 DB에 기록

**커밋**: `feat(onboarding): step 5 family sharing and completion`

---

# 🟡 Sprint 3 — 홈 화면 MVP

### T301 — NextActionCard 컴포넌트 (4개 상태)            [4h] [의존: T002]

**목표**: 프로토타입의 히어로 카드를 RN으로 이식

**생성 파일**:
- `src/components/home/NextActionCard.tsx`
- `src/components/home/NextActionCard.test.tsx`

**구현 요점**:
- Props: `{ scenario: 'normal' | 'warning' | 'alert' | 'sleeping'; predictedAt: Date; lastAction?: {...}; reasoning?: {...} }`
- 4개 시나리오별 gradient는 `expo-linear-gradient` 사용
- 180pt 높이, 20pt 라운드, 미묘한 그레인 텍스처
- 길게 누르기 → `showModal` 콜백 호출 ("왜 이렇게 예측했나요?")
- 애니메이션: 터치 시 scale 0.98 (react-native-reanimated)

**참조**: `nyamnyam_coolcool_prototype.html` L256-L317의 `.hero-card` 스타일

**수락 조건**:
1. 4개 시나리오 각각 스토리북 대신 dev 화면(`app/dev/cards.tsx`)에서 시각 확인
2. 컴포넌트 테스트: 시나리오별 올바른 배지 텍스트 렌더 검증
3. 다크모드에서도 가독성 유지

**커밋**: `feat(home): NextActionCard component`

---

### T302 — QuickLogButton + 2x2 그리드                 [3h] [의존: T002]

**생성 파일**:
- `src/components/home/QuickLogButton.tsx`
- `src/components/home/QuickLogGrid.tsx`
- `src/stores/loggingStore.ts` (진행 중 타이머)

**구현 요점**:
- Props: `{ kind: 'feed' | 'sleep' | 'diaper' | 'bath'; lastAt?: Date; onTap: () => void; onLongPress: () => void; isActive: boolean }`
- 88x88pt 최소. 진행 중 상태 → 2pt 펄스 테두리 + 타이머 표시
- kind별 아이콘 배경 색상 (feed=파랑, sleep=보라, diaper=노랑, bath=청록) — tailwind color tokens 사용
- Zustand 스토어에 `activeTimer: { kind, startedAt } | null`

**수락 조건**:
1. 탭 → 활성화 → 1초마다 `00:00` 포맷 카운터 업데이트
2. 다시 탭 → 종료 → Supabase insert + 비활성화
3. 동시에 2개 활성화 불가 (진행 중 활성화하면 기존 종료)
4. 앱 재시작해도 진행 중 타이머 복원 (AsyncStorage)

**커밋**: `feat(home): quick log buttons with timer`

---

### T303 — BabyProfileHeader + 프로필 편집 모달           [2h] [의존: T101]

**생성 파일**:
- `src/components/home/BabyProfileHeader.tsx`
- `src/components/shared/BabyEditModal.tsx`
- `src/hooks/useBaby.ts`

**구현 요점**:
- 아바타(44pt 원형, 이니셜 또는 업로드 사진)
- 이름 + "생후 N일 · N개월 N일" 자동 계산 (date-fns)
- 우측 가족 배지 (연결된 보호자 수)
- 탭 → 편집 모달 (이름·생일·성별·체중 수정)

**수락 조건**:
1. date-fns `differenceInDays`, `differenceInMonths` 정확 반영
2. 편집 후 즉시 홈 화면 반영 (TanStack Query invalidate)
3. 가족 배지 실시간 동기화

**커밋**: `feat(home): baby profile header`

---

### T304 — TodayTimeline 24시간 뷰                     [3h] [의존: T101]

**생성 파일**:
- `src/components/home/Timeline.tsx`
- `src/hooks/useTodayEvents.ts`

**구현 요점**:
- 가로 스트립, 06시~22시 기본. 핀치로 24시간/7일 확대
- 이벤트 도트 색상: feed=파랑, sleep=보라, diaper=노랑
- "NOW" 수직 라인 표시 (현재 시각)
- 도트 탭 → 상세 바텀시트
- react-native-gesture-handler 사용

**수락 조건**:
1. Supabase에서 오늘 전체 이벤트 조회 후 정확한 위치에 도트 렌더
2. 시간 레이블 (06/09/12/15/18/21) 정확
3. NOW 라인 1분마다 업데이트

**커밋**: `feat(home): today timeline visualization`

---

### T305 — TipCard (격려·교육 메시지 랜덤)              [2h] [의존: T002]

**생성 파일**:
- `src/components/home/TipCard.tsx`
- `src/constants/tips.ts` (하루 1~2개 노출할 메시지 풀)

**구현 요점**:
- 하루 중 한 번만 갱신 (AsyncStorage에 `last_tip_shown_date`)
- 메시지 풀 50+개 (스펙 §6.1 참조해 초안)
- 산후우울 키워드 감지 시 1577-0199 안내로 교체
- 톤: "오늘의 응원" 섹션 타이틀, 왼쪽 sage 색 보더

**수락 조건**:
1. 하루 지나면 새 메시지로 교체
2. 닫기(X) 버튼 → 24시간 숨김
3. 사용자가 과거 기록에서 부정적 감정 키워드 입력 시 helpline 카드 우선 표시

**커밋**: `feat(home): daily tip card with rotation`

---

### T306 — BottomTabBar + 홈 화면 통합                  [3h] [의존: T301~T305]

**생성/수정 파일**:
- `app/(tabs)/_layout.tsx` (Expo Router 탭)
- `app/(tabs)/home.tsx` (모든 컴포넌트 조립)
- 빈 화면: `records.tsx`, `guide.tsx`, `share.tsx`, `settings.tsx`

**구현 요점**:
- 5개 탭: 홈 / 기록 / 가이드 / 공유 / 설정
- 활성 탭은 accent-sienna 색
- 아이콘: lucide-react-native
- 홈 화면에서 스크롤 시 탭바는 고정

**수락 조건**:
1. 탭 전환 시 각 화면 렌더 (빈 화면은 "준비 중" 표시도 OK)
2. 홈 화면에 모든 컴포넌트 조립: 헤더 → 히어로 → 2x2 버튼 → 타임라인 → 팁
3. 상단 safe area 적용 (noch 대응)
4. 스크롤 성능 60fps 유지 (FlatList 필요 시 사용)

**커밋**: `feat(home): assemble home screen with bottom tabs`

---

# 🟡 Sprint 4 — 예측 엔진 포팅

### T401 — prediction_engine.ts를 src/features/prediction으로 이식  [3h] [의존: T001]

**생성 파일**:
- `src/features/prediction/engine.ts`
- `src/features/prediction/standards.ts`
- `src/features/prediction/anomalies.ts`
- `src/features/prediction/types.ts`
- `src/features/prediction/__tests__/engine.test.ts`

**구현 요점**:
- 기존 `prediction_engine.ts` 파일을 기반으로 모듈 분리
- `predictNextFeeding`, `predictNextSleep`, `detectAnomalies`를 각 파일로 분리
- Supabase row 타입(`Database['public']['Tables']['feeding_records']['Row']`)과 호환되도록 `FeedingRecord` 타입 어댑터 작성
- 프로토타입에 쓰인 데모 데이터를 기준으로 **Jest 테스트 최소 15개** 작성

**테스트 케이스 필수**:
- 0~1개월 + 4시간 경과 → RED
- 데이터 없음 → LOW confidence + 기본값
- 개인 평균 > 표준 × 1.5 (신생아) → FEEDING_TOO_SPARSE
- 1일 분유 1000ml 초과 → OVERFEEDING_RISK
- 소변 기저귀 <6회 / 24h → LOW_DIAPER_COUNT

**수락 조건**:
1. `npm test -- prediction` 15개 이상 통과, 커버리지 90%+
2. 타입체크 통과
3. 기존 `prediction_engine.ts`의 스모크 데모 출력과 동일 결과

**커밋**: `feat(prediction): port engine to src/features/prediction`

---

### T402 — Supabase 데이터 ↔ 엔진 연결 (usePrediction 훅)  [3h] [의존: T401, T104]

**생성 파일**:
- `src/hooks/usePrediction.ts`
- `src/features/prediction/selectors.ts`

**구현 요점**:
```typescript
export function usePrediction(babyId: string) {
  const { data: baby } = useBaby(babyId);
  const { data: feedings = [] } = useQuery({
    queryKey: ['feeding', babyId, '7d'],
    queryFn: () => listRecentFeedings(babyId, 7),
    staleTime: 10_000,
  });
  const { data: sleeps = [] } = useQuery({ /* ... */ });

  return useMemo(() => {
    if (!baby) return null;
    return {
      feeding: predictNextFeeding(baby, feedings, new Date()),
      sleep: predictNextSleep(baby, sleeps, new Date()),
    };
  }, [baby, feedings, sleeps]);
}
```

**수락 조건**:
1. 홈 화면 `NextActionCard`에 `usePrediction` 연결 → 실제 데이터 기반 예측 카드
2. 새 수유 기록 추가 시 1초 이내 예측 자동 갱신 (invalidateQueries)
3. 로딩·에러 상태 UI 분리

**커밋**: `feat(prediction): connect engine to live data`

---

### T403 — 실시간 예측 갱신 + 분 단위 카운트다운          [2h] [의존: T402]

**구현 요점**:
- NextActionCard가 1분마다 자동으로 "N분 후" 텍스트 갱신
- `setInterval` 대신 `useEffect` + `requestAnimationFrame` 패턴 (배터리 친화)
- 앱 백그라운드→포그라운드 시 즉시 재계산 (AppState 리스너)

**수락 조건**:
1. 60초 대기 후 "35분 후" → "34분 후" 자동 갱신 확인
2. 홈 탭 벗어났다 돌아올 때 즉시 최신 시각으로 갱신
3. 성능: 1시간 켜놔도 메모리 누수 없음

**커밋**: `feat(prediction): real-time countdown refresh`

---

# 🟡 Sprint 5 — 기록 로깅 전체

### T501 — 수유 기록 시작/종료 + 상세 입력                [3h] [의존: T302, T104]

**생성 파일**:
- `src/features/logging/feedingHooks.ts`
- `src/components/logging/FeedingDetailSheet.tsx`

**구현 요점**:
- 짧게 탭: 즉시 시작 타이머 (분유 기본 120ml)
- 길게 누름: 바텀시트 오픈 → 종류(모유좌/모유우/분유/이유식), 수량 선택
- 종료 시 자동으로 수량·시간 저장
- Optimistic UI: UI는 즉시 갱신, Supabase 실패 시 롤백 + 토스트

**수락 조건**:
1. 15초짜리 수유 기록 정상 생성
2. 상세 입력 바텀시트에서 130ml 선택 시 올바르게 저장
3. 오프라인 상태에서 큐잉(AsyncStorage) 후 재연결 시 동기화

**커밋**: `feat(logging): feeding start/end + detail input`

---

### T502 — 수면 기록 로직                                [3h] [의존: T501]

**생성 파일**:
- `src/features/logging/sleepHooks.ts`

**구현 요점**:
- 짧게 탭: 낮잠/밤잠 자동 판정 (시간대 기준, 18시 이후는 밤잠)
- 길게 누름: 수동 선택
- 진행 중 수면은 `end_at = null`로 저장, 종료 시 업데이트
- 낮잠 2시간 30분 초과 알림 훅 연결

**수락 조건**:
1. 진행 중 수면은 홈 카드에 "N분째 자는 중" 표시
2. 저녁 8시에 시작한 수면은 자동으로 'night' 타입
3. 150분 초과 시 알림 트리거 준비 (T603에서 실제 발송)

**커밋**: `feat(logging): sleep records with nap/night auto-detection`

---

### T503 — 기저귀·목욕 기록                             [2h] [의존: T501]

**구현 요점**:
- 기저귀는 즉시 기록 (소변/대변/둘다 선택 시트)
- 대변일 때 색상 선택 옵션 (황달 체크용)
- 목욕은 시작/종료 + 수온 기록(선택)

**수락 조건**:
1. 기저귀 탭 → 0.5초 내 시트 오픈
2. 대변 색상 7단계 차트 UI (노랑~녹색)
3. 목욕 기록 시 안전 체크리스트 툴팁 1회 노출

**커밋**: `feat(logging): diaper and bath records`

---

### T504 — 기록 수정 · 삭제                            [4h] [의존: T501~T503]

**생성 파일**:
- `app/records/[id].tsx` (상세 편집)
- `src/components/records/RecordCard.tsx`

**구현 요점**:
- 타임라인의 도트 탭 → 상세 편집 화면
- 수정: 시간·수량·메모
- 삭제: 길게 누르기 → 확인 다이얼로그 → 소프트 삭제(?) 또는 하드 삭제 (MVP는 하드)
- 가족 공유 시 타인이 기록한 것은 읽기 전용, 본인 기록만 편집

**수락 조건**:
1. 기록 삭제 시 즉시 타임라인 반영
2. 타인 기록 편집 시도 → RLS 에러 메시지 "본인 기록만 수정 가능"
3. 수정 후 예측 카드도 재계산

**커밋**: `feat(records): edit and delete with authorization`

---

# 🟡 Sprint 6 — 알림 시스템

### T601 — expo-notifications 권한 & 기본 셋업            [3h] [의존: T204]

**생성 파일**:
- `src/lib/notifications.ts`
- `app.json` (iOS/Android 설정)

**구현 요점**:
```bash
npx expo install expo-notifications expo-device
```
- iOS: `app.json` → `ios.infoPlist.UIBackgroundModes` 추가
- Android: 채널 설정 (normal, warning, critical)
- `Notifications.setNotificationHandler` — foreground도 배너 표시
- 권한 상태는 Zustand에 저장 (거부 시 UI에서 재요청 버튼 노출)

**수락 조건**:
1. 권한 요청 다이얼로그 1회만 노출 (이후는 앱 설정 유도)
2. 테스트 알림 전송 → 1초 내 수신
3. Android 채널 3개 OS 설정에서 확인

**커밋**: `feat(notifications): setup expo-notifications`

---

### T602 — 로컬 알림 스케줄링 (다음 수유·수면 예상)       [4h] [의존: T402, T601]

**생성 파일**:
- `src/features/notifications/scheduler.ts`

**구현 요점**:
- 예측이 바뀌면 **기존 스케줄 취소 → 새로 등록**
- 스케줄 대상:
  1. 수유 예상 10분 전 (일반 알림)
  2. 수면 예상 15분 전 (졸림 신호 안내)
  3. 0~1개월 4시간 경고 (critical)
- 최대 동시 3개만 유지

```typescript
export async function scheduleNextFeedingReminder(
  babyName: string,
  predictedAt: Date
) {
  await Notifications.cancelScheduledNotificationAsync('feed-reminder');
  const triggerAt = new Date(predictedAt.getTime() - 10 * 60_000);
  if (triggerAt <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'feed-reminder',
    content: {
      title: '🍼 곧 수유 시간이에요',
      body: `${babyName}이(가) 곧 배고파할 시간이에요`,
      sound: 'default',
    },
    trigger: triggerAt,
  });
}
```

**수락 조건**:
1. 수유 기록 추가 후 스케줄 재계산 → OS 예약 확인
2. 앱 종료 상태에서도 예약된 시각에 알림 발송
3. 예측이 바뀌면 기존 알림 취소되고 새로 등록

**커밋**: `feat(notifications): schedule predicted reminders`

---

### T603 — 경고 알림 (4시간 룰·낮잠 초과)                [3h] [의존: T602]

**구현 요점**:
- 0~1개월 아기 + 마지막 수유 후 4시간 임박 시 critical 알림 스케줄
- 낮잠 2.5시간 초과 시 informational 알림
- 1일 분유 1000ml 초과 시 OVERFEEDING_RISK 인앱 경고

**수락 조건**:
1. 신생아 더미 데이터로 4시간 룰 트리거 확인
2. critical 알림은 방해 금지 시간대에도 발송
3. 인앱 경고는 홈 화면 상단 배너로 표시

**커밋**: `feat(notifications): safety alerts for feeding/sleep anomalies`

---

### T604 — 방해 금지 모드 + 톤 설정 UI                   [4h] [의존: T601]

**생성 파일**:
- `app/(tabs)/settings.tsx`
- `src/components/settings/NotificationSettings.tsx`

**구현 요점**:
- 방해금지 시작/종료 시각 슬라이더 (기본 22:00~06:00)
- 톤 3종: 부드러운 차임 / 무음 / 진동만
- 테스트 알림 발송 버튼
- 카테고리별 ON/OFF (수유·수면·기저귀 각각)

**수락 조건**:
1. 방해금지 활성 시간에 critical 외 알림 suppress
2. 설정 변경 즉시 반영 (앱 재시작 불필요)
3. 설정값은 Supabase에 저장 (기기 변경 시 복원)

**커밋**: `feat(settings): notification preferences UI`

---

# 🟡 Sprint 7 — 기록 뷰 & 가이드

### T701 — 기록 탭: 일/주/월 뷰                          [4h] [의존: T502]

**생성 파일**:
- `app/(tabs)/records.tsx`
- `src/components/records/DayView.tsx`
- `src/components/records/WeekView.tsx`
- `src/components/records/MonthView.tsx`

**구현 요점**:
- 상단 세그먼트: 일/주/월 전환
- 일: 타임라인 세로 리스트 + 수유·수면 요약 상단 카드
- 주: 막대 차트 (하루별 총 수유량/수면시간)
- 월: 히트맵 (빈도)
- 차트 라이브러리: `victory-native` 또는 `react-native-svg`로 직접

**수락 조건**:
1. 세그먼트 전환 시 스무스 애니메이션
2. 주간 뷰에서 월/화/수/... 레이블 정확
3. 과거 날짜 선택 가능 (캘린더 뷰)

**커밋**: `feat(records): daily/weekly/monthly views`

---

### T702 — 가이드 탭: 월령별 표준 데이터                  [3h] [의존: T002]

**생성 파일**:
- `app/(tabs)/guide.tsx`
- `src/features/guide/standardsContent.ts`

**구현 요점**:
- 상단: 내 아기 월령 강조 표시
- 테이블: 수면·수유·이유식 표준 (스펙 §4 전체)
- "우리 아이 vs 평균" 비교 카드 (최근 7일 개인 데이터 vs 표준)
- 출처 각주 (보건복지부 아이사랑·AAP·AASM)

**수락 조건**:
1. 월령 변경 시 해당 행 하이라이트 이동
2. 비교 카드의 개인 데이터 실시간 반영
3. 스크롤 시 내 월령 행이 sticky

**커밋**: `feat(guide): age-based standards reference`

---

### T703 — 졸림 신호 가이드 콘텐츠                       [2h] [의존: T702]

**생성 파일**:
- `src/components/guide/SleepCueGuide.tsx`
- `src/components/guide/FAQSection.tsx`

**구현 요점**:
- 6가지 졸림 신호 (스펙 §4.4) 카드로 표시
- 일러스트(간단한 SVG) + 설명
- FAQ 10개 (흔한 초보맘 질문)

**수락 조건**:
1. 각 신호 카드 탭 → 상세 설명 펼침
2. FAQ는 아코디언 UI
3. 읽기 편한 라인 높이 (1.6)

**커밋**: `feat(guide): sleep cues and FAQ content`

---

### T704 — 성장곡선 차트 (키/몸무게 기록)                [3h] [의존: T702]

**생성 파일**:
- `src/components/growth/GrowthChart.tsx`
- `src/features/growth/whoStandards.ts` (WHO 성장표준)

**구현 요점**:
- 키/몸무게 기록 UI (가이드 탭 하단)
- WHO 성장표준(3/15/50/85/97 percentile) 배경으로 겹쳐 표시
- 내 아이 점을 강조

**수락 조건**:
1. 데이터 3개 이상 있으면 선 그래프
2. Percentile 배경이 과도하게 시각적 소음이 되지 않도록 연한 색상
3. 기록 추가/삭제 즉시 차트 갱신

**커밋**: `feat(guide): growth chart with WHO standards`

---

# 🟡 Sprint 8 — 가족 공유

### T801 — 초대 링크 생성 + Supabase invite 테이블        [3h] [의존: T205]

**생성 파일**:
- `supabase/migrations/20260418000200_invites.sql`
- `src/features/sharing/invites.ts`

**SQL**:
```sql
create table public.invites (
  token text primary key,
  baby_id uuid not null references public.babies(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  role text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz default now()
);
```

**수락 조건**:
1. 공유 탭에서 초대 링크 생성 → 7일 후 만료
2. 토큰은 URL-safe 16바이트 랜덤
3. 기존 미사용 토큰 있으면 재사용

**커밋**: `feat(sharing): invite token system`

---

### T802 — 초대 수락 + Realtime 동기화                   [4h] [의존: T801]

**구현 요점**:
- 딥링크 `nyamnyam://invite/<token>` → 초대 수락 화면
- 수락 시 `caregivers` 테이블에 추가
- Realtime 구독: `feeding_records`, `sleep_records`, `diaper_records` INSERT/UPDATE
- 가족이 기록하면 내 홈 화면도 실시간 반영

**수락 조건**:
1. 기기 A에서 기록 추가 → 기기 B에서 2초 내 표시
2. 초대 만료 토큰 수락 시 에러 메시지
3. Realtime 연결 끊김 시 재연결 로직

**커밋**: `feat(sharing): invite acceptance + realtime sync`

---

### T803 — 가족 권한 관리 UI                             [3h] [의존: T802]

**생성 파일**:
- `app/(tabs)/share.tsx`
- `src/components/sharing/CaregiverList.tsx`

**구현 요점**:
- 연결된 보호자 리스트 (역할·가입일)
- 관리자(parent)는 타인 제거 가능
- 신규 초대 링크 생성 버튼
- 내 권한 조회

**수락 조건**:
1. 본인은 제거 버튼 숨김
2. 제거 시 확인 다이얼로그
3. 제거된 보호자의 기록은 남지만 편집 불가

**커밋**: `feat(sharing): caregiver management UI`

---

# 🟡 Sprint 9 — 마무리

### T901 — detectAnomalies 전역 연동 + 인앱 경고 배너    [3h] [의존: T402]

**구현 요점**:
- 홈 화면 상단에 anomaly critical/warning 배너 표시
- 탭하면 상세 설명 + "소아과 상담" 안내
- 인박스(알림 히스토리)에도 저장

**수락 조건**:
1. 5가지 이상 감지 코드 각각 UI 확인
2. 배너는 dismiss 후 24시간 표시 안 함 (critical 제외)
3. 의학적 문구 톤 준수 (스펙 §4.2)

**커밋**: `feat(anomalies): in-app warning system`

---

### T902 — E2E 테스트 시나리오 (Maestro)                 [4h] [의존: 전체]

**생성 파일**:
- `__tests__/e2e/flows/onboarding.yaml`
- `__tests__/e2e/flows/first-feeding.yaml`
- `__tests__/e2e/flows/family-share.yaml`
- `__tests__/e2e/flows/notification-permission.yaml`
- `__tests__/e2e/flows/login-logout.yaml`

**수락 조건**:
1. 5개 시나리오 각각 통과
2. CI에서 실행되는 스크립트 (`npm run test:e2e`)

**커밋**: `test(e2e): core user flows`

---

### T903 — 앱스토어 제출 준비                           [5h] [의존: 전체]

**할 일**:
- 앱 아이콘 1024x1024 (로고 디자인 별도 필요)
- 스크린샷 5개 × 2언어 (국문/영문)
- 앱 설명 (국문/영문)
- 개인정보 처리방침 URL (법무 검토 필요)
- EAS Build production 빌드 & 제출

**수락 조건**:
1. iOS TestFlight에 업로드 성공
2. Google Play 내부 테스트 트랙 업로드 성공
3. 심사 제출 준비 완료 (수락은 별도)

**커밋**: `chore(release): prepare App Store submission`

---

## 📊 진행 상태 트래킹

각 태스크 완료 시 이 파일 상단에 ✅ 체크하거나 GitHub Projects와 연동하세요.

Claude Code에게 태스크를 맡길 때는 이렇게 말하세요:
> "IMPLEMENTATION_PLAN.md의 T301 시작. 완료 조건을 모두 만족시키고 커밋해줘."

---

*© 2026 · 냠냠쿨쿨 프로젝트 · Phase 1 MVP 실행 계획 v1.0*

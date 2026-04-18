# docs/ADR.md — 아키텍처 결정 기록 (Architecture Decision Records)

> **목적**: "왜 이 선택을 했는가"를 미래의 우리(또는 Claude Code, 인수인계받은 개발자)에게 남기는 문서.
> **원칙**: 한 번 결정한 것은 뒤집지 않는다. 바꾸려면 새 ADR을 추가하고 기존은 "Superseded"로 표시.
> **형식**: 각 ADR는 Context(배경) → Decision(결정) → Consequences(결과·트레이드오프) 3단 구조.

---

## ADR-001: React Native + Expo 선택

**상태**: Accepted · 2026-04-18
**결정자**: 프로덕트·개발 합의

### Context
모바일 앱 크로스플랫폼 프레임워크로 Flutter와 React Native 중 선택이 필요. 평가 기준:
1. 개발 속도 (MVP 3개월)
2. 개발자 인력 시장 규모 (채용 용이성)
3. 네이티브 기능(알림·백그라운드 태스크) 지원
4. 디자인 시스템 구현 난이도
5. 번들 크기·성능

### Decision
**React Native + Expo (Managed Workflow)** 을 선택.

세부:
- Expo SDK 최신 stable
- TypeScript strict 모드
- Expo Router (파일 기반 라우팅)
- EAS Build (빌드·제출 자동화)

### Consequences

**Pros**:
- JS/TS 단일 언어로 웹·모바일 공유 가능 (예측 엔진을 타입 그대로 이식 가능)
- Expo의 OTA 업데이트로 빠른 패치 배포 → 초반 버그 수정 빠름
- 카카오 SDK·리액트 생태계 라이브러리 풍부
- 팀 채용 시 RN 개발자 국내 풀이 Flutter보다 약 2배
- **이미 확보한 `prediction_engine.ts`를 손쉽게 재사용** (Flutter면 Dart로 포팅 필요)

**Cons**:
- Flutter 대비 60fps 애니메이션 보장이 까다로움 → react-native-reanimated 3.x + 신중한 사용으로 대응
- Expo Managed Workflow 한계로 일부 네이티브 모듈은 Bare/Prebuild 필요할 수 있음 → 미리 알림 권한·백그라운드 스케줄링 검증 완료 (expo-notifications 충분)
- 앱 크기 Flutter보다 다소 큼 → 초기 MVP 기준 허용 가능

### 고려했으나 택하지 않은 대안
- **Flutter**: 단일 바이너리·성능 우위가 있으나, 팀·생태계·TS 공유 이점에서 RN이 승.
- **Native (Swift + Kotlin)**: 품질은 최상이나 3개월 MVP 불가능.

---

## ADR-002: Supabase를 백엔드로 선택

**상태**: Accepted · 2026-04-18

### Context
백엔드 옵션 평가:
1. Firebase (Google BaaS)
2. Supabase (오픈소스, Postgres 기반)
3. 자체 구축 (Node.js + PostgreSQL)
4. AWS Amplify

기준:
- MVP 개발 속도
- 인증·Realtime·Storage 통합성
- Vendor lock-in 위험
- 비용 예측 가능성
- 국내 법규(개인정보보호법) 데이터 레지던시

### Decision
**Supabase Hosted (Seoul 리전 가능 시)** 선택.

### Consequences

**Pros**:
- **PostgreSQL 네이티브** → SQL·JSON·전문검색·강력한 RLS. 향후 복잡한 쿼리 필요 시 확장 용이
- **오픈소스** → 언제든 self-host로 이전 가능 (vendor lock-in 완화)
- Row Level Security가 설계 중심이라 가족 공유 같은 권한 로직이 깔끔
- 타입 자동 생성(`supabase gen types`) → TypeScript 강력한 타입 안전성
- Storage(파일), Edge Functions, Realtime이 단일 플랫폼에서 통합 관리
- 무료 tier 충분 (500MB DB, 2GB 전송, 50K MAU) → 초기 비용 0

**Cons**:
- Firebase 대비 생태계·SDK 안정성 약간 뒤처짐 (2020년 이후 급성장 중이나 역사 짧음)
- 모바일 푸시 서비스 내장 없음 → Expo Push Service·FCM 별도 연동 필요 (ADR-005 참조)
- 한국어 공식 문서 제한적 → 영문 문서 의존

### 고려했으나 택하지 않은 대안
- **Firebase**: RLS 대응으로 Firestore 보안 규칙을 짜면 복잡도 높고 디버깅 어려움. Postgres의 관계형 모델이 우리 데이터(아기-보호자-기록)에 더 적합. Vendor lock-in 심각.
- **자체 구축**: MVP 개발 속도 치명적 손해. 인프라 운영 부담.
- **AWS Amplify**: 학습 곡선 + 비용 불확실성.

### 주요 리스크 & 완화
- **데이터 레지던시**: Supabase Seoul 리전이 아직 미제공이면 Tokyo 리전 사용. 개인정보 영향평가 시 국외 이전 동의 조항 포함. 정식 출시 전 재점검.
- **비용 급증 시**: Pro 플랜($25/월) → Team($599/월) → 자체 호스팅 순으로 단계적 대응 전략 수립.

---

## ADR-003: 인증은 이메일 + 카카오 OAuth

**상태**: Accepted · 2026-04-18

### Context
타겟이 **한국 초보엄마 (25~40세 여성)** 이므로 인증 방식이 진입 장벽이 되지 않아야 함.

조사 결과 (국내 여성 모바일 인증 선호도, 업계 일반론):
- 카카오: 전 연령 90%+ 설치
- 네이버: 30~40대 인지도 높음
- 애플/구글: iOS 유저 중심, 비율 제한적
- 이메일+비번: 신뢰도는 높으나 가입 시 마찰 큼

### Decision
**1차: 카카오 OAuth (주력)** + **이메일/비밀번호 (보조)**
**2차 (V1.1): 애플 로그인 (iOS 앱스토어 정책상 필수)**

### Consequences

**Pros**:
- 카카오 원탭 로그인으로 가입 마찰 최소화 (예상 가입 전환율 65%+)
- 이메일은 카카오 사용 못하는 극소수 사용자 대응
- Supabase Auth가 카카오 OAuth 네이티브 지원

**Cons**:
- 카카오 OpenID Connect 설정 초기 세팅 번거로움 (카카오 디벨로퍼 앱 등록·동의항목 설정)
- 애플 로그인 추가 전까지는 iOS 앱스토어 심사 시 경고 가능성 있음 → V1.1에 반드시 추가

### 세부 결정
- 이메일 확인 이메일 **비활성** (MVP) → 비밀번호 재설정 시에만 이메일 발송
- 비밀번호 최소 6자 (8자는 너무 높음, 수면부족 엄마 고려)
- 소셜 로그인 성공 시 자동으로 온보딩으로 진입

---

## ADR-004: 상태관리는 Zustand + TanStack Query

**상태**: Accepted · 2026-04-18

### Context
React Native 상태관리 옵션:
1. Redux Toolkit + RTK Query
2. Zustand + TanStack Query
3. Jotai + SWR
4. Context API만

### Decision
**클라이언트 상태: Zustand** + **서버 상태: TanStack Query v5**

### Consequences

**Pros**:
- **Zustand**: 보일러플레이트 최소. 5줄이면 store 하나 만듦. Redux 대비 번들 크기 1/10
- **TanStack Query**: 캐싱·무효화·optimistic update·재시도 전부 포함. 우리 앱의 "기록 추가 → 예측 재계산" 패턴에 이상적
- 두 도구의 책임 분리가 명확 → 코드 리뷰·인수인계 쉬움
- DevTools 모두 지원

**Cons**:
- Redux 경험자에게는 낯섦 → 온보딩 문서 필요 (CLAUDE.md §7에 패턴 기재)
- 깊은 중첩 상태(폼 등)는 Zustand만으로는 불편 → react-hook-form과 역할 분담

### 세부 결정
- 서버 데이터는 절대 Zustand에 duplicate 저장 금지
- 쿼리키는 계층적: `[entity, id, params]`
- 기본 staleTime 30초, 예측 관련 10초
- mutation 성공 시 `invalidateQueries` 또는 optimistic `setQueryData`

---

## ADR-005: 알림은 Expo Notifications 중심, 푸시는 Expo Push Service

**상태**: Accepted · 2026-04-18

### Context
알림 요구사항:
1. 예측 시각 10분 전 로컬 알림 (수유·수면)
2. 4시간 경고 등 critical 알림
3. 가족 공유 시 원격 푸시 (예: "배우자가 방금 수유 완료 기록")
4. 앱 종료 상태에서도 로컬 알림 동작

### Decision
- **로컬 알림**: `expo-notifications` 사용
- **원격 푸시**: Expo Push Service + Supabase Edge Function에서 전송 트리거

### Consequences

**Pros**:
- Expo Notifications는 iOS APNs / Android FCM 추상화 → 개발 속도 빠름
- Expo Push Service는 FCM·APNs 직접 다루는 것보다 설정 간단
- Supabase Edge Function에서 DB 변경 트리거로 푸시 발송 가능 → 서버 코드 최소화
- 로컬 알림은 OS가 관리하므로 배터리·메모리 부담 없음

**Cons**:
- Expo Push Service는 무료지만 SLA 100% 보장 아님 → critical 알림은 로컬로 보완 (위험 중첩)
- iOS 백그라운드 실행 제약으로 예측 재계산이 실시간 되지 않을 수 있음 → 앱 열릴 때마다 재스케줄링으로 보완

### 세부 규칙
- 최대 동시 예약 알림: 기기당 3개 (수유 1, 수면 1, 경고 1)
- 방해 금지 시간 (22:00~06:00): critical 외 소리·배너 suppress
- 예측 바뀌면 기존 identifier로 cancel → 새로 schedule
- 사용자 권한 거부 시 그래이스풀 디그레이드 (인앱 배너만)

---

## ADR-006: 날짜 라이브러리는 date-fns

**상태**: Accepted · 2026-04-18

### Context
프로젝트 전체에서 날짜 계산(월령 계산, 경과 시간, 포매팅)이 매우 빈번. moment / dayjs / date-fns / Temporal polyfill 중 선택.

### Decision
**date-fns** 사용. moment 금지.

### Consequences

**Pros**:
- 트리 쉐이킹 완벽 → 번들 크기 최소
- 불변·함수형 API → 버그 적음
- 한국어 로케일 지원
- TypeScript 일급

**Cons**:
- moment 사용 익숙한 개발자는 적응 필요

### 세부 규칙
- `differenceInDays`, `differenceInMonths`, `format` 같은 개별 함수 import
- 전역 로케일: `date-fns/locale/ko`
- ISO8601 문자열로 Supabase와 주고받기 (`new Date().toISOString()`)

---

## ADR-007: 스타일은 NativeWind (Tailwind for RN)

**상태**: Accepted · 2026-04-18

### Context
RN 스타일링: StyleSheet API / styled-components / NativeWind / Tamagui 중 선택.

### Decision
**NativeWind v4** 사용.

### Consequences

**Pros**:
- 웹의 Tailwind 경험 그대로 모바일에 적용 → 프로토타입 HTML에서 만든 디자인 토큰 이식 매우 쉬움
- 다크모드 `dark:` prefix 간결
- 컴포넌트 수명 주기 외부에서 스타일 결정 → 성능 좋음

**Cons**:
- v4는 2025년 출시 상대적 신규 → 커뮤니티 이슈 대응 필요
- 복잡한 애니메이션은 reanimated 별도 사용

### 세부 규칙
- 모든 색상·간격·폰트는 `tailwind.config.js`의 `theme.extend`에서만 정의
- 인라인 스타일 prop 금지 (단, 동적 값 예외)
- 컴포넌트별 복잡한 스타일은 `className` 변수로 추출

---

## ADR-008: E2E 테스트는 Maestro

**상태**: Accepted · 2026-04-18

### Context
E2E: Detox / Maestro / Appium 중 선택.

### Decision
**Maestro** 사용.

### Consequences

**Pros**:
- YAML 기반 → 비개발자도 시나리오 작성 가능 (QA·기획자 참여)
- iOS/Android 동일 시나리오
- 셋업 극도로 간단 (Detox 대비 1/3)
- flaky 테스트 줄이는 자동 재시도

**Cons**:
- 세밀한 네이티브 제어는 Detox가 강점 → 필요 시 병용 여지

---

## 📋 결정 요약 표

| ADR | 결정 | 대안 | 핵심 이유 |
|---|---|---|---|
| 001 | React Native + Expo | Flutter | TS 재사용 + 채용 시장 |
| 002 | Supabase | Firebase | Postgres + RLS + 오픈소스 |
| 003 | Kakao + Email | Apple 1차 제외 | 한국 타겟 마찰 최소화 |
| 004 | Zustand + TanStack Query | Redux | 보일러플레이트 절감 |
| 005 | Expo Notifications + Push | Firebase Messaging | Expo 생태계 통합 |
| 006 | date-fns | moment | 번들 크기 + 불변성 |
| 007 | NativeWind v4 | StyleSheet | HTML 프로토타입 이식 용이 |
| 008 | Maestro | Detox | 셋업 간단 + YAML |

---

## 🔄 변경 이력

| 날짜 | ADR | 변경 내용 | 승인자 |
|---|---|---|---|
| 2026-04-18 | 001~008 | 최초 작성 | 기획·개발 |

향후 결정 변경 시 이 표에 기록 + 기존 ADR는 "Superseded by ADR-XXX"로 표시.

---

*© 2026 · 냠냠쿨쿨 프로젝트 · 아키텍처 결정 기록 v1.0*

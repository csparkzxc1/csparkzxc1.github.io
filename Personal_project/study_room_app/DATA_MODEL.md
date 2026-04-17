# 데이터 모델 설계 (v0.1)

**문서 목적**: MVP 기능 정의서 §4.1의 Must Have 기능을 구현하기 위한 최소 데이터 스키마 정의. 백엔드 착수 기반 문서.

**범위**: MVP에서 실제로 동작시켜야 할 엔티티만 포함. Phase 2 기능(카드결제, 보강, 일할계산)은 명시적으로 제외.

-----

## 1. 엔티티 목록 (ERD 요약)

```
Academy (공부방)
  └─ 1:N ─ Teacher (원장, MVP는 1인)
  └─ 1:N ─ Student (학생)
  └─ 1:N ─ ClassRoom (반)
  └─ 1:N ─ BillingRule (정산 규칙)

ClassRoom
  └─ 1:N ─ ClassSchedule (요일별 시간표)
  └─ N:M ─ Student (Enrollment 통해)

Student
  └─ 1:N ─ Guardian (학부모 연락처)
  └─ 1:N ─ AttendanceRecord (출결)
  └─ 1:N ─ Invoice (월별 정산서)

AttendanceRecord
  └─ N:1 ─ Student

Invoice
  └─ 1:N ─ InvoiceLineItem (차감/할인 내역)
  └─ 1:N ─ NotificationLog (발송된 알림톡)
```

-----

## 2. 테이블 스키마 (PostgreSQL)

### 2.1 `academy` — 공부방

원장 1인 = 공부방 1개. 멀티테넌시 루트.

| 컬럼            | 타입           | 제약                  | 설명                          |
| --------------- | -------------- | --------------------- | ----------------------------- |
| id              | UUID           | PK                    | 공부방 ID                     |
| name            | VARCHAR(100)   | NOT NULL              | 공부방 이름                   |
| owner_teacher_id| UUID           | FK → teacher.id       | 대표 원장                     |
| created_at      | TIMESTAMPTZ    | NOT NULL, default now |                               |
| subscription_tier| VARCHAR(20)   | NOT NULL, default 'free' | free / paid            |

### 2.2 `teacher` — 원장

MVP는 공부방당 1명이지만, 스키마는 확장 대비 1:N.

| 컬럼           | 타입          | 제약                     | 설명                     |
| -------------- | ------------- | ------------------------ | ------------------------ |
| id             | UUID          | PK                       |                          |
| academy_id     | UUID          | FK → academy.id, NOT NULL|                          |
| phone          | VARCHAR(20)   | UNIQUE, NOT NULL         | 로그인 식별자 (전화번호) |
| name           | VARCHAR(50)   | NOT NULL                 |                          |
| role           | VARCHAR(20)   | NOT NULL, default 'owner'| owner / assistant (P2)   |
| created_at     | TIMESTAMPTZ   | NOT NULL, default now    |                          |

### 2.3 `student` — 학생

| 컬럼           | 타입          | 제약                      | 설명                             |
| -------------- | ------------- | ------------------------- | -------------------------------- |
| id             | UUID          | PK                        |                                  |
| academy_id     | UUID          | FK → academy.id, NOT NULL |                                  |
| name           | VARCHAR(50)   | NOT NULL                  |                                  |
| grade          | SMALLINT      | NULL 가능                 | 학년 (1~12)                      |
| monthly_fee    | INTEGER       | NOT NULL                  | 기본 월 수강료 (원 단위)         |
| sibling_group_id| UUID         | NULL 가능                 | 형제 묶음 ID (같은 값 = 형제 관계) |
| status         | VARCHAR(20)   | NOT NULL, default 'active'| active / withdrawn               |
| enrolled_at    | DATE          | NOT NULL                  | 등록일 (결제 시작 기준)          |
| withdrawn_at   | DATE          | NULL 가능                 | 퇴원일                           |
| created_at     | TIMESTAMPTZ   | NOT NULL, default now     |                                  |

**인덱스**: `(academy_id, status)`, `sibling_group_id`

### 2.4 `guardian` — 학부모 연락처

한 학생에 복수 연락처 허용 (엄마/아빠). 알림톡 발송 대상.

| 컬럼              | 타입         | 제약                      | 설명                         |
| ----------------- | ------------ | ------------------------- | ---------------------------- |
| id                | UUID         | PK                        |                              |
| student_id        | UUID         | FK → student.id, NOT NULL |                              |
| name              | VARCHAR(50)  | NULL 가능                 | "○○ 어머님" 등              |
| phone             | VARCHAR(20)  | NOT NULL                  | 알림톡 수신 번호             |
| relation          | VARCHAR(20)  | NULL 가능                 | mother / father / other      |
| is_primary        | BOOLEAN      | NOT NULL, default true    | 정산 안내 우선 수신 대상     |
| notification_optin| BOOLEAN      | NOT NULL, default true    | 알림톡 수신 동의             |

**인덱스**: `(student_id, is_primary)`, `phone`

### 2.5 `class_room` — 반

| 컬럼        | 타입         | 제약                      | 설명             |
| ----------- | ------------ | ------------------------- | ---------------- |
| id          | UUID         | PK                        |                  |
| academy_id  | UUID         | FK → academy.id, NOT NULL |                  |
| name        | VARCHAR(50)  | NOT NULL                  | 예: "초3 월수금" |
| subject     | VARCHAR(30)  | NULL 가능                 | 영어/수학 등     |
| created_at  | TIMESTAMPTZ  | NOT NULL, default now     |                  |

### 2.6 `class_schedule` — 반 요일별 시간표

| 컬럼          | 타입     | 제약                          | 설명                   |
| ------------- | -------- | ----------------------------- | ---------------------- |
| id            | UUID     | PK                            |                        |
| class_room_id | UUID     | FK → class_room.id, NOT NULL  |                        |
| day_of_week   | SMALLINT | NOT NULL, CHECK (0~6)         | 0=일요일, 6=토요일     |
| start_time    | TIME     | NOT NULL                      |                        |
| end_time      | TIME     | NOT NULL                      |                        |

**유니크**: `(class_room_id, day_of_week, start_time)`

### 2.7 `enrollment` — 학생-반 배정

| 컬럼          | 타입         | 제약                          | 설명       |
| ------------- | ------------ | ----------------------------- | ---------- |
| id            | UUID         | PK                            |            |
| student_id    | UUID         | FK → student.id, NOT NULL     |            |
| class_room_id | UUID         | FK → class_room.id, NOT NULL  |            |
| assigned_at   | TIMESTAMPTZ  | NOT NULL, default now         |            |
| removed_at    | TIMESTAMPTZ  | NULL 가능                     | 반 이동 시 |

**유니크**: `(student_id, class_room_id)` where `removed_at IS NULL`

### 2.8 `attendance_record` — 출결

하루 1학생당 1레코드 원칙. 체크인/체크아웃은 같은 레코드의 컬럼 업데이트로 처리.

| 컬럼              | 타입         | 제약                          | 설명                                  |
| ----------------- | ------------ | ----------------------------- | ------------------------------------- |
| id                | UUID         | PK                            |                                       |
| student_id        | UUID         | FK → student.id, NOT NULL     |                                       |
| class_room_id     | UUID         | FK → class_room.id, NULL 가능 | 반 기준 기록 시                       |
| date              | DATE         | NOT NULL                      | 수업일                                |
| status            | VARCHAR(20)  | NOT NULL                      | present / absent                      |
| check_in_at       | TIMESTAMPTZ  | NULL 가능                     | 등원 체크 시각                        |
| check_out_at      | TIMESTAMPTZ  | NULL 가능                     | 하원 체크 시각                        |
| absence_reason    | VARCHAR(30)  | NULL 가능                     | personal / sick / no_contact / other  |
| absence_note      | TEXT         | NULL 가능                     | 원장 메모                             |
| recorded_by       | UUID         | FK → teacher.id, NOT NULL     |                                       |
| created_at        | TIMESTAMPTZ  | NOT NULL, default now         |                                       |
| updated_at        | TIMESTAMPTZ  | NOT NULL, default now         |                                       |

**유니크**: `(student_id, date)`
**인덱스**: `(date, class_room_id)`, `(student_id, date DESC)`

**제약**:
- `status = 'absent'` 일 때 `absence_reason` NOT NULL
- `status = 'present'` 일 때 `check_in_at` NOT NULL

### 2.9 `billing_rule` — 정산 규칙

공부방별 1세트. 결석 차감·형제 할인 정책.

| 컬럼                       | 타입        | 제약                          | 설명                                       |
| -------------------------- | ----------- | ----------------------------- | ------------------------------------------ |
| id                         | UUID        | PK                            |                                            |
| academy_id                 | UUID        | FK → academy.id, UNIQUE       |                                            |
| absence_free_count         | SMALLINT    | NOT NULL, default 0           | 월 N회까지는 차감 없음                     |
| absence_deduction_per_class| INTEGER     | NOT NULL, default 0           | 초과분 회당 차감액 (원)                    |
| sibling_discount_rate      | DECIMAL(4,3)| NOT NULL, default 0.000       | 0.100 = 10% 할인 (2번째 자녀부터)          |
| updated_at                 | TIMESTAMPTZ | NOT NULL, default now         |                                            |

### 2.10 `invoice` — 월별 정산서

학생 × 월 조합으로 1장.

| 컬럼           | 타입         | 제약                          | 설명                        |
| -------------- | ------------ | ----------------------------- | --------------------------- |
| id             | UUID         | PK                            |                             |
| student_id     | UUID         | FK → student.id, NOT NULL     |                             |
| period_year    | SMALLINT     | NOT NULL                      | 2026                        |
| period_month   | SMALLINT     | NOT NULL, CHECK (1~12)        |                             |
| base_fee       | INTEGER      | NOT NULL                      | 기본 수강료 스냅샷          |
| absence_deduction| INTEGER    | NOT NULL, default 0           | 결석 차감액                 |
| sibling_discount| INTEGER     | NOT NULL, default 0           | 형제 할인액                 |
| total_amount   | INTEGER      | NOT NULL                      | 최종 청구액                 |
| status         | VARCHAR(20)  | NOT NULL, default 'issued'    | issued / paid / overdue     |
| issued_at      | TIMESTAMPTZ  | NOT NULL                      | 생성 시각                   |
| paid_at        | TIMESTAMPTZ  | NULL 가능                     | 수납 확인 시각              |
| payment_method | VARCHAR(20)  | NULL 가능                     | cash / bank_transfer (MVP)  |
| note           | TEXT         | NULL 가능                     |                             |

**유니크**: `(student_id, period_year, period_month)`
**인덱스**: `(period_year, period_month, status)`

### 2.11 `invoice_line_item` — 정산 상세 내역 (감사용)

정산서 계산 근거 보존. 학부모 문의 대응용.

| 컬럼         | 타입         | 제약                           | 설명                                           |
| ------------ | ------------ | ------------------------------ | ---------------------------------------------- |
| id           | UUID         | PK                             |                                                |
| invoice_id   | UUID         | FK → invoice.id, NOT NULL      |                                                |
| line_type    | VARCHAR(30)  | NOT NULL                       | base / absence_deduction / sibling_discount    |
| description  | VARCHAR(200) | NOT NULL                       | 예: "4/3 병결 1회 차감"                        |
| amount       | INTEGER      | NOT NULL                       | 양수=청구, 음수=차감                           |

### 2.12 `notification_log` — 알림톡 발송 이력

발송 성공률 KPI 추적 및 재발송 근거.

| 컬럼              | 타입         | 제약                         | 설명                                                       |
| ----------------- | ------------ | ---------------------------- | ---------------------------------------------------------- |
| id                | UUID         | PK                           |                                                            |
| academy_id        | UUID         | FK → academy.id, NOT NULL    |                                                            |
| guardian_id       | UUID         | FK → guardian.id, NOT NULL   |                                                            |
| template_code     | VARCHAR(50)  | NOT NULL                     | check_in / check_out / absence / invoice_issued            |
| related_entity_id | UUID         | NOT NULL                     | attendance_record.id 또는 invoice.id                       |
| phone             | VARCHAR(20)  | NOT NULL                     | 발송 시점 번호 스냅샷                                      |
| payload           | JSONB        | NOT NULL                     | 치환 변수 기록                                             |
| provider          | VARCHAR(20)  | NOT NULL                     | aligo / nhn 등                                             |
| provider_msg_id   | VARCHAR(100) | NULL 가능                    | 공급자 메시지 ID                                           |
| status            | VARCHAR(20)  | NOT NULL                     | pending / sent / failed / fallback_sms                     |
| error_code        | VARCHAR(50)  | NULL 가능                    |                                                            |
| sent_at           | TIMESTAMPTZ  | NULL 가능                    |                                                            |
| created_at        | TIMESTAMPTZ  | NOT NULL, default now        |                                                            |

**인덱스**: `(academy_id, created_at DESC)`, `(status, created_at)` — KPI 쿼리용

-----

## 3. 핵심 계산 로직

### 3.1 월 수강료 계산 (invoice 생성 시)

```
total_amount = base_fee
             - absence_deduction
             - sibling_discount

absence_deduction = max(0, 월_결석횟수 - billing_rule.absence_free_count)
                    × billing_rule.absence_deduction_per_class
  * 단, absence_reason = 'sick' 인 경우는 무료 결석 카운트에 포함하지 않는 옵션 추후 (P2)

sibling_discount = base_fee × billing_rule.sibling_discount_rate
  * 같은 sibling_group_id 내에서 enrolled_at 빠른 순 1명 제외, 나머지에 적용
```

### 3.2 출결 상태 전이

```
(없음)  →  present (check_in_at 기록)  →  present (check_out_at 추가 기록)
(없음)  →  absent (absence_reason 필수)
```

수정은 원장만, 최근 30일 이내 레코드만 허용 (MVP §4.1 B).

-----

## 4. 개인정보 및 데이터 보존 정책

- `guardian.phone`: 알림 전송 전용. 외부 유출 차단 (API 응답에서 마스킹: `010-****-1234`)
- 퇴원 학생: 1년 보존 후 개인정보 필드 익명화 (name → "탈퇴학생", phone → null), 정산 이력은 유지
- `notification_log.payload`: 90일 후 민감 필드 삭제, 메타데이터(status, sent_at)만 유지

-----

## 5. MVP에서 의도적으로 넣지 않은 것

| 미포함 테이블/필드 | 사유                                                         |
| ------------------ | ------------------------------------------------------------ |
| makeup_class       | 보강 관리는 Should Have (§4.2)                               |
| payment_gateway_tx | 카드결제는 Phase 2                                           |
| daily_proration    | 일할 계산은 Should Have                                      |
| homework, grade    | Won't Have (§4.3) — 포지션 흐림 방지                         |
| student_device     | 학생은 앱 사용자 아님 (§4.3)                                 |
| chat_message       | 카카오톡 존재, 중복 가치 없음 (§4.3)                         |

-----

## 6. 다음 단계

1. 본 스키마 기반 Prisma/TypeORM 엔티티 작성 (스캐폴딩 단계)
2. API 엔드포인트 명세 (화면 명세 이후)
3. 시드 데이터 준비 (공부방 1곳, 학생 10명, 2주치 출결)

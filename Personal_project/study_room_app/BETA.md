# 베타 운영 런북 (v0.1)

**목적**: 공부방 원장 10곳과의 베타 테스트를 문제 없이 진행하기 위한 실무 가이드.

**원칙**: 베타 기간 동안 원장과 학부모가 겪는 **모든 오류는 MVP.md §11 리스크 2·3의 현실화**다. 빠르게 감지하고, 빠르게 되돌릴 수 있어야 한다.

-----

## 1. 베타 출시 전 체크리스트

출시 **T-3일** 시점에 모두 ✅ 여야 한다.

- [ ] `npm run typecheck --workspaces` 통과
- [ ] `npm test --workspace apps/api` 통과 (템플릿 단위 테스트)
- [ ] `npm run test:smoke --workspace apps/api` 통과 (실 DB 엔드투엔드)
- [ ] `docker compose up --build` 1회 성공 (clean env)
- [ ] Aligo 알림톡 템플릿 4종 (`STUDY_ROOM_*`) 승인 완료
- [ ] 프로덕션 `ALIGO_*`, `INVOICE_BANK_ACCOUNT`, `PARENT_BASE_URL` 시크릿 주입
- [ ] Postgres 백업 스케줄 설정 (최소 1일 1회)
- [ ] 원장 초대 링크 템플릿 준비 (§4)
- [ ] 긴급 롤백 SOP 리허설 (§7)

-----

## 2. 배포

### 2.1 스테이징/프로덕션 공통 절차

```bash
# 1) 코드 체크아웃
git pull origin main

# 2) 빌드 + DB 마이그레이션 + 기동 (docker-compose.yml 사용)
docker compose pull
docker compose up -d --build

# 3) 스모크 확인
curl -sf https://api.example.com/health
# => {"ok":true}
```

API 컨테이너 진입 시 `prisma migrate deploy`가 자동 실행됨 (Dockerfile CMD). 수동 호출 불필요.

### 2.2 환경 변수

| 변수                      | 필수 | 설명                                         |
| ------------------------- | ---- | -------------------------------------------- |
| `DATABASE_URL`            | ✓    | Postgres 16 연결 URL                         |
| `PARENT_BASE_URL`         | ✓    | 학부모 웹뷰 절대 URL (예: `https://p.example.com`) |
| `ALIGO_API_KEY`           | ✓    | 알림톡 프로바이더 인증키                     |
| `ALIGO_USER_ID`           | ✓    | 알림톡 유저 ID                               |
| `ALIGO_SENDER`            | ✓    | 발신번호 (사전 등록)                         |
| `ALIGO_SENDER_KEY`        | ✓    | 채널 발신프로파일 키                         |
| `INVOICE_BANK_ACCOUNT`    | ✓    | 정산 알림톡에 표시될 계좌번호 문자열         |
| `DISABLE_NOTIFICATION_WORKER` | — | 분리 프로세스 운영 시 `true` (기본 `false`)   |

**주의**: Aligo env 하나라도 누락되면 워커가 mock 모드로 떨어져 실제 발송 없이 `sent` 처리된다. 프로덕션에서는 기동 직후 실 번호로 테스트 체크인 1건 돌려 실제 수신까지 확인한다.

-----

## 3. 시연용 데이터 (영업/교육용)

```bash
# 10명 학생, 2주치 출결(약 90% 출석), 당월 정산서 포함
npm run seed:demo --workspace apps/api
```

출력에 `academyId`, 원장 phone이 찍힘. 영업 미팅 계정으로 사용.

-----

## 4. 원장 온보딩 절차

### 4.1 사전 준비 (원장 1명당 10분)

1. 원장과 통화로 아래 3가지 확인
   - 공부방 이름 (정확한 표기)
   - 원장 본인 휴대폰 번호
   - 학생 명단 + 학년 + 월 수강료 + 학부모 연락처 (엑셀/수기 모두 OK)
2. 카카오톡으로 앱 설치 링크 + 이 문서 §4.2 가이드 공유

### 4.2 원장에게 보내는 안내 메시지 템플릿

```
안녕하세요 선생님, 공부방 출결·정산 앱 베타 초대 안내드립니다.

1. 앱 설치: [스토어 링크]
2. 설치 후 "공부방 이름, 원장님 이름, 휴대폰 번호" 입력
3. 오늘 수업 전에 학생 명단 입력 (5~10분 소요)
4. 첫 수업부터 바로 학생 카드 탭 한 번으로 등원 체크 → 학부모 알림톡 자동 발송

궁금하신 점은 제게 바로 연락 주세요. 사용 중 오류가 보이면 캡처해서 보내주시면 됩니다.
— 운영팀 드림
```

### 4.3 원장 첫 24시간 체크포인트

- [ ] 온보딩 → 학생 5명 이상 등록 (Activation KPI 지표, MVP.md §9)
- [ ] 첫 체크인 1건 → 학부모 알림톡 수신 실사 확인 (원장 본인의 번호로 테스트 추천)
- [ ] 학부모 페이지 링크 클릭 → 본인 자녀 정보 렌더 확인
- [ ] 피드백 1개 수집 (무엇이 좋았나 / 무엇이 헷갈렸나)

-----

## 5. 일일 운영 모니터링

### 5.1 매일 아침 9시 체크 (3분)

```bash
# 전체 공부방 집계
psql $DATABASE_URL -c "
  SELECT a.name, COUNT(DISTINCT s.id) AS students,
         COUNT(DISTINCT ar.id) FILTER (WHERE ar.date = CURRENT_DATE - 1) AS yday_attendance
  FROM academy a
  LEFT JOIN student s ON s.\"academyId\" = a.id AND s.status='active'
  LEFT JOIN attendance_record ar ON ar.\"studentId\" = s.id
  GROUP BY a.id, a.name
  ORDER BY yday_attendance DESC;
"
```

신호: **어제 출결 0건**이 연속 2일이면 드롭아웃 징후 → 해당 원장에게 전화.

### 5.2 알림톡 발송 성공률 (KPI: 99%)

```bash
curl -s "https://api.example.com/api/notifications/stats?academyId=${ACADEMY}"
```

응답의 `successRate` < 0.99 가 연속 3일 → **즉시 대응**:
1. `/api/notifications/logs?status=failed` 로 실패 원인 확인
2. 가장 많은 `errorCode` 상위 3개를 확인
3. Aligo 대시보드에서 템플릿 승인 상태 재확인
4. 필요시 SMS 폴백이 정상 동작 중인지 `counts.fallback_sms` 로 확인

### 5.3 구독/수납 (BILLING)

매월 마지막 주 일요일에 전 원장 대상:

```sql
SELECT a.name,
       COUNT(*) FILTER (WHERE i.status='paid') AS paid,
       COUNT(*) FILTER (WHERE i.status='issued') AS unpaid
FROM invoice i
JOIN student s ON s.id = i."studentId"
JOIN academy a ON a.id = s."academyId"
WHERE i."periodYear"=EXTRACT(year FROM now())::int
  AND i."periodMonth"=EXTRACT(month FROM now())::int
GROUP BY a.id, a.name;
```

-----

## 6. 흔한 문제와 대응

| 증상                                         | 원인                              | 대응                                                        |
| -------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| 원장 앱에서 "불러오기 실패"                   | API 미기동 / 네트워크             | `curl /health` → 500 이면 컨테이너 로그 확인, 재시작        |
| 학부모 알림톡 안 옴                            | 템플릿 미승인 또는 Aligo 번호 오타 | `/api/notifications/logs?status=failed` 의 errorCode 확인   |
| 결석 반영됐는데 정산서에 차감 안 됨            | `absence_free_count` 초과 전       | 정상 (MVP.md §4.1 D). 규칙 설명                             |
| 학부모 링크 404                                | 잘못된 토큰 공유/링크 오타        | 영향 없음. 원장 앱에서 알림톡 재발송 가능                   |
| "엑셀이 더 편하다"며 이탈 신호                 | MVP.md §11 리스크 3             | CSV 임포트(§4.2 Should Have) 일정 앞당기기 검토             |
| 원장 휴대폰 변경                              | Teacher 전화번호 변경 경로 필요   | 현재 앱에는 UI 없음; DB 직접 수정 + 재로그인 안내           |

-----

## 7. 롤백 SOP

### 7.1 API 롤백

```bash
# 이전 이미지 태그로 되돌리기
docker compose pull api:previous
docker compose up -d api

# 헬스 확인
curl -sf https://api.example.com/health
```

### 7.2 DB 스키마 롤백

- 원칙: **절대 `prisma migrate reset` 하지 않는다** (데이터 손실)
- 새 컬럼 추가로 문제가 생긴 경우: 직전 안정 이미지 배포 + 새 컬럼 `DEFAULT NULL` 처리
- 근본적으로 되돌려야 하는 경우: 백업 복구 후 원장에게 **사유 + 영향 범위**를 투명하게 공지

### 7.3 알림톡 인시던트

- 전 원장에게 **30분 이내** 일시 중단 공지
- `DISABLE_NOTIFICATION_WORKER=true` 로 재기동 → 발송 일시 정지
- 원인 해결 후 재기동 → 워커가 pending 로그부터 drain 재시작 (idempotent)

-----

## 8. 베타 종료 판정 (출시 후 6주차)

MVP.md §8.2 정식 출시 기준과 동일:
- 베타 10곳 중 **7곳 이상 유료 전환 의향** → 정식 출시 GO
- Crash Free Rate 99.5%+
- 온보딩 완료율 70%+

지표 미달 시 **MVP.md §4.2 Should Have 기능** 중 임팩트 큰 1~2개를 선택해 보강 후 2차 베타.

-----

## 9. 피드백 채널

- 카톡 1:1 (운영자 직결): 가벼운 버그·질문
- 구글폼 (월 1회): NPS + 3문항 정성 피드백
- 유료 전환 의향 콜 (T+30일): 페이 포인트, 가격 수용도

모든 피드백은 Notion `/beta/feedback` DB 에 `(원장, 날짜, 카테고리, 조치)` 로 저장.

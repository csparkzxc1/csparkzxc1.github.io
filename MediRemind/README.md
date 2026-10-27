# MediRemind — 약 복용 알리미

React Native + Expo SDK 56 앱. 정해진 시간에 약 복용을 알리고, 복용 기록·연속 복용·재처방 일정을 관리합니다.
서버 없이 모든 데이터를 기기(SQLite)에 저장합니다. 광고 없음, 7일 무료 체험 후 1회 인앱결제.

## 실행

```bash
npm install
npm test          # 순수 로직 테스트 (Jest)
npm run typecheck
npm start         # Expo 개발 서버 (결제는 mock)
```

## 구조

| 경로 | 내용 |
|------|------|
| `App.tsx` | 초기화(DB·복용 기록·알림), 체험 종료 시 잠금 화면, 알림 "복용 완료" 처리 |
| `src/db/` | SQLite 연결, 버전 기반 마이그레이션(`schema.ts`), 약/복용 기록 저장소, 설정용 kv |
| `src/lib/` | 테스트되는 순수 로직: 알림 묶음 계획, 복용 일정, 연속 복용, 처방 D-Day, 시간 보정, 백업 형식 |
| `src/notifications/` | 반복 알림 예약(DAILY/WEEKLY), 알림 액션 |
| `src/purchase/` | 7일 체험 + 비소모성 인앱결제 (`react-native-iap`) |
| `src/theme/`, `src/i18n/` | 라이트/다크 테마, 한국어/영어 |
| `src/store/` | zustand 상태 (약, 복용 기록) |
| `src/screens/`, `src/components/` | 화면 |
| `legal/` | 개인정보처리방침·지원 페이지 (GitHub Pages) |
| `docs/` | 출시 체크리스트, 인앱결제 설정, 스토어 문구, 스크린샷, 위젯 설계 |
| `scripts/` | 아이콘(`npm run icons`)·스토어 스크린샷(`npm run screenshots`) 생성 — Playwright 필요 |

## 알림 설계

iOS는 앱당 예약 알림을 64개까지만 보관합니다. 그래서 날짜별로 하나씩 예약하지 않고,
같은 시각에 울릴 약을 알림 하나로 묶어 **매일/매주 반복** 트리거로 예약합니다
(`src/lib/notificationPlan.ts`). 약 목록이 바뀔 때마다 OS에 예약된 알림을 조회해 지우고 다시 만듭니다.

## 출시

`docs/GO_LIVE.md` 참고.

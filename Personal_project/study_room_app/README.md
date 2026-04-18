# 공부방 출결·정산 앱 (study_room_app)

공부방·1인 교습소 원장을 위한 등하원 알림 + 수강료 정산 특화 앱.

## 문서

| 파일              | 내용                                        |
| ----------------- | ------------------------------------------- |
| `MVP.md`          | 제품 정의, 기능 범위, KPI, 타임라인         |
| `DATA_MODEL.md`   | PostgreSQL 스키마 (12개 테이블) 및 계산 로직|
| `WIREFRAMES.md`   | 원장 앱 6개 탭 화면 명세                    |

## 프로젝트 구조

```
study_room_app/
├── apps/
│   ├── api/         Node.js + Express + Prisma 백엔드
│   └── mobile/      React Native (Expo) 원장 앱
├── package.json     루트 (npm workspaces)
└── ...docs
```

## 빠른 시작

### 옵션 A: Docker Compose (권장)

```bash
docker compose up --build
# API: http://localhost:4000
# Postgres: localhost:5432 (study/study/study_room)
```

### 옵션 B: 로컬 개발

```bash
npm install                              # 워크스페이스 의존성

# DB 준비 (Postgres 16 필요, .env 설정)
cp apps/api/.env.example apps/api/.env
npm run prisma:migrate --workspace apps/api
npm run seed --workspace apps/api

# API
npm run dev --workspace apps/api

# 모바일 앱 (별도 터미널)
npm run start --workspace apps/mobile
```

### 학부모 웹뷰

API가 뜨면 `http://localhost:4000/p/:token` 에서 접근 가능.
토큰은 `guardian.accessToken` (학생 등록 시 자동 발급, 알림톡 버튼 URL에 포함됨).

## 개발 단계

- [x] M0: 기획 문서 (MVP / DATA_MODEL / WIREFRAMES)
- [ ] M1: 스키마 마이그레이션, 시드 데이터
- [ ] M2: Must Have A~E 기능 구현
- [ ] M3: 베타 온보딩

# 💊 MediRemind — 약 복용 알리미 앱

React Native + Expo로 만든 iOS/Android 동시 지원 약 복용 관리 앱입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 📋 홈 화면 | 오늘 복용 현황 카드, 복용 완료 토글, 진행률 바 |
| 💊 약 목록 | 등록 약 카드 목록, 스와이프 삭제, 활성화 토글 |
| ✏️ 약 등록/수정 | 이름, 용량, 시간, 요일, 색상, 재처방 알림 설정 |
| 📅 복용 달력 | 월간 달력, 완료/미복용 마커, 날짜별 상세 내역 |
| ⚙️ 설정 | 알림 소리/진동, 기록 초기화, 광고 제거 |
| 🔔 알림 | 복용 시간 알림, 재처방 임박 알림 |
| 📢 광고 | AdMob 배너(홈), 전면 광고(달력 3회 중 1회) |

---

## 기술 스택

- **Framework**: React Native + Expo SDK 51
- **언어**: TypeScript
- **상태관리**: Zustand
- **로컬 DB**: expo-sqlite + AsyncStorage
- **알림**: expo-notifications
- **날짜 처리**: date-fns
- **아이콘**: @expo/vector-icons (Ionicons)
- **네비게이션**: React Navigation v6 (Stack + Bottom Tab)
- **달력**: react-native-calendars
- **광고**: react-native-google-mobile-ads (AdMob)
- **햅틱**: expo-haptics

---

## 프로젝트 구조

```
MediRemind/
├── App.tsx                          # 앱 진입점 + 초기화
├── app.json                         # Expo 설정
├── package.json
├── tsconfig.json
└── src/
    ├── types/index.ts               # 공통 타입 정의
    ├── navigation/
    │   └── AppNavigator.tsx         # Stack + BottomTab 네비게이션
    ├── screens/
    │   ├── HomeScreen.tsx           # 오늘 복용 현황
    │   ├── MedicineListScreen.tsx   # 약 목록 (스와이프 삭제)
    │   ├── MedicineFormScreen.tsx   # 약 등록/수정 폼
    │   ├── CalendarScreen.tsx       # 복용 기록 달력
    │   └── SettingsScreen.tsx       # 설정
    ├── components/
    │   ├── MedicineCard.tsx         # 약 카드 (목록용)
    │   ├── DoseItem.tsx             # 복용 아이템 (홈용)
    │   ├── ProgressBar.tsx          # 복용 완료율 바
    │   ├── PrescriptionBanner.tsx   # 재처방 임박 배너
    │   └── AdBanner.tsx             # AdMob 배너
    ├── store/
    │   ├── medicineStore.ts         # 약 Zustand 스토어
    │   └── doseStore.ts             # 복용 기록 Zustand 스토어
    ├── services/
    │   ├── databaseService.ts       # SQLite + AsyncStorage
    │   ├── notificationService.ts   # 알림 스케줄링
    │   └── adService.ts             # AdMob 전면 광고
    ├── hooks/
    │   ├── useMedicines.ts          # 약 목록 훅
    │   └── useTodayDoses.ts         # 오늘 복용 현황 훅
    └── utils/
        ├── dateUtils.ts             # 날짜 포맷/스케줄 헬퍼
        └── prescriptionUtils.ts     # 재처방 D-day 계산
```

---

## 실행 방법

### 사전 준비

- Node.js 18 이상
- npm 또는 yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode + Simulator (Mac 필요)
- Android: Android Studio + Emulator 또는 실제 기기

### 설치 및 실행

```bash
# 1. 프로젝트 디렉토리로 이동
cd MediRemind

# 2. 의존성 설치
npm install

# 3. Expo 개발 서버 시작
npx expo start

# iOS 시뮬레이터
npx expo start --ios

# Android 에뮬레이터
npx expo start --android
```

### Expo Go 앱 사용 (실제 기기)

1. App Store / Google Play에서 **Expo Go** 설치
2. `npx expo start` 실행
3. QR 코드 스캔 (iOS: 카메라 앱, Android: Expo Go 앱)

> ⚠️ **주의**: `react-native-google-mobile-ads`는 Expo Go에서 지원되지 않습니다.  
> 광고 기능을 포함한 완전한 테스트는 **Expo Development Build** 또는 **EAS Build**가 필요합니다.

### Development Build (권장)

```bash
# EAS Build 설치
npm install -g eas-cli

# EAS 로그인
eas login

# iOS 빌드
eas build --platform ios --profile development

# Android 빌드
eas build --platform android --profile development
```

---

## 데이터 모델

### Medicine (약)

```typescript
interface Medicine {
  id: string;
  name: string;           // 약 이름
  dosage: string;         // 1회 복용량 (예: "1정")
  times: string[];        // 복용 시간 배열 (예: ["08:00", "21:00"])
  days: 'everyday' | 'weekday' | 'weekend' | number[];  // 복용 요일
  color: string;          // 색상 태그 (#HEX)
  memo: string;           // 메모
  isActive: boolean;      // 활성화 여부
  createdAt: string;      // 생성 시각 (ISO 문자열)
  prescription: {         // 재처방 알림 설정 (없으면 null)
    startDate: string;    // 처방 시작일
    totalDays: number;    // 총 처방일수
    alertDays: number[];  // 알림 시점 (예: [3, 7])
  } | null;
}
```

### DoseRecord (복용 기록)

```typescript
interface DoseRecord {
  id: string;
  medicineId: string;
  scheduledTime: string;  // 예정 복용 시간 "HH:mm"
  takenAt: string | null; // 실제 복용 시각 (미복용이면 null)
  date: string;           // 날짜 "YYYY-MM-DD"
  isTaken: boolean;       // 복용 완료 여부
}
```

---

## 광고 설정

현재 **Google AdMob 테스트 광고 ID**가 적용되어 있습니다.  
실제 배포 시 `src/services/adService.ts`의 `AD_CONFIG` 값을 실제 광고 ID로 교체하세요.

```typescript
// src/services/adService.ts
export const AD_CONFIG = {
  BANNER_ID: 'ca-app-pub-XXXXX/XXXXXXXX',       // 실제 배너 광고 ID
  INTERSTITIAL_ID: 'ca-app-pub-XXXXX/XXXXXXXX', // 실제 전면 광고 ID
}
```

---

## 알림 시스템

- **복용 알림**: 약별 복용 시간에 맞춰 최대 30일치 알림 예약
- **재처방 알림**: D-3, D-5, D-7 중 선택한 시점에 오전 9시 알림
- **권한 없을 때**: 알림 기능 비활성화 + 앱은 정상 동작 유지

---

## UI 색상 팔레트

| 색상 | HEX | 용도 |
|------|-----|------|
| Primary Blue | `#4A90D9` | 메인 색상, 헤더 |
| Success Green | `#5CB85C` | 복용 완료 |
| Warning Orange | `#F0AD4E` | 재처방 임박 |
| Danger Red | `#D9534F` | 삭제, 미복용 |
| Purple | `#9B59B6` | 색상 태그 |
| Teal | `#1ABC9C` | 색상 태그 |
| Background | `#F8F9FA` | 배경색 |
| Card | `#FFFFFF` | 카드 배경 |

---

## 라이센스

MIT License

---

*Made with ❤️ using React Native + Expo*

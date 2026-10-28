# 인앱결제 설정 (프리미엄: 약 2개 평생 무료 → 1회 결제로 무제한)

## 동작 방식

- **무료 버전 (평생)**: 약 **2개**까지 등록. 알림, "복용 완료", 달력, 연속 복용, 재처방 알림, 백업, 다크 모드 등
  나머지 기능은 모두 무료입니다. 앱이 잠기는 일은 없습니다.
- **정식 버전 (1회 결제 ₩1,900)**: 약 **무제한** 등록. 구독이 아니고 자동 결제도 없습니다.
- 3번째 약을 추가하려고 하면 결제 화면이 뜹니다("무료 버전은 약 2개까지 등록할 수 있어요").
  설정 → 이용권에서도 열 수 있습니다.
- 사용 중지(스위치 끈) 약도 개수에 포함됩니다. 껐다 켜기로 제한을 피하지 못하게 하기 위해서입니다.
- 백업 불러오기로 들어온 약은 개수와 상관없이 그대로 유지됩니다(사용자 데이터를 지우지 않기 위해).
- 서버 없음: App Store 구매 기록이 기준이고, 기기 DB에 캐시합니다. "구매 복원"은 결제 화면과 설정에 있습니다.

| 파일 | 역할 |
|------|------|
| `src/purchase/purchase.config.ts` | 상품 ID, 무료 개수(`FREE_MEDICINE_LIMIT`), 대체 가격 표시 |
| `src/purchase/limits.ts` | 약 추가 가능 여부 (테스트: `limits.test.ts`) |
| `src/hooks/useAddMedicine.ts` | "+" 버튼: 한도 안이면 등록 화면, 넘으면 결제 화면 |
| `src/purchase/realProvider.ts` | StoreKit 연동 (`react-native-iap` 15) |
| `src/purchase/mockProvider.ts` | 개발용 가짜 결제 (`__DEV__`) |
| `src/components/Paywall.tsx` | 정식 버전 결제 화면 |

## App Store Connect에서 만들 상품 (1개)

앱 → **수익화 → 앱 내 구입** → `+`

| 항목 | 값 |
|------|----|
| 유형 | **비소모성 (Non-Consumable)** |
| 참조 이름 | `MediRemind Full` |
| 제품 ID | **`com.csparkzxc.mediremind.full`** (한 글자도 다르면 안 됨) |
| 가격 | **₩1,900** (다른 나라는 Apple 자동 환산, 미국 약 $1.49) |
| **가족 공유** | **켜기** ← 결제 화면에 "가족 공유로 최대 6명"이라고 적혀 있으므로 반드시 켜야 함 |
| 표시 이름 (한국어) | `MediRemind 정식 버전` |
| 설명 (한국어) | `약을 무제한으로 등록합니다. 1회 결제.` |
| 표시 이름 (영어) | `MediRemind Full Version` |
| 설명 (영어) | `Add unlimited medicines. One-time purchase.` |
| 심사용 스크린샷 | 결제 화면 1장 (`docs/screenshots/ko-06.png` 사용 가능) |

상태가 "제출 준비 완료"가 되면 **첫 앱 버전 제출 화면의 "앱 내 구입" 섹션에서 선택**해 함께 제출합니다.

> 예전에 안내한 ₩0 체험 상품(`…trial7`)은 이제 필요 없습니다. 이미 만들었다면 지우거나 제출에서 빼세요.

## 심사 메모 (App Review Information → Notes)

```
MediRemind is a medication reminder app. All data stays on the device; there is no account or server.

Monetization: the app is free to use with up to 2 medicines. A one-time non-consumable
in-app purchase, "MediRemind Full Version" (com.csparkzxc.mediremind.full), removes the
limit. To see the paywall, add a third medicine. Restore Purchase is on the paywall and in
Settings. Family Sharing is enabled for the purchase.

To test reminders: add a medicine with a time 1-2 minutes ahead and lock the device. The
reminder offers a "Mark taken" action.
```

## 샌드박스 테스트 (TestFlight)

사용자 및 액세스 → **샌드박스** → 테스트 계정 생성 후:
- [ ] 약 2개 등록 → 3번째 "+" → 결제 화면 "무료 버전은 약 2개까지"
- [ ] 구매 → 결제 화면 닫힘 → 3번째 약 등록됨, 설정에 "정식 버전 이용 중"
- [ ] 앱 삭제 → 재설치 → 설정 → 구매 복원 → "정식 버전 이용 중"

## 가격·무료 개수 변경

- 무료로 등록할 수 있는 약 개수: `src/purchase/purchase.config.ts`의 `FREE_MEDICINE_LIMIT`
- 가격: App Store Connect에서 바꾸면 앱이 자동 반영 (대체 표시 `fallbackPriceLabel`만 맞춰 두기)

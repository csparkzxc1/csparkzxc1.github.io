# 인앱결제 설정 (7일 무료 체험 → 1회 구매)

## 동작 방식

- 첫 실행일 자정부터 **7일간 무료 체험**. 남은 일수는 날짜 기준으로 하루씩 줄어듭니다 (7 → 6 → … → 1).
- 8일째부터 앱이 잠기고 구매 화면만 표시됩니다. **복용 알림은 잠긴 뒤에도 계속 울립니다**
  (약 알림을 결제 때문에 끊지 않기 위한 의도적 선택). 잠긴 상태에서 알림의 "복용 완료" 버튼도 기록됩니다.
- 구매는 **비소모성(Non-Consumable) 1회 결제**입니다. 구독이 아닙니다.
- 서버 없음: 구매 여부는 App Store 기록(`getAvailablePurchases`)이 기준이고, 기기 DB에 캐시합니다.
  앱을 지웠다 깔아도 "구매 복원"으로 되살릴 수 있습니다.

| 파일 | 역할 |
|------|------|
| `src/purchase/purchase.config.ts` | 상품 ID, 체험 일수, 대체 가격 표시 |
| `src/purchase/entitlement.ts` | 체험/잠금/구매 계산 (테스트: `entitlement.test.ts`) |
| `src/purchase/realProvider.ts` | 실제 StoreKit 연동 (`react-native-iap` 15) |
| `src/purchase/mockProvider.ts` | 개발용 가짜 결제 (`__DEV__`에서 사용) |
| `metro.config.js` | Expo Go/로컬 실행 시 `react-native-iap`를 스텁으로 대체 |

## App Store Connect에서 할 일 (최초 1회)

1. **계약**: App Store Connect → 비즈니스(계약, 세금 및 금융 거래) → **유료 앱 계약** 상태가 "활성"인지 확인.
   이게 없으면 상품이 로드되지 않고 구매 버튼 아래에 "상품 정보를 불러오지 못했어요"가 뜹니다.
2. **상품 생성**: 앱 → 수익화 → 앱 내 구입 → `+`
   - 유형: **비소모성 (Non-Consumable)**
   - 참조 이름: `MediRemind Full`
   - 제품 ID: **`com.csparkzxc.mediremind.full`** (코드와 정확히 같아야 함)
   - 가격: 원하는 가격 (예: ₩2,200 / $1.99). 앱에 표시되는 가격은 스토어 값을 그대로 씁니다.
   - 현지화: 표시 이름 "MediRemind 정식 버전" / "MediRemind Full Version", 설명 1줄
   - 심사용 스크린샷: 구매 화면 캡처 1장
3. **첫 제출 시**: 앱 버전 페이지의 "앱 내 구입 및 구독" 섹션에서 위 상품을 선택해 **앱과 함께 심사 제출**.
4. **샌드박스 테스트**: 사용자 및 액세스 → 샌드박스 → 테스트 계정 생성 → TestFlight 빌드에서 구매/복원 확인.

## 심사 메모(App Review Information)에 붙여넣을 문구

```
This app offers a 7-day free trial, then a one-time non-consumable purchase
(com.csparkzxc.mediremind.full) unlocks the app permanently. The paywall shows
"Restore Purchase". Medication reminders keep working after the trial ends.
No account or server is used; all data stays on device.
```

## 가격·체험 기간 변경

`src/purchase/purchase.config.ts`의 `trialDays`, `fallbackPriceLabel`만 수정합니다.
실제 가격은 App Store Connect에서 바꾸면 앱이 자동으로 반영합니다.

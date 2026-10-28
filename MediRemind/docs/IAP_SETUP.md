# 인앱결제 설정 (7일 무료 체험 → 1회 구매)

## 동작 방식

1. **첫 실행**: 체험 안내 화면이 뜹니다. 체험 기간(7일), 체험 후 잠기는 기능, 가격을 먼저 보여 주고,
   사용자가 **"7일 무료 체험 시작"**을 눌러야 체험이 시작됩니다.
   - 이 버튼은 ₩0 상품 `com.csparkzxc.mediremind.trial7`을 "구매"합니다. App Store 심사 지침 3.1.1이
     구독이 아닌 앱의 무료 체험을 이 방식으로만 허용하기 때문입니다.
   - 체험 시작일은 그 ₩0 거래 날짜로 정해서, 앱을 지웠다 다시 깔아도 체험이 초기화되지 않습니다.
   - 스토어에서 체험 상품을 불러오지 못하면(오프라인 등) 사용자가 막히지 않도록 기기에서 체험을 시작합니다.
2. **체험 중**: 모든 기능을 쓸 수 있고, 홈 상단에 남은 일수가 보입니다. 날짜가 바뀔 때마다 하루씩 줄어듭니다.
3. **8일째**: 결제 화면만 보입니다. **복용 알림은 잠긴 뒤에도 계속 울리고**, 알림의 "복용 완료"도 기록됩니다.
4. **구매**: 비소모성 1회 결제 `com.csparkzxc.mediremind.full`. 구독이 아닙니다. "구매 복원"으로 재설치 후에도 되살릴 수 있습니다.

서버는 없습니다. App Store 구매 기록이 기준이고, 기기 DB에 캐시합니다.

| 파일 | 역할 |
|------|------|
| `src/purchase/purchase.config.ts` | 상품 ID 2개, 체험 일수, 대체 가격 표시 |
| `src/purchase/entitlement.ts` | 시작 전/체험/잠금/구매 계산 (테스트: `entitlement.test.ts`) |
| `src/purchase/realProvider.ts` | StoreKit 연동 (`react-native-iap` 15) |
| `src/purchase/mockProvider.ts` | 개발용 가짜 결제 (`__DEV__`) |
| `src/components/TrialIntro.tsx` | 첫 실행 체험 안내 화면 |
| `src/components/Paywall.tsx` | 정식 버전 구매 / 잠금 화면 |

## App Store Connect에서 만들 상품 2개

앱 → **수익화 → 앱 내 구입** → `+`

### ① 무료 체험 상품

| 항목 | 값 |
|------|----|
| 유형 | **비소모성 (Non-Consumable)** |
| 참조 이름 | `7-day Trial` |
| 제품 ID | **`com.csparkzxc.mediremind.trial7`** |
| 가격 | **무료 (₩0, Price Tier 0)** |
| 표시 이름 (한국어) | `7일 무료 체험` |
| 설명 (한국어) | `MediRemind의 모든 기능을 7일 동안 무료로 사용합니다.` |
| 표시 이름 (영어) | `7-day Trial` |
| 설명 (영어) | `Use every MediRemind feature free for 7 days.` |

> 이름은 지침상 **"N-day Trial"** 형식이어야 합니다.

### ② 정식 버전 상품

| 항목 | 값 |
|------|----|
| 유형 | **비소모성 (Non-Consumable)** |
| 참조 이름 | `MediRemind Full` |
| 제품 ID | **`com.csparkzxc.mediremind.full`** |
| 가격 | 예: ₩2,200 (미국 $1.99) |
| 표시 이름 (한국어) | `MediRemind 정식 버전` |
| 설명 (한국어) | `모든 기능을 평생 사용합니다. 1회 결제.` |
| 표시 이름 (영어) | `MediRemind Full Version` |
| 설명 (영어) | `Unlock every feature forever. One-time purchase.` |

두 상품 모두 **심사용 스크린샷 1장**(체험 안내 화면 또는 결제 화면)을 올리고, 상태가 "제출 준비 완료"가 되면
**첫 앱 버전 제출 화면의 "앱 내 구입" 섹션에서 둘 다 선택**해 함께 제출합니다.

## 심사 메모 (App Review Information → Notes)

```
MediRemind is a medication reminder app. All data stays on the device; there is no account or server.

Monetization (Guideline 3.1.1):
- On first launch the app shows the trial terms (7 days, what locks afterwards, the price)
  before the user taps "Start 7-day free trial", which purchases the free non-consumable
  "7-day Trial" (com.csparkzxc.mediremind.trial7).
- After 7 days the app shows a paywall offering the one-time non-consumable
  "MediRemind Full Version" (com.csparkzxc.mediremind.full). Restore Purchase is on the
  trial screen, the paywall, and in Settings.
- Medication reminders keep working after the trial ends.

To test: tap "Start 7-day free trial", add a medicine with a time 1-2 minutes ahead, and lock
the device. The reminder offers a "Mark taken" action.
```

## 샌드박스 테스트

사용자 및 액세스 → **샌드박스** → 테스트 계정 생성 → TestFlight 빌드에서:
- [ ] 첫 화면에서 "7일 무료 체험 시작" → ₩0 결제창 → 홈 진입, 상단 "7일 남음"
- [ ] 설정 → 정식 버전 → 구매 → 상단 배너 사라짐
- [ ] 앱 삭제 → 재설치 → 첫 화면에서 "구매 복원" → 바로 홈 진입

## 가격·체험 기간 변경

`src/purchase/purchase.config.ts`의 `trialDays`, `fallbackPriceLabel`을 수정합니다.
체험 일수를 바꾸면 체험 상품 이름과 ID도 맞춰 새로 만들어야 합니다(예: `14-day Trial`).
실제 가격은 App Store Connect에서 바꾸면 앱이 자동으로 반영합니다.

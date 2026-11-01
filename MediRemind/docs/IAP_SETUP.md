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
| 제품 ID | **`01`** (생성 후 변경 불가, 앱 코드와 일치해야 함) — 참조 이름은 com.csparkzxc.mediremind.full |
| 가격 | **₩1,900** (다른 나라는 Apple 자동 환산, 미국 약 $1.49) |
| **가족 공유** | 선택 사항. 켜려다 오류가 나서 결제 화면의 가족 공유 문구는 뺐음. 켜는 데 성공하면 `paywall.f3` 문구를 다시 바꿀 수 있음 |
| 표시 이름 (한국어) | `MediRemind 정식 버전` |
| 설명 (한국어) | `약을 무제한으로 등록합니다. 1회 결제.` |
| 표시 이름 (영어) | `MediRemind Full Version` |
| 설명 (영어) | `Add unlimited medicines. One-time purchase.` |
| 심사용 스크린샷 | 결제 화면 1장 (`docs/screenshots/iphone-6.9/ko-06.png` 사용 가능) |

상태가 "제출 준비 완료"가 되면 **첫 앱 버전 제출 화면의 "앱 내 구입" 섹션에서 선택**해 함께 제출합니다.

> 예전에 안내한 ₩0 체험 상품(`…trial7`)은 이제 필요 없습니다. 이미 만들었다면 지우거나 제출에서 빼세요.

## 심사 메모 (App Review Information → Notes)

```
MediRemind is a medication reminder app. All data stays on the device; there is no account or server.

Monetization: the app is free to use with up to 2 medicines. A one-time non-consumable
in-app purchase, "MediRemind Full Version" (product ID 01), removes the
limit. To see the paywall, add a third medicine. Restore Purchase is on the paywall and in
Settings.

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

## 1.3.0 · 가족 안심 플랜 (자동 갱신 구독)

보호자 알림(가족 지켜보기)은 서버 비용이 계속 들기 때문에 구독으로 분리했습니다. 약 무제한 등록은 그대로 일회성(`01`)입니다.

### App Store Connect에서 만들 것
1. **앱 › 수익화 › 구독 › 구독 그룹 만들기**
   - 참조 이름: `가족 안심 플랜`
   - 그룹 현지화(표시 이름): 한국어 `가족 안심 플랜`, 영어 `Family Plan` 등
2. 그룹 안에 구독 상품 2개. **제품 ID는 아래와 똑같이** 입력합니다(코드: `src/purchase/purchase.config.ts`의 `FAMILY_PLANS`).

   | 참조 이름 | 제품 ID | 기간 | 가격 (한국) |
   |---|---|---|---|
   | 가족 안심 플랜 연간 | `family_yearly` | 1년 | ₩12,000 근처 단계 |
   | 가족 안심 플랜 월간 | `family_monthly` | 1개월 | ₩1,500 근처 단계 |

   - 같은 그룹이라 한 사람은 둘 중 하나만 구독합니다(연간 ↔ 월간 전환은 Apple이 처리).
   - 구독 순위: 연간을 1순위(위)로 둡니다.
3. 각 상품 **구독 가격 › 기본 혜택(Introductory Offer) 만들기**
   - 유형: **무료**, 기간: **1주(7일)**, 모든 국가
   - 한 Apple ID는 그룹당 한 번만 체험할 수 있습니다. 앱은 `isEligibleForIntroOfferIOS`로 확인해서, 이미 체험한 사람에게는 "7일 무료" 대신 "구독하기"를 보여 줍니다.
4. 각 상품 현지화(표시 이름·설명)와 **심사용 스크린샷**(결제 화면 캡처) 1장씩 추가합니다.
5. **앱 정보 › 이용약관(EULA)**: 별도 약관이 없으면 Apple 표준 EULA를 사용합니다. 앱은 표준 EULA 링크를 보여 줍니다(`TERMS_URL`).
   - 앱 설명 맨 아래에도 `이용약관: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` 한 줄을 넣어야 심사에서 걸리지 않습니다.
6. 1.3.0 버전 제출 화면의 **인앱 구입 및 구독** 칸에 두 구독 상품을 함께 선택해서 제출합니다(첫 구독은 앱 버전과 같이 심사받아야 합니다).

### 기존 구매자 (1.2.0 이하에서 정식 버전 구매)
- 1.2.0 결제 화면에 "앞으로 추가되는 기능도 모두 포함"이라고 약속했기 때문에, `LEGACY_FULL_CUTOFF` 이전에 `01`을 산 사람은 가족 안심 플랜이 **평생 포함**됩니다.
- 판단 기준은 스토어 기록의 최초 구매일(`originalTransactionDateIOS`)입니다.
- **출시 전에 `LEGACY_FULL_CUTOFF`를 1.3.0 출시일로 바꿉니다.** 늦게 잡는 쪽이 안전합니다(1.2.0 화면을 보고 산 사람이 빠지면 안 되므로).

### 구독이 끝나면
- 앱이 서버의 내 push token을 지워서 서버가 더 이상 놓침 알림을 보내지 않습니다(`setAlertsAllowed`). 다시 구독하면 자동으로 다시 등록됩니다.
- 이미 연결된 가족 카드는 그대로 보이고, 위에 "알림이 멈췄어요 · 다시 시작하기" 안내가 나옵니다.

### 심사 메모에 추가할 문장
> 가족 안심 플랜(자동 갱신 구독, 7일 무료 체험)은 설정 › 앱 정보 › 가족 안심 플랜, 또는 설정 › 보호자 연결 › 가족 추가 › 가족 지켜보기에서 열 수 있습니다. 약 무제한 등록은 별도의 일회성 구매(정식 버전)입니다.

### 샌드박스 테스트
- 샌드박스에서 1년 구독은 1시간, 1개월은 5분, 1주 체험은 3분 만에 끝납니다. 만료 후 앱을 다시 열면 "알림이 멈췄어요" 안내가 나오는지 확인합니다.
- 설정 › 앱 정보에서 "무료 체험 중 · 날짜까지", "구독 관리"가 보이는지 확인합니다.

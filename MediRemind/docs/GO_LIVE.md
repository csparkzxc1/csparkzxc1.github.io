# 출시 체크리스트 (App Store)

> 이 앱은 **1.0.0이 이미 승인된 앱의 업데이트(1.1.0)**입니다.
> 버전 번호는 승인된 버전보다 커야 하고, 1.0.0이 아이패드를 지원했으므로 아이패드 지원(`supportsTablet: true`)을 유지해야 합니다.
> App Store Connect에서 **"+ 버전"으로 1.1.0을 새로 만들고**, "이번 버전의 새로운 기능"에 `STORE_LISTING.md`의 업데이트 노트를 넣으세요.

Apple 심사는 보통 24~48시간입니다. **목요일 밤까지 제출**하면 주말 출시가 가능합니다.
위에서부터 순서대로 체크하세요.

## 1. 개인정보처리방침 주소 열기 (폰)

- [ ] PR #1 합치기: https://github.com/csparkzxc1/csparkzxc1.github.io/pull/1 → **Merge pull request**
- [ ] 몇 분 뒤 열리는지 확인: https://csparkzxc1.github.io/MediRemind/legal/privacy.html
  - 계속 404면 저장소 **Settings → Pages**에서 배포 브랜치가 `master`인지 확인

## 2. 인앱결제 상품 (폰, App Store Connect)

`docs/IAP_SETUP.md` 참고. 상품은 **1개**입니다.

- [ ] 비소모성 `com.csparkzxc.mediremind.full`, 가격 **₩1,900**
- [ ] **가족 공유 켜기** (결제 화면에 "가족 공유로 최대 6명"이 적혀 있음)
- [ ] 한국어·영어 표시 이름/설명, 심사용 스크린샷 1장 (`docs/screenshots/iphone-6.9/ko-06.png`)
- [ ] (예전에 만든 ₩0 체험 상품 `…trial7`이 있으면 삭제)

## 3. 빌드 & 업로드 (맥)

```bash
cd ~/mediremind-repo/MediRemind
git pull
npm install
npm test                                        # "41 passed" 확인
eas build --platform ios --profile production   # 20~40분
eas submit --platform ios --profile production
```

- 빌드 번호는 10부터 자동으로 1씩 올라갑니다(`autoIncrement`). 빌드 후 바뀐 `app.json`은 커밋해 두세요.
- Apple 로그인·인증서 질문은 모두 **Y / Enter**.
- `eas submit` 후 10~30분 지나면 App Store Connect → TestFlight에 빌드가 보입니다.
  "수출 규정 준수" 질문은 앱 설정(`ITSAppUsesNonExemptEncryption: false`)으로 자동 처리됩니다.

## 4. TestFlight 확인 (폰)

TestFlight 앱으로 설치 후:

- [ ] 첫 실행 → 알림 허용 → 약 등록 → **1~2분 뒤 시간**으로 설정 → 앱 닫고 잠금 → 알림 울림
- [ ] 알림 길게 누르기 → **"복용 완료"** → 앱이 열리고 홈에서 체크 표시
- [ ] 5분 전 알림 설정 시 5분 일찍 울림
- [ ] 약 2개 등록 후 3번째 **"+"** → 결제 화면
- [ ] 샌드박스 계정으로 구매 → 3번째 약 등록됨, 설정에 "정식 버전 이용 중"
- [ ] 앱 삭제 → 재설치 → 설정 → **구매 복원**
- [ ] 다크 모드 / 영어 전환 후 화면과 알림 문구
- [ ] 백업 내보내기 → 백업 불러오기

> 샌드박스 계정: App Store Connect → 사용자 및 액세스 → **샌드박스** → 테스트 계정 추가.
> 아이폰 설정 → App Store → 맨 아래 **샌드박스 계정**에 로그인.

## 5. 앱 정보 입력 (App Store Connect → 앱)

| 위치 | 항목 | 값 |
|------|------|----|
| 앱 정보 | 이름 | `MediRemind - 약 복용 알리미` |
| 앱 정보 | 부제 | `복용 시간 알림과 복약 기록` |
| 앱 정보 | 카테고리 | 의료 (보조: 건강 및 피트니스) |
| 앱 정보 | 개인정보처리방침 URL | `https://csparkzxc1.github.io/MediRemind/legal/privacy.html` |
| 앱 정보 | 연령 등급 | 설문 전부 "없음" → **4+** |
| 앱 개인정보 보호 | 데이터 수집 | **"아니요, 데이터를 수집하지 않습니다"** |
| 가격 및 사용 가능 여부 | 앱 가격 | **무료** (돈은 앱 내 구입으로 받음) |
| 버전 | 프로모션 텍스트·설명·키워드 | `docs/STORE_LISTING.md` 복사 |
| 버전 | 지원 URL | `https://csparkzxc1.github.io/MediRemind/legal/index.html` |
| 버전 | 스크린샷 | `docs/screenshots/<기기>/ko-01~06.png` — iPhone 6.9"는 `iphone-6.9/`, 6.5"는 `iphone-6.5/`, iPad 13"는 `ipad-13/` (영어는 `en-…`) |
| 버전 | 빌드 | TestFlight에 올라온 빌드 선택 |
| 버전 | 앱 내 구입 | `MediRemind Full` 선택 |
| 버전 | 저작권 | `2026 csparkzxc1` |
| 버전 | 앱 심사 정보 → 메모 | `docs/IAP_SETUP.md`의 심사 메모 복사 |
| 버전 | 앱 심사 정보 → 로그인 필요 | **아니요** |
| 버전 | 버전 출시 | "이 버전을 자동으로 출시" (주말에 바로 나가게) |

영어 페이지를 추가하려면 오른쪽 위 언어 선택 → **영어(미국)** 추가 → `STORE_LISTING.md`의 English 부분과 `en-…` 스크린샷.

## 6. 심사 제출

- [ ] 버전 페이지 오른쪽 위 **"심사에 추가"** → **"심사에 제출"**
- [ ] 상태: 심사 대기 중 → 심사 중 → **판매 준비 완료** (보통 1~2일)

거절되면 Resolution Center의 사유를 그대로 붙여 주세요. 코드 문제면 고친 뒤 3번부터 다시 하면 됩니다.

## 7. 출시 후

- 화면·문구 수정은 `eas update --channel production --message "..."`로 심사 없이 바로 배포됩니다
  (네이티브 모듈이나 `app.json`을 바꾼 경우는 새 빌드 + 심사 필요).
- 가족 공유는 출시 후 실제 가족 폰으로 한 번 확인하세요(샌드박스에서는 확인이 어렵습니다).

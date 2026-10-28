# 출시 체크리스트 (App Store)

## 이번 주말 출시 일정

Apple 심사는 보통 24~48시간 걸립니다. **목요일 밤까지 제출**하면 주말 출시가 가능합니다.

| 언제 | 할 일 | 어디서 |
|------|------|------|
| 수 | PR #1 합치기 → 개인정보처리방침 주소 확인 | 폰 (GitHub) |
| 수 | 인앱결제 상품 2개 만들기 (`docs/IAP_SETUP.md`) | 폰 (App Store Connect) |
| 수 | `eas build --platform ios --profile production` | 맥 |
| 목 | `eas submit` → TestFlight 설치 → 아래 6번 확인 | 맥 → 폰 |
| 목 | 스토어 정보·스크린샷 입력, 상품 2개 선택 → **심사 제출** | 폰/맥 |
| 금~토 | 승인 → 출시 (수동 출시로 했으면 "출시" 버튼) | 폰 |

> 거절되면 사유를 그대로 붙여 주세요. 코드 문제면 수정 후 `eas build`로 다시 올리면 됩니다.

## 0. 작업 폴더를 저장소와 맞추기 (중요)

윈도우 PC의 `C:\Users\admin\MediRemind`는 저장소와 따로 수정된 폴더입니다. 이번 업데이트는
SDK 업그레이드·파일 구조 변경이 커서, **저장소를 새로 받아 그 폴더에서 빌드**하는 것이 안전합니다.

```powershell
cd C:\Users\admin
git clone -b claude/medication-reminder-app-hlZTA https://github.com/csparkzxc1/csparkzxc1.github.io.git mediremind-repo
cd mediremind-repo\MediRemind
npm install
npm test
```

> `app.json`의 `extra.eas.projectId`(2959d7e0…)와 `slug`(mediremind)가 EAS 프로젝트와 맞아야 합니다.
> 예전 윈도우 폴더에서 다른 프로젝트로 `eas init`을 했다면, 빌드 시 slug 불일치 오류가 납니다.
> 그때는 `app.json`의 `extra.eas` 블록을 지우고 `eas init`을 다시 실행하세요.

## 1. 빌드 번호

- `app.json` → `ios.buildNumber`는 **10**부터 시작합니다 (이전에 업로드한 빌드 번호보다 커야 함).
- `eas.json`의 production 프로필은 `autoIncrement: true`라서 빌드할 때마다 1씩 올라갑니다.
  빌드 후 바뀐 `app.json`은 커밋해 두세요.

## 2. 개인정보처리방침 URL

- 파일: `MediRemind/legal/privacy.html` (한국어 + 영어)
- 이 저장소(`csparkzxc1.github.io`)는 GitHub Pages 사이트입니다. 이 브랜치가 Pages를 배포하는 브랜치
  (보통 `master`)에 합쳐지면 아래 주소가 열립니다.
  - 개인정보처리방침: `https://csparkzxc1.github.io/MediRemind/legal/privacy.html`
  - 지원 페이지: `https://csparkzxc1.github.io/MediRemind/legal/index.html`
- 주소가 바뀌면 `src/config.ts`의 `PRIVACY_POLICY_URL`도 같이 바꾸세요.
- App Store Connect → 앱 정보 → 개인정보처리방침 URL, 버전 정보 → 지원 URL에 입력.

## 3. 앱 개인정보 보호 (App Privacy) 설문

- "데이터를 수집합니까?" → **아니요, 이 앱에서 데이터를 수집하지 않습니다.**
  (모든 데이터는 기기에만 저장, 광고·분석 SDK 없음)

## 4. 인앱결제

`docs/IAP_SETUP.md` 순서대로 상품 2개(₩0 체험 `…trial7`, 정식 버전 `…full`)를 만들고, 첫 제출에 둘 다 포함합니다.
심사 메모 문구도 그 문서에 있습니다.

## 5. 빌드 & 제출

```powershell
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

## 6. TestFlight에서 꼭 확인할 것

- [ ] 약 등록 → 지정 시간에 알림이 울림 (앱 종료 상태에서도)
- [ ] 알림 길게 누르기 → "복용 완료" → 앱이 열리고 홈에서 체크 표시
- [ ] 복용 시간 5분 전 알림 설정 시 5분 일찍 울림
- [ ] 다크 모드 / 영어 전환 후 화면과 알림 문구
- [ ] 백업 내보내기 → 앱 삭제·재설치 → 백업 불러오기
- [ ] 첫 실행 체험 안내 화면 → "7일 무료 체험 시작" → ₩0 결제창 → 홈
- [ ] 샌드박스 계정으로 정식 버전 구매 / 구매 복원
- [ ] (기기 날짜를 8일 뒤로 바꿔) 체험 종료 후 잠금 화면, 잠긴 상태에서도 알림 울림

## 7. 스토어 등록 정보

`docs/STORE_LISTING.md`의 문구를 붙여넣고, 스크린샷은 `npm run screenshots`로 만든
`docs/screenshots/*.png`를 사용하거나 실제 기기 캡처로 교체합니다.

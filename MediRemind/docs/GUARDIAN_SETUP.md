# 보호자 연결 설정 (Supabase)

부모님이 약을 30분 넘게 체크하지 않으면 자녀 폰으로 알림이 가는 기능입니다.
서버는 Supabase 무료 플랜으로 충분하고, 모든 단계를 폰 브라우저로 할 수 있습니다.

## 동작 방식

- 부모님(복용자) 앱: 초대 코드를 만들면, 그때부터 오늘~7일치 복용 예정 시각과 복용 여부를 서버에 올립니다.
- 자녀(보호자) 앱: 같은 MediRemind 앱에서 코드를 입력하면 연결되고, 부모님의 오늘 복용 현황을 볼 수 있습니다.
- 서버: 5분마다 "예정 시각 + 보호자가 정한 시간(5분·10분·15분·30분·1시간·2시간, 기본 30분)이 지났는데 안 먹은 약"을 찾아 그 보호자에게 푸시를 1번 보냅니다.
- 계정은 이름·이메일 없는 익명 계정이고, 기능을 쓰기 전에는 아무것도 서버로 가지 않습니다.
- `src/guardian/config.ts`의 URL·키가 비어 있으면 설정 화면에 메뉴 자체가 보이지 않습니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 GitHub 계정으로 가입합니다.
2. **New project**: 이름 `mediremind`, Region **Northeast Asia (Seoul)**, DB 비밀번호는 아무 강한 값(따로 보관).
3. **Authentication → Sign In / Providers**에서 **Allow anonymous sign-ins**를 켭니다.

## 2. 데이터베이스 만들기

1. **SQL Editor → New query**를 엽니다.
2. `MediRemind/supabase/guardian.sql` 전체를 붙여 넣고 **Run**합니다.
   (GitHub 앱/웹에서 파일을 열고 Raw 보기 → 전체 복사)
3. 다시 실행해도 안전합니다. SQL을 고친 뒤에는 그냥 다시 붙여 넣고 Run하면 됩니다.

## 3. 앱에 연결 정보 넣기

**Project Settings → API**(또는 Data API)에서 두 값을 복사합니다.

- Project URL (`https://xxxx.supabase.co`)
- `anon` / publishable key

`src/guardian/config.ts`의 `url`, `anonKey`에 넣습니다. 이 키는 앱에 들어가도 되는 공개 키이고,
데이터는 행 단위 보안(RLS)으로 본인과 연결된 가족만 볼 수 있습니다. **service_role 키는 절대 넣지 마세요.**

## 4. 푸시 알림 키 (보호자에게 알림 보내기)

Expo 푸시 서비스가 Apple에 알림을 보내려면 APNs 키가 필요합니다.

1. expo.dev → mediremind → **Credentials → iOS → com.csparkzxc.mediremind**에서
   **Push Notifications Key**가 있는지 봅니다. 있으면 끝입니다.
2. 없으면 developer.apple.com → Certificates, IDs & Profiles → **Keys → +** →
   Apple Push Notifications service (APNs) 체크 → 생성 → `.p8` 다운로드 →
   expo.dev Credentials 화면에서 업로드합니다. (맥북이면 `eas credentials`로도 가능)

## 5. 출시 전에 App Store Connect에서 할 일

- **앱 개인정보 보호**(App Privacy) 수정:
  - 건강 및 피트니스 → **건강**: 앱 기능, 사용자와 연결됨, 추적 안 함
  - 식별자 → **사용자 ID**: 앱 기능, 사용자와 연결됨, 추적 안 함
- 개인정보처리방침(`legal/privacy.html`)은 보호자 연결 내용이 반영돼 있습니다.
  기능을 출시할 때 이 브랜치를 master에 합쳐야 웹페이지에 반영됩니다.
- 심사 메모(App Review Information → Notes)에 테스트 방법을 적습니다:
  "Settings → Family alerts → Create invite code on device A, enter the code on device B.
  A missed dose (30 minutes past due, not checked) sends a push to device B."

## 6. 출시

새 서버 연동과 개인정보 항목이 생기므로 OTA 대신 **1.2.0 스토어 업데이트**로 냅니다.

1. `app.json`의 `version`을 `1.2.0`으로 올립니다.
2. `MediRemind/RELEASE` 파일을 만들거나 안의 숫자를 바꿔 push하면 Expo가 빌드와 App Store Connect 업로드까지 합니다.

## 비용

- Supabase 무료 플랜: DB 500MB, 월 활성 사용자 5만 명까지. 1주일간 아무 요청이 없으면 프로젝트가 일시 중지되지만,
  앱 사용자가 있으면 동기화와 5분 주기 작업이 계속 돌기 때문에 사실상 멈추지 않습니다.
- Expo 푸시: 무료.

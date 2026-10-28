# 홈 화면 위젯 (설계 메모, 미구현)

iOS 위젯은 Swift(WidgetKit)로 만든 별도 타깃이 필요해서, Expo 앱만으로는 바로 추가할 수 없습니다.
이번 업데이트에는 포함하지 않았고, 아래 순서로 추가할 수 있습니다.

## 표시할 내용

- 오늘 남은 복용 (예: "2/3 · 다음 21:00 종합비타민")
- 연속 복용 일수

## 구현 순서

1. `@bacons/apple-targets`로 `targets/widget` WidgetKit 타깃 추가 (EAS 빌드에서 자동 생성).
2. App Group(`group.com.csparkzxc.mediremind`)을 앱과 위젯 양쪽 entitlements에 추가.
3. 앱이 복용 기록을 바꿀 때마다(`doseStore.syncDoses`, `markDose`, `unmarkDose`) 오늘 요약을 JSON으로
   App Group 공유 저장소에 쓰고 `WidgetCenter.reloadAllTimelines()` 호출 (`react-native-shared-group-preferences`
   또는 작은 Expo 모듈).
4. 위젯은 그 JSON만 읽어서 표시. 위젯에서 "복용 완료"는 iOS 17 인터랙티브 위젯(App Intents)로 추가 가능.

예상 작업량: 위젯 표시만 1~2일, 위젯에서 체크까지 2~3일 (실기기 테스트 필요).

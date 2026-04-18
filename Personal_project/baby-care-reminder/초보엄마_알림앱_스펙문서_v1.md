# 초보엄마 수면·수유 알림 앱 — 스펙 문서 v1.0

> **문서 범위**: PRD §14에서 요청한 5개 산출물
> 1) 앱 이름 후보 5개  2) 홈 화면 컴포넌트 명세(Flutter + HTML/Tailwind)
> 3) 예측 알고리즘 의사코드  4) 온보딩 5단계  5) 소아과 감수 질문 10개
>
> **기준일**: 2026-04-18 / **작성자**: 30년차 앱 기획자 역할
> **연결 문서**: `초보엄마_알림앱_상세_프롬프트.md` (상위 PRD)

---

## 📑 목차

1. [앱 이름 후보 5개](#1-앱-이름-후보-5개)
2. [홈 화면 상세 컴포넌트 명세](#2-홈-화면-상세-컴포넌트-명세)
3. [예측 알고리즘 의사코드](#3-예측-알고리즘-의사코드)
4. [온보딩 5단계 플로우](#4-온보딩-5단계-플로우)
5. [소아과 전문의 감수 질문 10개](#5-소아과-전문의-감수-질문-10개)

---

## 1. 앱 이름 후보 5개

> **선정 기준**: ① 3~5음절 이내, 발음 쉬움 ② 초보엄마의 감정(불안→안심) 연상 ③ 상표 검색 결과 국내 선출원 없음(KIPRIS 기준 1차 확인 필요) ④ 영문·도메인 확보 가능성 ⑤ 경쟁 앱(베이비타임, 하기스, 마미톡)과 차별되는 어감

| 순위 | 이름 | 영문 | 의미·컨셉 | 장점 | 리스크 |
|---|---|---|---|---|---|
| ⭐ 1 | **토닥** | Todak | "토닥토닥" 달래는 의태어. 엄마가 아기를 재울 때·우는 엄마 자신을 위로할 때 모두 쓰이는 단어 | 2음절 초단명, 감성 최상, 로고 가능성 풍부, `todak.app` 도메인 확보 가능성 높음 | 동명 커피숍·브랜드 다수, 상표 카테고리 잘 잡아야 함 |
| 2 | **쑥쑥노트** | SsookSsook Note | "쑥쑥 자란다"의 긍정어 + 기록(노트) | 기록 중심 컨셉 명확, 학부모 친숙 | 기록앱처럼 들려 "예측·알림" 차별점이 희석 |
| 3 | **베베타임** | BebeTime | 아기(bébé) + 타임. 시간·타이밍이 핵심 가치임을 직관적으로 전달 | 앱의 기능(타이밍 예측)을 이름에 담음, 해외 확장 용이 | "베베"가 들어간 유사 브랜드 많음 |
| 4 | **오늘우리애** | Today Our Baby | "오늘 우리 아기의 하루는?"이라는 질문형 일상어 | 한국어 고유 정서, 타임라인 컨셉과 부합 | 5음절로 긴 편, 타이핑 불리 |
| 5 | **냠냠쿨쿨** | NyamNyam CoolCool | 먹는 의성어(냠냠) + 자는 의성어(쿨쿨) — 앱의 두 핵심 기능을 이름에 직결 | 기억 초강력, 귀여움, 아이가 있는 집 정서 | 다소 유치함, B2B·의료 연계 시 브랜드 격 저하 우려 |

**기획자 추천**: **① 토닥** 으로 진행. 2차 후보 **③ 베베타임**.
사유: ‘토닥’은 엄마가 아기에게 하는 행동이자 엄마 스스로가 받고 싶은 위로를 동시에 담고 있어, 이 앱의 핵심 감정 전제(“초보엄마는 위로가 필요하다”)와 정확히 일치합니다.

**다음 액션**:
- [ ] KIPRIS 상표 검색 (클래스 9·42·44)
- [ ] `.app / .kr / .com` 도메인 확보
- [ ] 사내 5명 블라인드 네이밍 테스트

---

## 2. 홈 화면 상세 컴포넌트 명세

### 2.1 레이아웃 구조 (8-column mobile grid, 16pt base)

```
┌─────────────────────────────────────┐
│  [A] StatusBar (다크모드 대응)        │  64pt
├─────────────────────────────────────┤
│  [B] BabyProfileHeader               │  72pt
├─────────────────────────────────────┤
│                                     │
│  [C] NextActionCard (히어로)          │  180pt
│                                     │
├─────────────────────────────────────┤
│  [D] QuickLogButtons (2x2 그리드)     │  200pt
├─────────────────────────────────────┤
│  [E] TodayTimeline                   │  120pt
├─────────────────────────────────────┤
│  [F] GentleTipCard (랜덤 노출)        │   80pt
└─────────────────────────────────────┘
│  [G] BottomTabBar                    │   56pt
└─────────────────────────────────────┘
```

### 2.2 컴포넌트별 사양

#### [B] BabyProfileHeader
| 속성 | 값 |
|---|---|
| 좌측 | 아이 아바타(48pt 원형, 업로드 없으면 이니셜) |
| 중앙 | 이름 16pt Bold / 보조텍스트 13pt Regular("생후 47일 · 1개월 16일") |
| 우측 | 가족 공유 인디케이터(연결된 사람 수), 탭 시 공유 화면 |
| 탭 액션 | 프로필 편집 모달 |

#### [C] NextActionCard — **핵심 히어로 컴포넌트**
| 속성 | 값 |
|---|---|
| 배경 | 시간대별 그라디언트 (새벽=남보라, 아침=연노랑, 낮=연하늘, 저녁=살구) |
| 상단 아이콘 | 상황별 (🍼/😴/💩) 32pt |
| 메인 문구 | `다음 수유 예상` — 14pt Medium, 투명도 80% |
| 강조 문구 | `오후 3:20 (약 35분 후)` — **28pt Bold**, 한 줄 고정 |
| 보조 문구 | `마지막 수유 2시간 25분 전 · 120ml` — 13pt Regular |
| 상태 뱃지(우상단) | 🟢정상 / 🟡주의 / 🔴경고 (알고리즘 출력에 따라) |
| 길게 누르기 | 예측 로직 설명 바텀시트 표시 (“왜 이렇게 예측했나요?”) |

#### [D] QuickLogButtons — 원탭 기록 2×2
| 버튼 | 색상 | 아이콘 | 라벨 | 탭 동작 | 길게 누르기 |
|---|---|---|---|---|---|
| 수유 | 파랑 #4A90E2 | 🍼 | 수유 | 시작 타이머 즉시 기록 | 수량·종류 상세 입력 |
| 수면 | 보라 #8B6FD8 | 😴 | 수면 | 시작 타이머 즉시 기록 | 낮잠/밤잠 선택 |
| 기저귀 | 노랑 #F5B841 | 💩 | 기저귀 | 즉시 기록 + 종류 선택 시트 | — |
| 목욕 | 청록 #4EC5B5 | 🛁 | 목욕 | 즉시 기록 | 수온·시간 입력 |

- 버튼 크기: 최소 88×88pt (Apple HIG 터치 타겟 최대치 — 수면부족 엄지 오조작 방지)
- 진행 중 상태: 버튼 테두리 2pt 펄스 애니메이션 + 경과 시간 카운터 표시

#### [E] TodayTimeline
- 24시간 가로 스트립, 현재 시각 기준 ±6시간 기본 표시
- 이벤트는 색상 도트로 표시, 탭하면 상세
- 두 손가락 핀치로 7일 뷰 확장

#### [F] GentleTipCard
- 하루 1~2회 랜덤 노출, 꺼두기 가능
- 예시: `“오늘도 수고 많으셨어요. 유찬이가 평균보다 잘 먹고 있어요.”`
- 산후우울 키워드 감지 시 보건복지부 1577-0199 안내 카드로 교체

#### [G] BottomTabBar
`홈 / 기록 / 가이드 / 공유 / 설정` 5탭, 아이콘 24pt + 라벨 10pt

### 2.3 Flutter 위젯 코드 (핵심 컴포넌트)

```dart
// lib/home/next_action_card.dart
class NextActionCard extends StatelessWidget {
  final PredictedAction action;
  const NextActionCard({super.key, required this.action});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: () => _showExplanation(context),
      child: Container(
        height: 180,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: _gradientForTime(DateTime.now()),
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [
            BoxShadow(blurRadius: 16, offset: Offset(0, 4),
                      color: Color(0x14000000)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(action.icon, style: const TextStyle(fontSize: 32)),
                _StatusBadge(level: action.alertLevel),
              ],
            ),
            const SizedBox(height: 12),
            Text(action.label, // "다음 수유 예상"
                style: TextStyle(fontSize: 14,
                    color: Colors.white.withOpacity(0.8))),
            const SizedBox(height: 4),
            Text(action.primaryText, // "오후 3:20 (약 35분 후)"
                style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white)),
            const Spacer(),
            Text(action.secondaryText, // "마지막 수유 2시간 25분 전 · 120ml"
                style: TextStyle(fontSize: 13,
                    color: Colors.white.withOpacity(0.9))),
          ],
        ),
      ),
    );
  }
}
```

### 2.4 HTML/Tailwind 프리뷰 (디자이너·마케팅 공유용)

```html
<section class="mx-4 my-2 rounded-[20px] p-5 h-[180px]
                bg-gradient-to-br from-amber-200 to-orange-300
                shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
  <div class="flex justify-between items-start">
    <span class="text-3xl">🍼</span>
    <span class="text-xs px-2 py-1 rounded-full bg-green-500/90
                 text-white font-medium">정상</span>
  </div>
  <p class="mt-3 text-sm text-white/80">다음 수유 예상</p>
  <p class="text-[28px] font-bold text-white leading-tight">
    오후 3:20 <span class="text-xl">(약 35분 후)</span>
  </p>
  <p class="mt-auto pt-4 text-[13px] text-white/90">
    마지막 수유 2시간 25분 전 · 120ml
  </p>
</section>
```

### 2.5 접근성 체크리스트

- [ ] 모든 아이콘에 semanticsLabel 부여 (스크린 리더 대응)
- [ ] 대비비 WCAG AAA(7:1) 충족
- [ ] 최소 터치 타겟 44×44pt (iOS HIG)
- [ ] 다크모드 / 야간 붉은색 모드 3가지 테마
- [ ] 한 손 조작 모드 (화면 하단 80% 내 모든 주요 액션 수행 가능)

---

## 3. 예측 알고리즘 의사코드

### 3.1 전역 상수

```pseudocode
CONST STANDARD_TABLE[month] = {
  feeding_interval_min,
  feeding_interval_max,
  awake_window_min,
  awake_window_max,
  max_safe_gap_hours,       // 이 시간 초과 시 경고
  daily_total_ml_min,
  daily_total_ml_max
}
// (PRD §4 표 값을 그대로 로드)

CONST ALPHA(month):
  if month <= 1: return 0.7   // 개인 데이터 부족 → 표준 가중
  if month <= 4: return 0.5
  else:          return 0.3   // 개인 패턴 우선
```

### 3.2 다음 수유 시각 예측

```pseudocode
FUNCTION predictNextFeeding(baby):
    last = getLastFeedingRecord(baby.id)
    IF last is NULL:
        RETURN { time: NOW + 2h, confidence: LOW, reason: "데이터 없음" }

    month = computeMonthAge(baby.birthDate)
    standard_interval = average(STANDARD_TABLE[month].feeding_interval)

    recent_intervals = getIntervalsBetweenFeedings(baby.id, lastNDays=7)
    IF recent_intervals.length >= 3:
        personal_avg = mean(recent_intervals)
    ELSE:
        personal_avg = standard_interval

    α = ALPHA(month)
    predicted_interval = α * standard_interval + (1 - α) * personal_avg

    predicted_time = last.endAt + predicted_interval
    gap_now = NOW - last.endAt

    // 경고 레벨 결정
    IF month <= 1 AND gap_now > 4h:
        alert = RED   // 탈수 위험
        message = "마지막 수유 후 4시간이 지났어요. 깨워서 수유해 주세요."
    ELSE IF gap_now > predicted_interval * 1.5:
        alert = YELLOW
    ELSE:
        alert = GREEN

    RETURN {
        time: predicted_time,
        confidence: computeConfidence(recent_intervals.length),
        alertLevel: alert,
        reason: buildReason(α, standard_interval, personal_avg)
    }
```

### 3.3 다음 수면 시각 예측

```pseudocode
FUNCTION predictNextSleep(baby):
    last_wake = getLastWakeTime(baby.id)
    month = computeMonthAge(baby.birthDate)
    window = averageAwakeWindow(month)  // 표 4.2 기준

    recent_windows = getRecentAwakeWindows(baby.id, lastNDays=7)
    IF recent_windows.length >= 3:
        personal_window = mean(recent_windows)
        α = ALPHA(month)
        window = α * window + (1 - α) * personal_window

    predicted_sleep = last_wake + window

    // 졸림 신호 경고
    sleep_cue_warning_time = predicted_sleep - 15min
    IF NOW >= sleep_cue_warning_time AND NOW < predicted_sleep:
        triggerNotification("😴 졸림 신호가 나올 시간이에요")

    RETURN { time: predicted_sleep, window_used: window }
```

### 3.4 이상 감지 (Anomaly Detection)

```pseudocode
FUNCTION detectAnomalies(baby):
    anomalies = []

    // 1. 수유 간격 이상
    last_interval = getLastFeedingInterval(baby)
    std_interval  = STANDARD_TABLE[month].feeding_interval_avg
    IF last_interval < std_interval * 0.5:
        anomalies.push("FEEDING_TOO_FREQUENT")
    IF last_interval > std_interval * 1.5 AND month <= 3:
        anomalies.push("FEEDING_TOO_SPARSE")

    // 2. 1일 총 수면 부족 (3일 연속)
    FOR day IN last3Days:
        total_sleep[day] = sumSleepHours(baby, day)
    IF ALL total_sleep[d] < STANDARD_TABLE[month].sleep_total_min * 0.7:
        anomalies.push("SLEEP_DEFICIT_3DAYS")

    // 3. 1일 총 분유량 상한 초과
    today_total = sumFormulaToday(baby)
    IF today_total > 1000ml:
        anomalies.push("OVERFEEDING_RISK")

    // 4. 기저귀 빈도 저하 (탈수 조기지표)
    wet_count_24h = countWetDiapers(baby, last24h)
    IF month <= 6 AND wet_count_24h < 6:
        anomalies.push("LOW_DIAPER_COUNT")

    RETURN anomalies
```

### 3.5 출력 신뢰도

```pseudocode
FUNCTION computeConfidence(sampleSize):
    IF sampleSize < 3:  RETURN LOW       // 표기: 별 1개
    IF sampleSize < 10: RETURN MEDIUM    // 별 2개
    ELSE:               RETURN HIGH      // 별 3개
```

> **UX 원칙**: 신뢰도가 LOW일 때는 카드에 "아직 데이터가 충분하지 않아요"를 명시하여, 예측을 과신하지 않도록 합니다.

---

## 4. 온보딩 5단계 플로우

> **목표**: 1분 30초 이내 완료. 수면부족 엄마의 인내심 한계를 고려.
> **원칙**: 각 단계는 **스킵 가능**, 기본값으로도 앱이 작동.

### Step 1 — 환영 & 핵심 가치 (10초)

| 요소 | 내용 |
|---|---|
| 헤드라인 | **"언제 먹이고, 언제 재울지 알려드릴게요"** |
| 비주얼 | 토닥토닥 달래는 손 일러스트 (아기 자는 모습) |
| 버튼 | `시작하기` (단 하나) |
| 스킵 | 없음 — 첫 화면만 필수 |

### Step 2 — 아이 정보 입력 (20초)

| 입력 필드 | 필수 | 기본값 |
|---|---|---|
| 이름(또는 태명) | ✅ | "우리아기" |
| 생년월일 | ✅ | 오늘 (신생아 가정) |
| 성별 | ⬜ | 선택 안 함 |
| 태어날 때 몸무게(선택) | ⬜ | — |

- 생년월일 선택 시 즉시 "생후 N일 · N개월" 자동 계산 노출
- `나중에 입력할게요` 링크 제공(생일만 필수)

### Step 3 — 수유 방식 & 현재 상태 (15초)

| 질문 | 옵션 |
|---|---|
| 어떻게 먹이고 있나요? | 🤱 모유 / 🍼 분유 / 🔀 혼합 / 🥄 이유식 |
| 마지막 수유는 언제였나요?(선택) | 방금 / 30분 전 / 1시간 전 / 직접 입력 / 모름 |
| 마지막으로 잔 것은 언제였나요?(선택) | 방금 / 자는 중 / 1시간 전 / 모름 |

> 이 정보로 **첫 예측 카드가 즉시 작동**합니다. 모르면 스킵해도 됨.

### Step 4 — 알림 설정 (15초)

| 항목 | 기본값 | 설명 |
|---|---|---|
| 수유 알림 | ✅ ON | 예상 10분 전 |
| 수면 알림 | ✅ ON | 졸림 신호 타이밍 |
| 밤 시간 방해금지 | 22:00~06:00 | 위젯만 업데이트 |
| 알림 톤 | 부드러운 차임 | 3종 중 선택 |

- iOS/Android 시스템 알림 권한 요청은 **이 단계 마지막에만** (거부 시 재요청 어려움 경고)

### Step 5 — 가족 공유(선택) & 완료 (30초)

| 요소 | 내용 |
|---|---|
| 메시지 | "남편·가족도 함께 기록하면 교대 수유가 쉬워져요" |
| 액션 | `카카오톡으로 초대` / `링크 복사` / `나중에 할게요` |
| 최종 CTA | **"토닥 시작하기"** |
| 이후 | 홈 화면으로 이동, 빈 상태(empty state)에 튜토리얼 오버레이 1회 노출 |

### 온보딩 드롭오프 지표

- Step별 완료율 트래킹 (목표: Step 2 완료 95%, Step 5 완료 70%)
- Step 3 스킵율 높으면 → 문구 개선 A/B 테스트

---

## 5. 소아과 전문의 감수 질문 10개

> **사용 목적**: 앱의 표준 수치·경고 문구·알고리즘이 임상적으로 안전한지 검증.
> **감수 대상**: 소아청소년과 전문의 2인 이상 (가능하면 신생아학·수면의학 각 1인).

---

**Q1. 월령별 수면·수유 표준값의 임상적 타당성**
PRD §4에 제시된 월령별(0~24개월) 수면 총량·수유 간격·1회 분유량 표가 대한소아청소년과학회 가이드 및 실제 외래 진료 기준에 부합합니까? 조정이 필요한 월령 구간과 수치를 구체적으로 지적해 주십시오.

**Q2. 신생아 4시간 경고의 안전성**
"0~1개월 아기가 마지막 수유 후 4시간 경과 시 깨워서 수유하세요"라는 경고 알림 기준이 적절합니까? 저체중아·조산아·황달 아기 등 예외 케이스에 대해 앱이 구분해야 할 추가 조건이 있습니까?

**Q3. 1일 분유량 상한(1,000ml)의 근거**
"1일 총 분유량 1,000ml 초과 시 과식 위험 경고"가 소아비만·간부담 측면에서 타당한 임계값입니까? 월령·체중에 따라 상한을 세분화해야 합니까?

**Q4. 체중 기반 분유량 계산식**
"체중(kg) × 150~200ml = 1일 권장 총량" 공식이 모든 월령에 적용 가능합니까? 모유수유아·혼합수유아에는 어떻게 보정해야 합니까?

**Q5. 낮잠 2시간 30분 초과 시 깨우기 권고**
"낮잠이 2시간 30분을 넘으면 깨우세요"라는 가이드가 모든 월령에 동일하게 적용되어야 합니까, 아니면 월령별로 차등이 필요합니까?

**Q6. 탈수·이상 신호 조기 감지 지표**
앱이 "24시간 내 소변 기저귀 6장 미만"을 탈수 조기 경고 지표로 사용하는 것이 적절합니까? 그 외 초보 부모가 포착 가능한 임상적 경고 신호 2~3가지를 추가로 권고해 주십시오.

**Q7. 수면교육 시작 시기 안내**
앱이 "4개월부터 수면교육 메시지 활성화" 설정을 하고 있습니다. 이 시점이 타당합니까? 조기 수면교육의 위험성 또는 지연 필요 케이스(역류성 식도염·체중 부족 등)를 경고해야 할 월령/상황은 무엇입니까?

**Q8. 이유식 시작·진행 속도 가이드**
"4~6개월 이유식 시작, 7~9개월 1일 2회, 10~12개월 1일 3회"의 권고 속도가 최신 알레르기·성장 가이드라인에 부합합니까? 특히 알레르기 유발 식품(계란·땅콩·우유 등) 도입 시점에 대한 앱 내 안내를 어떻게 해야 합니까?

**Q9. "정상/비정상" 판단을 대체할 문구 톤**
앱은 의료기기가 아니므로 "정상/비정상" 판단 대신 "평균 범위 내/외"라는 표현을 사용하고 있습니다. 초보 부모가 오해하지 않으면서도 필요한 경각심은 갖게 하는 **권장 문구·금지 문구** 예시를 주십시오.

**Q10. 소아과 상담 연계 트리거**
어떤 지표·패턴이 감지될 때 앱이 반드시 "소아과 진료를 받으세요"라고 안내해야 합니까? (예: 체중 증가 저조, 고열, 배변 색상 이상 등) 트리거 조건을 우선순위별로 10가지 이내로 정리해 주십시오.

---

### 감수 진행 방법(권장)

1. 위 질문지 + PRD 본문 + 본 스펙 문서를 PDF로 제공
2. 소아과 전문의 2인에게 별도 검토 의뢰 (편향 방지)
3. 각 질문당 서면 답변 + 1시간 인터뷰(필요 시 녹취)
4. 감수 결과를 본 문서 **부록 A**로 첨부하고, PRD §4 표준 수치에 직접 반영
5. 앱 내 "본 앱은 의학적 진단을 대체하지 않습니다" 고정 문구 옆에 감수 전문의 이름·면허번호 공개(동의 시)

---

## 🔗 연결 문서 & 다음 단계

| 단계 | 산출물 | 담당 | 기한 |
|---|---|---|---|
| ✅ 완료 | PRD 본문 | 기획 | — |
| ✅ 완료 | 스펙 문서 v1.0 (본 문서) | 기획 | — |
| ⏭️ 다음 | KIPRIS 상표 검색 · 도메인 확보 | 기획/법무 | +3일 |
| ⏭️ 다음 | Figma 고해상도 목업 (홈·기록·가이드) | 디자인 | +2주 |
| ⏭️ 다음 | 소아과 전문의 2인 감수 의뢰 | 기획 | +3주 |
| ⏭️ 다음 | Flutter 프로토타입 (홈 화면 + 원탭 기록) | 개발 | +4주 |
| ⏭️ 다음 | Closed Beta 모집 (초보엄마 30명) | 마케팅 | +8주 |

---

*© 2026 · 토닥 프로젝트 · 내부 참고용 · 외부 공유 금지*

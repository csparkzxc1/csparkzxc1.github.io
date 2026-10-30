/**
 * Builds App Store screenshots in every accepted iPhone/iPad size from mockup.html, each framed
 * under a headline, in every store language. Also writes docs/mockup-en.html.
 *   node scripts/store-screenshots.js          (all languages)
 *   node scripts/store-screenshots.js ja de    (only these)
 * Replace with real device captures if the app UI drifts from the mockup.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const ICON = fs.readFileSync(path.join(ROOT, 'assets/icon.png')).toString('base64');
// App Store Connect only accepts exact sizes per device slot.
const SIZES = [
  { dir: 'iphone-6.9', w: 1320, h: 2868 },
  { dir: 'iphone-6.7', w: 1290, h: 2796 },
  { dir: 'iphone-6.5', w: 1242, h: 2688 },
  { dir: 'iphone-6.3', w: 1206, h: 2622 },
  { dir: 'iphone-6.1', w: 1179, h: 2556 },
  { dir: 'ipad-13', w: 2064, h: 2752 },
];

// Index into the mockup's screens, plus the headline above it. Order is the
// App Store order: home, family alerts, list, form, calendar, dark, paywall.
const SHOTS = {
  ko: [
    [0, '약 먹을 시간,', '이제 놓치지 마세요'],
    [7, '약을 놓치면', '가족에게 알려 드려요'],
    [1, '내 약을 한눈에', '재처방 D-Day까지'],
    [2, '1일 6회까지', '시간·용량 자유롭게'],
    [3, '달력으로 보는', '복용 기록'],
    [6, '눈이 편한', '다크 모드'],
    [5, '약 2개까지 평생 무료,', '₩1,900이면 무제한'],
  ],
  en: [
    [0, 'Never miss', 'a dose again'],
    [7, 'Missed a dose?', 'Your family gets a heads-up'],
    [1, 'All your meds', 'with refill countdowns'],
    [2, 'Up to 6 doses a day,', 'any time, any amount'],
    [3, 'See your history', 'on a calendar'],
    [6, 'Easy on the eyes', 'in dark mode'],
    [5, 'Free for 2 medicines,', 'unlimited with one purchase'],
  ],
  ja: [
    [0, '飲み忘れを', 'もうしない'],
    [7, '飲み忘れたら', '家族にお知らせ'],
    [1, 'お薬をひと目で', '処方の残り日数も'],
    [2, '1日6回まで', '時間も量も自由に'],
    [3, 'カレンダーで', '服薬の記録'],
    [6, '目にやさしい', 'ダークモード'],
    [5, '2つまでずっと無料', '1回の購入で無制限'],
  ],
  'zh-Hans': [
    [0, '按时吃药', '不再忘记'],
    [7, '忘记吃药时', '家人会收到提醒'],
    [1, '所有药品', '一目了然'],
    [2, '每天最多6次', '时间剂量随心设'],
    [3, '日历查看', '服药记录'],
    [6, '护眼的', '深色模式'],
    [5, '2种药永久免费', '一次购买即无限'],
  ],
  'zh-Hant': [
    [0, '按時吃藥', '不再忘記'],
    [7, '忘了吃藥時', '家人會收到提醒'],
    [1, '所有藥品', '一目了然'],
    [2, '每天最多6次', '時間劑量自由設'],
    [3, '用日曆查看', '服藥紀錄'],
    [6, '護眼的', '深色模式'],
    [5, '2種藥永久免費', '一次購買即無上限'],
  ],
  es: [
    [0, 'Nunca olvides', 'una dosis'],
    [7, '¿Una dosis olvidada?', 'Tu familia recibe un aviso'],
    [1, 'Todos tus medicamentos', 'y avisos de receta'],
    [2, 'Hasta 6 tomas al día,', 'a tu hora y dosis'],
    [3, 'Tu historial', 'en un calendario'],
    [6, 'Cuida tu vista', 'con el modo oscuro'],
    [5, 'Gratis para 2 medicamentos,', 'ilimitado con un solo pago'],
  ],
  fr: [
    [0, 'Ne manquez plus', 'aucune prise'],
    [7, 'Une prise oubliée ?', 'Votre famille est prévenue'],
    [1, 'Tous vos médicaments', 'et vos renouvellements'],
    [2, "Jusqu'à 6 prises par jour,", 'à votre rythme'],
    [3, 'Votre historique', 'sur un calendrier'],
    [6, 'Reposant pour les yeux', 'avec le mode sombre'],
    [5, 'Gratuit pour 2 médicaments,', 'illimité en un seul achat'],
  ],
  de: [
    [0, 'Nie wieder', 'eine Einnahme vergessen'],
    [7, 'Einnahme verpasst?', 'Deine Familie erfährt es'],
    [1, 'Alle Medikamente', 'mit Rezept-Countdown'],
    [2, 'Bis zu 6× täglich,', 'Zeit und Dosis frei'],
    [3, 'Dein Verlauf', 'im Kalender'],
    [6, 'Augenschonend', 'im Dunkelmodus'],
    [5, '2 Medikamente gratis,', 'unbegrenzt mit einem Kauf'],
  ],
};

// New layout: two hero panels that run into each other, then single panels
// with an upright, fully visible phone. Languages without an entry here still
// use the panorama layout below.
//   hero: [mockup screen for panel 1, mockup screen for panel 2, headline lines,
//          index of the accented line]
//   singles: [mockup screen, small line, bold line, accented end of the bold line]
const STORY = {
  ko: {
    hero: [0, 3, ['복용 알림과 복약 기록,', '나와 내 가족,', '그리고 부모님을 위한', '약 복용 알리미'], 1],
    singles: [
      [7, '정해진 시간이 지나도 체크가 없으면', '가족에게 ', '바로 알림'],
      [8, '설정에서 손가락으로 쓱', '글씨 크기를 ', '원하는 만큼'],
      [1, '재처방 D-Day와 복용 일정까지', '내 약을 한눈에 ', '관리'],
      [2, '하루 6회, 0.5정부터 직접 입력까지', '복용 시간·용량 ', '자유롭게'],
      [6, '밤에도 눈부시지 않게', '눈이 편한 ', '다크 모드'],
    ],
  },
  en: {
    hero: [0, 3, ["Reminders and dose records", "for you, your family", "and your parents", "MediRemind"], 1],
    singles: [
      [7, "If a dose isn't checked on time", "Your family ", "gets alerted"],
      [8, "One swipe in Settings", "Text as large ", "as you like"],
      [1, "Refill countdowns and schedules", "All your meds ", "at a glance"],
      [2, "Up to 6 a day, from half a tablet", "Times and doses, ", "your way"],
      [6, "Easy on your eyes at night", "Comfortable ", "dark mode"],
    ],
  },
  ja: {
    hero: [0, 3, ["服薬リマインダーと記録", "自分と家族、", "そして両親のための", "お薬アラーム"], 1],
    singles: [
      [7, "時間を過ぎてもチェックがなければ", "家族に", "すぐお知らせ"],
      [8, "設定から指でスッと", "文字の大きさを", "自由に"],
      [1, "処方の残り日数と服薬予定まで", "お薬を", "ひと目で管理"],
      [2, "1日6回まで、0.5錠から直接入力も", "時間も量も", "自由に"],
      [6, "夜もまぶしくない", "目にやさしい", "ダークモード"],
    ],
  },
  'zh-Hans': {
    hero: [0, 3, ["服药提醒与记录", "为自己、为家人", "也为父母", "贴心吃药提醒"], 1],
    singles: [
      [7, "超过时间仍未打卡", "家人", "马上收到提醒"],
      [8, "在设置里轻轻一滑", "字体大小", "随心调"],
      [1, "处方到期与服药计划", "所有药品", "一目了然"],
      [2, "每天最多6次，半片也能设", "时间剂量", "自由设定"],
      [6, "夜里也不刺眼", "护眼的", "深色模式"],
    ],
  },
  'zh-Hant': {
    hero: [0, 3, ["服藥提醒與紀錄", "為自己、為家人", "也為爸媽", "貼心吃藥提醒"], 1],
    singles: [
      [7, "超過時間還沒打勾", "家人", "馬上收到通知"],
      [8, "在設定裡輕輕一滑", "文字大小", "隨心調"],
      [1, "回診日與服藥時間", "所有藥品", "一目了然"],
      [2, "每天最多6次，半顆也能設", "時間劑量", "自由設定"],
      [6, "夜裡也不刺眼", "護眼的", "深色模式"],
    ],
  },
  es: {
    hero: [0, 3, ["Recordatorios y registro", "para ti, tu familia", "y tus padres", "tu pastillero"], 1],
    singles: [
      [7, "Si una dosis no se marca a tiempo", "Tu familia ", "recibe un aviso"],
      [8, "Un gesto en Ajustes", "Texto tan grande ", "como quieras"],
      [1, "Recetas y horarios", "Tus medicamentos ", "de un vistazo"],
      [2, "Hasta 6 tomas, desde medio comprimido", "Horas y dosis ", "a tu medida"],
      [6, "Descansa la vista de noche", "Modo oscuro ", "para tus ojos"],
    ],
  },
  fr: {
    hero: [0, 3, ["Rappels et suivi des prises", "pour vous, votre famille", "et vos parents", "votre pilulier"], 1],
    singles: [
      [7, "Si une prise n'est pas cochée à l'heure", "Votre famille ", "est prévenue"],
      [8, "Un geste dans Réglages", "Un texte aussi grand ", "que vous voulez"],
      [1, "Renouvellements et horaires", "Vos médicaments ", "d'un coup d'œil"],
      [2, "Jusqu'à 6 prises, dès ½ comprimé", "Horaires et doses ", "à votre façon"],
      [6, "Reposant pour les yeux la nuit", "Le mode sombre ", "tout en douceur"],
    ],
  },
  de: {
    hero: [0, 3, ["Erinnerungen & Verlauf", "für dich, deine Familie", "und deine Eltern", "deine Pillen-Erinnerung"], 1],
    singles: [
      [7, "Wird eine Einnahme nicht abgehakt", "Deine Familie ", "erfährt es sofort"],
      [8, "Einmal wischen in Einstellungen", "Text so groß ", "wie du willst"],
      [1, "Rezept-Countdown und Zeitplan", "Medikamente ", "im Blick"],
      [2, "Bis zu 6× täglich, ab ½ Tablette", "Zeit und Dosis ", "ganz flexibel"],
      [6, "Angenehm für die Augen", "Bequemer ", "Dunkelmodus"],
    ],
  },
};

// Light device frame shared by every phone in the new layout.
const phoneFrame = (img, width, k, style = '') => `
  <div style="position:absolute;width:${width}px;padding:${22 * k}px;border-radius:${108 * k}px;
    background:linear-gradient(150deg,#FFFFFF 0%,#F1F3F8 55%,#E3E7F0 100%);
    box-shadow:inset 0 0 0 ${3 * k}px #DDE2EC,0 ${70 * k}px ${140 * k}px rgba(34,44,96,.20),0 ${16 * k}px ${40 * k}px rgba(34,44,96,.10);
    ${style}">
    <img src="data:image/png;base64,${img}" style="display:block;width:100%;border-radius:${88 * k}px">
  </div>`;

// Fonts per language (Google Fonts), so CJK text doesn't fall back to a bitmap face.
const FONTS = {
  ko: 'Noto Sans KR',
  ja: 'Noto Sans JP',
  'zh-Hans': 'Noto Sans SC',
  'zh-Hant': 'Noto Sans TC',
};
const fontFor = (lang) => FONTS[lang] || 'Noto Sans';
const fontLink = (lang) =>
  `https://fonts.googleapis.com/css2?family=${fontFor(lang).replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`;
const LATIN = new Set(['en', 'es', 'fr', 'de']);

// Mockup text → English. Longest matches are applied first.
const EN = {
  'MediRemind — App Mockup': 'MediRemind — App Mockup',
  '홈 · 내 약 · 약 등록 · 달력 · 설정 · 정식 버전 · 다크 모드': 'Today · Medicines · Add · History · Settings · Full Version · Dark Mode',
  '7월 6일 월요일': 'Monday, July 6',
  '오늘의 복용 현황': "Today's Doses",
  '오늘 복용 현황': "Today's progress",
  '무료 버전은 약 2개까지 등록할 수 있어요': 'The free version holds up to 2 medicines',
  '무료 버전 · 약 2개까지': 'Free version · up to 2 medicines',
  '₩1,900 한 번이면 무제한 · 탭하여 보기': 'Unlimited with one purchase · Tap to see',
  '탭하여 정식 버전 보기': 'Tap to see the full version',
  ' / 3회 완료': ' / 3 taken',
  '12일 연속 복용': '12-day streak',
  '재처방 임박 알림': 'Refill soon',
  '혈압약': 'Blood pressure',
  '오메가3': 'Omega-3',
  '종합비타민': 'Multivitamin',
  '수면유도제': 'Sleep aid',
  '타이레놀': 'Tylenol',
  '오전 8:00': '8:00 AM',
  '오후 1:00': '1:00 PM',
  '오후 9:00': '9:00 PM',
  '오후 11:00': '11:00 PM',
  '10분 전': '10 min early',
  '5분 전': '5 min early',
  '15분 전': '15 min early',
  '30분 전': '30 min early',
  '0.5정': '0.5 tab',
  '1.5정': '1.5 tab',
  '10정': '10 tab',
  '1정': '1 tab',
  '2정': '2 tab',
  '3정': '3 tab',
  '5정': '5 tab',
  '내 약 목록': 'My Medicines',
  '← 왼쪽으로 밀면 삭제': '← Swipe left to delete',
  '매일': 'Every day',
  '평일': 'Weekdays',
  '약 등록 / 수정': 'Add / Edit',
  '약 등록하기': 'Add medicine',
  '약 등록': 'Add Medicine',
  '기본 정보': 'Basics',
  '약 이름 *': 'Name *',
  '1회 복용량 * — 칩 + 직접입력': 'Dose per intake *',
  '직접입력': 'Custom',
  '1일 복용 횟수 * — 1~6회 + 직접': 'Times per day *',
  '복용 시간 — 탭하여 바로 입력': 'Dose times — tap to type',
  '복용 시간': 'Schedule',
  '1회': '1×', '2회': '2×', '3회': '3×', '4회': '4×', '5회': '5×', '6회': '6×',
  '직접': 'Custom',
  '알림 시간 조정': 'Reminder timing',
  '정시': 'On time',
  '복용 기록': 'History',
  '이번 달 87%': 'This month 87%',
  '2026년 7월': 'July 2026',
  '미복용': 'Missed',
  '복용': 'Taken',
  '오늘': 'Today',
  '이용권': 'Plan',
  '구매 복원': 'Restore purchase',
  '알림 소리': 'Sound',
  '화면': 'Display',
  '테마': 'Theme',
  '시스템': 'System',
  '라이트': 'Light',
  '다크 모드': 'Dark mode',
  '다크': 'Dark',
  '언어': 'Language',
  '데이터': 'Data',
  '백업 내보내기': 'Export backup',
  '파일로 저장 (iCloud·파일 앱)': 'Save as a file (iCloud, Files)',
  '백업 불러오기': 'Import backup',
  '기기 변경 시 복원': 'Restore on a new device',
  '설정': 'Settings',
  '알림': 'Notifications',
  'MediRemind 정식 버전': 'MediRemind Full Version',
  '정식 버전': 'Full Version',
  '약 무제한 등록 (무료 버전은 2개까지)': 'Unlimited medicines (free version: up to 2)',
  '한 번 결제로 평생 사용 · 자동 결제 없음': 'Pay once, keep it forever, never billed again',
  '같은 Apple ID라면 새 기기에서도 구매 복원': 'Restore on any device with the same Apple ID',
  '앞으로 추가되는 기능도 모두 포함': 'Includes every future feature',
  '1회 결제 · 구독 아님': 'One-time purchase, not a subscription',
  '₩1,900에 정식 버전 구매': 'Unlock the full version',
  '결제는 Apple ID로 처리됩니다.': 'Payment is handled by your Apple ID.',
  '사지 않아도 약 2개까지는 평생 무료예요.': 'Up to 2 medicines stay free forever.',
  // Family alerts screen
  '엄마님이 19:00 혈압약을(를) 아직 복용하지 않았어요.': "Mom hasn't taken her blood pressure pill (19:00) yet.",
  '💊 복용 확인이 필요해요': '💊 Missed dose',
  '복용 시간이 30분 지나도 체크하지 않으면 연결된 가족에게 알림이 가요.':
    'If a dose is still unchecked 30 minutes after its time, your linked family gets a notification.',
  '보호자 연결': 'Family alerts',
  '내가 돌보는 가족': 'Family I watch',
  '초대 코드': 'Invite code',
  '안 먹음': 'Missed',
  '예정': 'Upcoming',
  '지금': 'now',
  '엄마': 'Mom',
  '내 약': 'Meds',
  '달력': 'History',
  '홈': 'Today',
  '삭제': 'Delete',
  // Added with the current mockup ('=' keys match a whole text node only).
  '=오늘 복용': "Today",
  " / 3회 완료": " / 3 taken",
  "‹ 뒤로": "‹ Back",
  "1회 복용량 *": "Dose per intake *",
  "1일 복용 횟수 *": "Times per day *",
  "복용 시간 설정 * (24시간제)": "Dose times * (24-hour)",
  "복용 요일": "Days",
  "주말": "Weekends",
  "색상 태그": "Color",
  "=가족": "Family",
  "약을 놓치면 가족에게 알림": "Notify family when a dose is missed",
  "알림 테스트": "Test notification",
  "5초 뒤 테스트 알림을 보내요": "Sends a test reminder in 5 seconds",
  "글자 크기": "Text size",
  "=가": "A",
  "나중에": "Not now",
  "결제는 Apple ID로 처리됩니다. 정식 버전을 사지 않아도 약 2개까지는 알림·기록을 평생 무료로 쓸 수 있어요.": "Payment is handled by your Apple ID. Without it, reminders and history for up to 2 medicines stay free forever.",
  "정해진 복용 시간이 지나도 체크가 없으면 연결된 가족에게 알림이 가요. 알림 시점은 가족이 정할 수 있어요.": "If a dose is still unchecked after its time, your linked family gets a notification. They choose how soon.",
  "최근 2주": "Last 2 weeks",
  "복용률 89%": "89% taken",
  "6자리 코드": "6-digit code",
  "=연결": "Link",
  "오늘 드실 약을 잊지 않게 알려 드려요.": "We'll remind you when it's time for your medicine.",
  "=한국어": "English",
  // Calendar weekday headers (single characters, matched last).
  '일': 'S', '월': 'M', '화': 'T', '수': 'W', '목': 'T', '금': 'F', '토': 'S',
};

function translateInPage([map, lang]) {
  const keys = Object.keys(map)
    .filter((k) => !k.startsWith('='))
    .sort((a, b) => b.length - a.length);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    let text = node.nodeValue;
    if (!text.trim()) continue;
    const whole = map['=' + text.trim()];
    if (whole !== undefined) {
      node.nodeValue = text.replace(text.trim(), whole);
      continue;
    }
    // Replace via placeholders so translated output isn't re-matched.
    const hits = [];
    for (const k of keys) {
      if (text.includes(k)) {
        text = text.split(k).join(`\u0000${hits.length}\u0000`);
        hits.push(map[k]);
      }
    }
    node.nodeValue = text.replace(/\u0000(\d+)\u0000/g, (_, i) => hits[Number(i)]);
  }
  document.documentElement.lang = lang;
}

/** Keeps each headline on one line by shrinking it until it fits its box. */
function fitLines() {
  for (const el of document.querySelectorAll('.fit')) {
    el.style.whiteSpace = 'nowrap';
    let size = parseFloat(getComputedStyle(el).fontSize);
    // A block line overflows only when its text is wider than the line box;
    // allow a pixel for sub-pixel rounding so fitting lines aren't shrunk.
    while (el.scrollWidth > el.clientWidth + 1 && size > 10) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  }
}

async function renderStory(browser, lang, story, shot) {
  const [heroA, heroB, heroLines, accentLine] = story.hero;
  const imgs = {};
  for (const idx of [heroA, heroB, ...story.singles.map(([i]) => i)]) imgs[idx] ??= await shot(idx);
  const font = `'${fontFor(lang)}',sans-serif`;
  const bg = 'radial-gradient(120% 70% at 80% 100%,#DCE3FB 0%,transparent 60%),linear-gradient(180deg,#F8F9FD 0%,#EDF0F8 100%)';

  for (const { dir, w: W, h: H } of SIZES) {
    if (process.env.SIZE && process.env.SIZE !== dir) continue;
    const k = Math.min(W / 1290, H / 2796);
    const tk = W / H > 0.6 ? W / 1290 : k;
    const page = await browser.newPage({ viewport: { width: W * 2, height: H } });

    // Panels 1–2: one canvas, two tilted phones crossing the cut.
    const heroW = 860 * k;
    await page.setContent(`
      <html><head><link rel="stylesheet" href="${fontLink(lang)}"></head>
      <body style="margin:0;width:${W * 2}px;height:${H}px;overflow:hidden;position:relative;background:${bg};font-family:${font}">
        <div style="position:absolute;left:${110 * tk}px;width:${W - 220 * tk}px;top:${230 * k}px;font-size:${(LATIN.has(lang) ? 84 : 104) * tk}px;font-weight:800;
          line-height:1.42;letter-spacing:${-2 * tk}px;color:#2A2F45">
          ${heroLines.map((l, i) => `<div class="fit" style="color:${i === accentLine ? '#4A6CF7' : '#2A2F45'}">${l}</div>`).join('')}
        </div>
        <div style="position:absolute;left:${110 * tk}px;bottom:${190 * k}px;display:flex;align-items:center;gap:${26 * tk}px">
          <img src="data:image/png;base64,${ICON}" style="width:${120 * tk}px;height:${120 * tk}px;border-radius:${28 * tk}px;
            box-shadow:0 ${8 * k}px ${24 * k}px rgba(40,52,120,.2)">
          <span style="font-size:${84 * tk}px;font-weight:800;color:#2A2F45;letter-spacing:${-2 * tk}px">MediRemind</span>
        </div>
        <!-- Same-size pair: the second phone overlaps the first across the cut. -->
        ${phoneFrame(imgs[heroA], heroW, k, `left:${W * 0.5}px;top:${H * 0.44}px;transform:rotate(-20deg);transform-origin:0 0`)}
        ${phoneFrame(imgs[heroB], heroW, k, `left:${W * 0.86}px;top:${H * 0.34}px;transform:rotate(-20deg);transform-origin:0 0`)}
      </body></html>`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(fitLines);
    for (let n = 0; n < 2; n++) {
      await page.screenshot({ path: path.join(OUT, dir, `${lang}-0${n + 1}.png`), clip: { x: n * W, y: 0, width: W, height: H } });
    }

    // Panels 3+: headline on top, the whole phone upright below.
    await page.setViewportSize({ width: W, height: H });
    for (const [n, [idx, small, bold, accent]] of story.singles.entries()) {
      // Below the two headline lines, whatever their scale.
      const top = 170 * k + (62 * 1.3 + 14 + 96 * 1.3) * tk + 110 * k;
      const phoneW = Math.min(860 * k, ((H - top - 150 * k) / 2.19));
      await page.setContent(`
        <html><head><link rel="stylesheet" href="${fontLink(lang)}"></head>
        <body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${bg};font-family:${font}">
          <div style="position:absolute;left:0;right:0;top:${170 * k}px;text-align:center;padding:0 ${80 * tk}px">
            <div class="fit" style="font-size:${(LATIN.has(lang) ? 50 : 62) * tk}px;font-weight:500;color:#4A5068;letter-spacing:${-1 * tk}px">${small}</div>
            <div class="fit" style="margin-top:${14 * k}px;font-size:${(LATIN.has(lang) ? 78 : 96) * tk}px;font-weight:800;color:#1A1D2B;letter-spacing:${-3 * tk}px">
              ${bold}<span style="color:#4A6CF7">${accent}</span></div>
          </div>
          ${phoneFrame(imgs[idx], phoneW, k, `left:${(W - phoneW) / 2}px;top:${top}px`)}
        </body></html>`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
    await page.evaluate(fitLines);
      await page.screenshot({ path: path.join(OUT, dir, `${lang}-0${n + 3}.png`) });
    }
    await page.close();
    console.log('wrote', lang, dir);
  }
}

(async () => {
  for (const size of SIZES) fs.mkdirSync(path.join(OUT, size.dir), { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));

  const MAPS = { en: EN, ...require('./screenshot-i18n') };
  // The sandbox reaches Google Fonts only through the proxy.
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ proxy });
  const only = process.argv.slice(2);
  for (const lang of Object.keys(SHOTS)) {
    if (only.length && !only.includes(lang)) continue;
    const mock = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 3000, height: 1000 } });
    await mock.goto('file://' + path.join(ROOT, 'mockup.html'));
    if (lang !== 'ko') await mock.evaluate(translateInPage, [MAPS[lang], lang]);
    if (lang === 'en') {
      fs.writeFileSync(path.join(ROOT, 'docs/mockup-en.html'), await mock.content());
      console.log('wrote docs/mockup-en.html');
    }
    await mock.addStyleTag({ url: fontLink(lang) });
    await mock.addStyleTag({
      content: `.screen-label{display:none}.screen{border-radius:0}
        body,body *{font-family:'${fontFor(lang)}','Noto Color Emoji',sans-serif !important}
        ${lang === 'ko' ? '' : '.pw-price{display:none}'}`,
    });
    await mock.waitForLoadState('networkidle');
    await mock.evaluate(() => document.fonts.ready);
    const screens = await mock.locator('.screen').all();
    if (STORY[lang]) {
      // The store frame replaces the mockup's status bar and notch.
      await mock.addStyleTag({ content: '.notch,.status,.pw-status{display:none}.push{top:10px}' });
      const shot = async (idx) => (await screens[idx].screenshot()).toString('base64');
      await renderStory(browser, lang, STORY[lang], shot);
      await mock.close();
      continue;
    }
    const shots = [];
    for (const [idx] of SHOTS[lang]) shots.push((await screens[idx].screenshot()).toString('base64'));

    for (const { dir, w: W, h: H } of SIZES) {
      if (process.env.SIZE && process.env.SIZE !== dir) continue;
      // All shots are drawn on one wide canvas and cut into panels, so each
      // tilted phone runs across into the next screenshot when swiping.
      const N = SHOTS[lang].length;
      const k = Math.min(W / 1290, H / 2796);
      // iPad canvases are much wider than tall: bigger type and phone, and the
      // phone sits further inside its panel.
      const tablet = W / H > 0.6;
      const tk = tablet ? W / 1290 : k;
      const phoneW = (tablet ? 1180 : 1060) * k;
      const overhang = tablet ? 0.35 : 0.62;
      const size = (LATIN.has(lang) ? 92 : 104) * tk;
      const panels = SHOTS[lang]
        .map(([, l1, l2], n) => {
          const left = n * W + (n === N - 1 ? (W - phoneW) / 2 + 60 * k : W - phoneW * (1 - overhang) - (tablet ? 160 * k : 0));
          return `
            <div style="position:absolute;left:${n * W + 96 * tk}px;top:${200 * k}px;width:${W - 192 * tk}px;
              font-size:${size}px;font-weight:800;letter-spacing:${-2 * k}px;line-height:1.28;color:#1A1D2B;
              text-wrap:balance">${l1}<br><span style="color:#4A6CF7">${l2}</span></div>
            <div style="position:absolute;left:${left}px;top:${H * (tablet ? 0.3 : 0.33)}px;width:${phoneW}px;
              transform:rotate(-8deg);transform-origin:50% 0;
              border-radius:${80 * k}px;overflow:hidden;background:#0d0f17;padding:${16 * k}px;
              box-shadow:0 ${50 * k}px ${140 * k}px rgba(40,52,120,.28),0 ${10 * k}px ${30 * k}px rgba(40,52,120,.12);">
              <img src="data:image/png;base64,${shots[n]}" style="display:block;width:100%;border-radius:${64 * k}px">
            </div>`;
        })
        .join('');
      // Soft blobs centred on the cuts tie the panels together.
      const blobs = Array.from({ length: N }, (_, n) =>
        `radial-gradient(${W * 0.7}px ${H * 0.45}px at ${(n + 1) * W}px ${H * (n % 2 ? 0.35 : 0.7)}px,rgba(91,124,250,.16),transparent 70%)`
      ).join(',');
      const frame = await browser.newPage({ viewport: { width: W * N, height: H } });
      await frame.setContent(`
        <html><head><link rel="stylesheet" href="${fontLink(lang)}"></head>
        <body style="margin:0;width:${W * N}px;height:${H}px;overflow:hidden;position:relative;
          background:${blobs},linear-gradient(180deg,#F7F8FD,#E9EDFB);
          font-family:'${fontFor(lang)}',sans-serif;">
          ${panels}
          <div style="position:absolute;left:${96 * tk}px;bottom:${150 * tk}px;display:flex;align-items:center;gap:${24 * tk}px">
            <img src="data:image/png;base64,${ICON}" style="width:${110 * tk}px;height:${110 * tk}px;border-radius:${26 * tk}px;
              box-shadow:0 ${8 * tk}px ${24 * tk}px rgba(40,52,120,.2)">
            <span style="font-size:${64 * tk}px;font-weight:800;color:#1A1D2B;letter-spacing:${-1 * tk}px">MediRemind</span>
          </div>
        </body></html>`);
      await frame.waitForLoadState('networkidle');
      await frame.evaluate(() => document.fonts.ready);
      for (let n = 0; n < N; n++) {
        const file = path.join(OUT, dir, `${lang}-0${n + 1}.png`);
        await frame.screenshot({ path: file, clip: { x: n * W, y: 0, width: W, height: H } });
      }
      await frame.close();
      console.log('wrote', lang, dir);
    }
    await mock.close();
  }
  await browser.close();
})();

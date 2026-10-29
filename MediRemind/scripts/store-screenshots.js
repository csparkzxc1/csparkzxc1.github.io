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
  '한국어': '한국어',
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
  // Calendar weekday headers (single characters, matched last).
  '일': 'S', '월': 'M', '화': 'T', '수': 'W', '목': 'T', '금': 'F', '토': 'S',
};

function translateInPage([map, lang]) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    let text = node.nodeValue;
    if (!text.trim()) continue;
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
    const shots = [];
    for (const [idx] of SHOTS[lang]) shots.push((await screens[idx].screenshot()).toString('base64'));

    for (const { dir, w: W, h: H } of SIZES) {
      // All shots are drawn on one wide canvas and cut into panels, so each
      // tilted phone runs across into the next screenshot when swiping.
      const N = SHOTS[lang].length;
      const k = Math.min(W / 1290, H / 2796);
      const phoneW = 1060 * k;
      const size = (LATIN.has(lang) ? 92 : 104) * k;
      const panels = SHOTS[lang]
        .map(([, l1, l2], n) => {
          const left = n * W + (n === N - 1 ? (W - phoneW) / 2 + 60 * k : W - phoneW * 0.62);
          return `
            <div style="position:absolute;left:${n * W + 96 * k}px;top:${200 * k}px;width:${W - 192 * k}px;
              font-size:${size}px;font-weight:800;letter-spacing:${-2 * k}px;line-height:1.28;color:#1A1D2B;
              text-wrap:balance">${l1}<br><span style="color:#4A6CF7">${l2}</span></div>
            <div style="position:absolute;left:${left}px;top:${H * 0.33}px;width:${phoneW}px;
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
          <div style="position:absolute;left:${96 * k}px;bottom:${150 * k}px;display:flex;align-items:center;gap:${24 * k}px">
            <img src="data:image/png;base64,${ICON}" style="width:${110 * k}px;height:${110 * k}px;border-radius:${26 * k}px;
              box-shadow:0 ${8 * k}px ${24 * k}px rgba(40,52,120,.2)">
            <span style="font-size:${64 * k}px;font-weight:800;color:#1A1D2B;letter-spacing:${-1 * k}px">MediRemind</span>
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

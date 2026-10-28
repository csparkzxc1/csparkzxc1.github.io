/**
 * Builds App Store screenshots in every accepted iPhone/iPad size from mockup.html, each framed
 * under a headline, in Korean and English. Also writes docs/mockup-en.html.
 *   node scripts/store-screenshots.js
 * Replace with real device captures if the app UI drifts from the mockup.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/screenshots');
// App Store Connect only accepts exact sizes per device slot.
const SIZES = [
  { dir: 'iphone-6.9', w: 1320, h: 2868 },
  { dir: 'iphone-6.7', w: 1290, h: 2796 },
  { dir: 'iphone-6.5', w: 1242, h: 2688 },
  { dir: 'ipad-13', w: 2064, h: 2752 },
];

// Index into the mockup's screens, plus the headline above it.
const SHOTS = {
  ko: [
    [0, '약 먹을 시간,', '이제 놓치지 마세요'],
    [1, '내 약을 한눈에', '재처방 D-Day까지'],
    [2, '1일 6회까지', '시간·용량 자유롭게'],
    [3, '달력으로 보는', '복용 기록'],
    [6, '눈이 편한', '다크 모드'],
    [5, '약 2개까지 평생 무료,', '₩1,900이면 무제한'],
  ],
  en: [
    [0, 'Never miss', 'a dose again'],
    [1, 'All your meds', 'with refill countdowns'],
    [2, 'Up to 6 doses a day,', 'any time, any amount'],
    [3, 'See your history', 'on a calendar'],
    [6, 'Easy on the eyes', 'in dark mode'],
    [5, 'Free for 2 medicines,', 'unlimited for $1.49'],
  ],
};

// Mockup text → English. Longest matches are applied first.
const EN = {
  'MediRemind — App Mockup': 'MediRemind — App Mockup',
  '홈 · 내 약 · 약 등록 · 달력 · 설정 · 정식 버전 · 다크 모드': 'Today · Medicines · Add · History · Settings · Full Version · Dark Mode',
  '7월 6일 월요일': 'Monday, July 6',
  '오늘의 복용 현황': "Today's Doses",
  '오늘 복용 현황': "Today's progress",
  '무료 버전은 약 2개까지 등록할 수 있어요': 'The free version holds up to 2 medicines',
  '무료 버전 · 약 2개까지': 'Free version · up to 2 medicines',
  '₩1,900 한 번이면 무제한 · 탭하여 보기': 'Unlimited for $1.49, once · Tap to see',
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
  '가족 공유로 최대 6명이 함께 사용': 'Family Sharing: up to 6 family members',
  '앞으로 추가되는 기능도 모두 포함': 'Includes every future feature',
  '1회 결제 · 구독 아님': 'One-time purchase, not a subscription',
  '₩1,900에 정식 버전 구매': 'Unlock for $1.49',
  '₩1,900': '$1.49',
  '결제는 Apple ID로 처리됩니다.': 'Payment is handled by your Apple ID.',
  '사지 않아도 약 2개까지는 평생 무료예요.': 'Up to 2 medicines stay free forever.',
  '내 약': 'Meds',
  '달력': 'History',
  '홈': 'Today',
  '삭제': 'Delete',
  // Calendar weekday headers (single characters, matched last).
  '일': 'S', '월': 'M', '화': 'T', '수': 'W', '목': 'T', '금': 'F', '토': 'S',
};

function translateInPage(map) {
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
  document.documentElement.lang = 'en';
}

(async () => {
  for (const size of SIZES) {
    const dir = path.join(OUT, size.dir);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));

  const browser = await chromium.launch();
  for (const lang of Object.keys(SHOTS)) {
    const mock = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 2600, height: 1000 } });
    await mock.goto('file://' + path.join(ROOT, 'mockup.html'));
    if (lang === 'en') {
      await mock.evaluate(translateInPage, EN);
      fs.writeFileSync(path.join(ROOT, 'docs/mockup-en.html'), await mock.content());
      console.log('wrote docs/mockup-en.html');
    }
    await mock.addStyleTag({ content: '.screen-label{display:none}.screen{border-radius:0}' });
    const screens = await mock.locator('.screen').all();
    const shots = [];
    for (const [idx] of SHOTS[lang]) shots.push((await screens[idx].screenshot()).toString('base64'));

    for (const { dir, w: W, h: H } of SIZES) {
      // Layout is designed at 1290x2796 and scaled to fit; wide iPad canvases
      // keep the phone centered.
      const k = Math.min(W / 1290, H / 2796);
      const frame = await browser.newPage({ viewport: { width: W, height: H } });
      for (const [n, [, l1, l2]] of SHOTS[lang].entries()) {
        await frame.setContent(`
          <html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;
            background:linear-gradient(160deg,#5B7CFA,#3B55E0);
            font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
            <div style="padding:${190 * k}px ${70 * k}px 0;color:#fff;text-align:center;">
              <div style="font-size:${(lang === 'en' ? 88 : 96) * k}px;font-weight:800;letter-spacing:${-2 * k}px;line-height:1.2">${l1}<br>${l2}</div>
            </div>
            <div style="position:absolute;left:50%;top:${640 * k}px;transform:translateX(-50%);
              width:${1000 * k}px;border-radius:${72 * k}px;overflow:hidden;
              border:${18 * k}px solid #0d0f17;box-shadow:0 ${40 * k}px ${120 * k}px rgba(0,0,0,.45);">
              <img src="data:image/png;base64,${shots[n]}" style="display:block;width:100%">
            </div>
          </body></html>`);
        const file = path.join(OUT, dir, `${lang}-0${n + 1}.png`);
        await frame.screenshot({ path: file });
      }
      await frame.close();
      console.log('wrote', lang, dir);
    }
    await mock.close();
  }
  await browser.close();
})();

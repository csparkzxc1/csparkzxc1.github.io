/**
 * Builds 6.9" App Store screenshots (1290×2796) from the screens in
 * mockup.html, each framed under a headline.
 *   node scripts/store-screenshots.js
 * Replace with real device captures if the app UI drifts from the mockup.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const W = 1290;
const H = 2796;

const HEADLINES = [
  ['약 먹을 시간,', '이제 놓치지 마세요'],
  ['내 약을 한눈에', '재처방 D-Day까지'],
  ['1일 6회까지', '시간·용량 자유롭게'],
  ['달력으로 보는', '복용 기록'],
  ['광고 없이,', '내 폰에만 저장'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const mock = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 1900, height: 1000 } });
  await mock.goto('file://' + path.join(ROOT, 'mockup.html'));
  await mock.addStyleTag({ content: '.screen-label{display:none}.screen{border-radius:0}' });
  const screens = await mock.locator('.screen').all();

  const frame = await browser.newPage({ viewport: { width: W, height: H } });
  for (let i = 0; i < screens.length && i < HEADLINES.length; i++) {
    const shot = (await screens[i].screenshot()).toString('base64');
    const [l1, l2] = HEADLINES[i];
    await frame.setContent(`
      <html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;
        background:linear-gradient(160deg,#5B7CFA,#3B55E0);
        font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
        <div style="padding:190px 80px 0;color:#fff;text-align:center;">
          <div style="font-size:96px;font-weight:800;letter-spacing:-2px;line-height:1.2">${l1}<br>${l2}</div>
        </div>
        <div style="position:absolute;left:50%;top:640px;transform:translateX(-50%);
          width:1000px;border-radius:72px;overflow:hidden;
          border:18px solid #0d0f17;box-shadow:0 40px 120px rgba(0,0,0,.45);">
          <img src="data:image/png;base64,${shot}" style="display:block;width:100%">
        </div>
      </body></html>`);
    const file = path.join(OUT, `ko-0${i + 1}.png`);
    await frame.screenshot({ path: file });
    console.log('wrote', path.relative(ROOT, file));
  }
  await browser.close();
})();

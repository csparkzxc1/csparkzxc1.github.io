/**
 * Builds docs/design-assets.html: every icon, color token, control and card
 * the app uses, with the PNG assets and the Ionicons font inlined so the file
 * opens on its own.
 *   node scripts/design-sheet.js
 * Values mirror src/theme/theme.ts and the screen StyleSheets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ION = path.join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons');
const glyphs = require(path.join(ION, 'glyphmaps/Ionicons.json'));
const font = fs.readFileSync(path.join(ION, 'Fonts/Ionicons.ttf')).toString('base64');
const png = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', f)).toString('base64');

const ic = (name, extra = '') => {
  if (!(name in glyphs)) throw new Error('unknown icon ' + name);
  return `<i class="ion" ${extra}>&#${glyphs[name]};</i>`;
};

const LIGHT = {
  bg: '#F4F6FB', surface: '#FFFFFF', surfaceMuted: '#EBEEF6', inputBg: '#F4F6FB',
  text: '#1A1D2B', textMuted: '#8A91A8', textFaint: '#A9B0C5', line: '#E5E8F0',
  brand: '#4A6CF7', brandSoft: '#EDF1FE', brandBorder: '#DCE3FD', onBrand: '#FFFFFF',
  success: '#10B981', warning: '#F59E0B', warningSoft: '#FFFBEB', warningText: '#92400E',
  danger: '#EF4444', dangerSoft: 'rgba(239,68,68,0.12)', chipBorder: '#DDE1EA',
};
const DARK = {
  bg: '#0B0D14', surface: '#161A26', surfaceMuted: '#232838', inputBg: '#1E2333',
  text: '#F3F5FA', textMuted: '#9AA1B5', textFaint: '#5D6479', line: '#2A3042',
  brand: '#6B86FF', brandSoft: 'rgba(107,134,255,0.16)', brandBorder: 'rgba(107,134,255,0.35)', onBrand: '#FFFFFF',
  success: '#34D399', warning: '#FBBF24', warningSoft: 'rgba(251,191,36,0.12)', warningText: '#FCD34D',
  danger: '#F87171', dangerSoft: 'rgba(248,113,113,0.16)', chipBorder: '#323A50',
};
const TAGS = ['#4A6CF7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];
const TOKEN_NOTES = {
  bg: '화면 배경', surface: '카드·탭바', surfaceMuted: '트랙·비활성 채움', inputBg: '입력칸·칩 배경',
  text: '본문', textMuted: '보조 문구', textFaint: '플레이스홀더·완료 취소선', line: '구분선',
  brand: '주요 색 (버튼·선택)', brandSoft: '선택 칩 배경', brandBorder: '시간 입력 테두리', onBrand: '브랜드 위 글자',
  success: '복용 완료', warning: '재처방 임박', warningSoft: '경고 배너 배경', warningText: '경고 글자',
  danger: '삭제·미복용', dangerSoft: '위험 아이콘 배경', chipBorder: '칩 테두리',
};

// MaterialCommunityIcons "pill" (tab bar, medicine cards, empty states).
const pill = (size = '1.15em') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align:-.15em"><path fill="currentColor" d="M4.22,11.29L11.29,4.22C13.64,1.88 17.43,1.88 19.78,4.22C22.12,6.56 22.12,10.36 19.78,12.71L12.71,19.78C10.36,22.12 6.56,22.12 4.22,19.78C1.88,17.43 1.88,13.64 4.22,11.29M5.64,12.71C4.59,13.75 4.24,15.24 4.6,16.57L10.59,10.59L14.83,14.83L18.36,11.29C19.93,9.73 19.93,7.2 18.36,5.64C16.8,4.07 14.27,4.07 12.71,5.64L5.64,12.71Z"/></svg>`;

const vars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v};`).join('');

const tokenRows = Object.keys(LIGHT)
  .map(
    (k) => `<tr><td><code>${k}</code></td>
      <td><span class="sw" style="background:${LIGHT[k]}"></span><code>${LIGHT[k]}</code></td>
      <td><span class="sw" style="background:${DARK[k]}"></span><code>${DARK[k]}</code></td>
      <td class="note">${TOKEN_NOTES[k]}</td></tr>`
  )
  .join('');

const ICONS_USED = [
  ['home', '탭: 홈'], ['home-outline', '탭: 홈(비활성)'], ['calendar', '탭: 달력'], ['calendar-outline', '요일 표시'],
  ['settings', '탭: 설정'], ['settings-outline', '탭: 설정(비활성)'], ['add', '약 추가'],
  ['checkmark', '복용 체크'], ['checkmark-circle', '결제 혜택·저장'], ['checkmark-done-circle', '정식 버전'],
  ['time-outline', '복용 시간'], ['notifications-outline', '미리 알림'], ['alert-circle', '재처방 임박'],
  ['sparkles', '무료 체험'], ['chevron-forward', '이동'], ['trash', '스와이프 삭제'],
  ['remove-circle', '시간 삭제'], ['add-circle-outline', '시간 추가'], ['close', '닫기'],
  ['volume-high', '알림 소리'], ['phone-portrait', '진동'], ['share-outline', '백업 내보내기'],
  ['download-outline', '백업 불러오기'], ['trash-outline', '기록 초기화'], ['cloud-download-outline', '업데이트'],
  ['shield-checkmark', '개인정보'], ['information-circle', '앱 버전'], ['refresh', '구매 복원'],
];

// Components that read --vars, rendered once in light and once in dark.
const components = () => `
  <div class="row">
    <div class="card prog">
      <div class="prog-head">
        <div><div class="muted sm b6">오늘 복용 현황</div>
          <div class="count"><b class="brand">2</b><span class="muted b6"> / 3회 완료</span></div></div>
        <div class="pct brand">66<small>%</small></div>
      </div>
      <div class="track"><div class="fill" style="width:66%"></div></div>
      <span class="streak">🔥 12일 연속 복용</span>
    </div>

    <div class="col">
      <div class="trial">${ic('sparkles')} 무료 체험 5일 남음 · 정식 버전 보기 ${ic('chevron-forward', 'style="margin-left:auto"')}</div>
      <div class="banner">
        <div class="banner-h">${ic('alert-circle', 'style="color:var(--warning)"')} 재처방 임박 알림</div>
        <span class="pill" style="border-color:var(--danger)"><i class="dot" style="background:#EF4444"></i>혈압약 <b style="color:var(--danger)">D-2</b></span>
        <span class="pill" style="border-color:var(--warning)"><i class="dot" style="background:#10B981"></i>오메가3 <b style="color:var(--warning)">D-6</b></span>
      </div>
      <div class="alldone">🎉 오늘 약을 모두 드셨어요!</div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="dose">
        <i class="bar" style="background:#4A6CF7"></i>
        <div class="info"><div class="nm done">혈압약</div>
          <div class="meta">${ic('time-outline')} 오전 8:00 · 1정 · <span class="brand">${ic('notifications-outline')} 10분 전</span></div></div>
        <div class="check on">${ic('checkmark')}</div>
      </div>
      <div class="dose">
        <i class="bar" style="background:#8B5CF6"></i>
        <div class="info"><div class="nm">종합비타민</div>
          <div class="meta">${ic('time-outline')} 오후 9:00 · 1정</div></div>
        <div class="check">${ic('checkmark')}</div>
      </div>
    </div>
    <div class="col">
      <div class="med">
        <div class="mi" style="background:#4A6CF724;color:#4A6CF7">${pill()}</div>
        <div class="info"><div class="nm">혈압약 <span class="badge" style="background:var(--danger)">D-2</span></div>
          <div class="meta">${ic('time-outline')} 오전 8:00, 오후 8:00</div>
          <div class="meta">${ic('calendar-outline')} 매일 · 1정</div></div>
        <span class="switch on"></span>
      </div>
      <div class="med" style="opacity:.55">
        <div class="mi" style="background:#14B8A624;color:#14B8A6">${pill()}</div>
        <div class="info"><div class="nm">수면유도제</div>
          <div class="meta">${ic('time-outline')} 오후 11:00 · 0.5정</div></div>
        <span class="switch"></span>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="label">버튼</div>
      <div class="btns">
        <span class="btn-primary">${ic('checkmark-circle')} 약 등록하기</span>
        <span class="fab">${ic('add')}</span>
        <span class="check">${ic('checkmark')}</span>
        <span class="check on">${ic('checkmark')}</span>
      </div>
      <div class="btns">
        <span class="btn-outline">구매 복원</span>
        <span class="btn-text">나중에</span>
        <span class="btn-small">적용</span>
        <span style="color:var(--danger);font-size:24px">${ic('remove-circle')}</span>
        <span class="del">${ic('trash')}<small>삭제</small></span>
      </div>
      <div class="label">입력</div>
      <div class="input">타이레놀</div>
      <div class="input ph">예: 타이레놀, 오메가-3</div>
      <div class="time">${ic('time-outline')} <b>08:30</b></div>
    </div>
    <div class="col">
      <div class="label">칩 · 선택</div>
      <div class="chips"><span class="chip">0.5정</span><span class="chip">1정</span><span class="chip on">2정</span><span class="chip">10정</span><span class="chip">직접입력</span></div>
      <div class="chips"><span class="freq">1회</span><span class="freq on">2회</span><span class="freq">3회</span><span class="freq">4회</span><span class="freq">5회</span><span class="freq">6회</span><span class="freq">직접</span></div>
      <div class="chips"><span class="day">일</span><span class="day on">월</span><span class="day on">화</span><span class="day on">수</span><span class="day">목</span><span class="day">금</span><span class="day">토</span></div>
      <div class="chips"><span class="chip">D-3</span><span class="chip warn">D-7</span><span class="chip">D-14</span>
        <span class="toggle">OFF</span><span class="toggle on">ON</span></div>
      <div class="seg"><span class="on">시스템</span><span>라이트</span><span>다크</span></div>
      <div class="chips" style="margin-top:12px">${TAGS.map((c, i) => `<span class="tag ${i === 0 ? 'on' : ''}" style="background:${c}">${i === 0 ? ic('checkmark') : ''}</span>`).join('')}
        <span class="switch on"></span><span class="switch"></span></div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="label">설정 행</div>
      <div class="set">
        <div class="srow"><span class="si" style="background:#4A6CF722;color:#4A6CF7">${ic('volume-high')}</span><span class="st">알림 소리</span><span class="switch on"></span></div>
        <div class="srow"><span class="si" style="background:#14B8A622;color:#14B8A6">${ic('share-outline')}</span><span class="st">백업 내보내기<small>파일로 저장 (iCloud·파일 앱)</small></span><span class="faint">${ic('chevron-forward')}</span></div>
        <div class="srow"><span class="si" style="background:#EF444422;color:#EF4444">${ic('trash-outline')}</span><span class="st" style="color:var(--danger)">복용 기록 초기화</span><span class="faint">${ic('chevron-forward')}</span></div>
      </div>
    </div>
    <div class="col">
      <div class="label">달력 기록 행</div>
      <div class="rec" style="border-left-color:var(--success)"><i class="sd" style="background:var(--success)"></i><span class="st">혈압약<small>오전 8:00 · 1정</small></span><b style="color:var(--success)">복용</b></div>
      <div class="rec" style="border-left-color:var(--danger)"><i class="sd" style="background:var(--danger)"></i><span class="st">종합비타민<small>오후 9:00 · 1정</small></span><b style="color:var(--danger)">미복용</b></div>
      <div class="tabbar">
        <span class="on">${ic('home')}<small>홈</small></span><span>${pill()}<small>내 약</small></span>
        <span>${ic('calendar-outline')}<small>달력</small></span><span>${ic('settings-outline')}<small>설정</small></span>
      </div>
    </div>
  </div>`;

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MediRemind 디자인 자산</title>
<style>
@font-face{font-family:Ionicons;src:url(data:font/ttf;base64,${font}) format('truetype')}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:#E9ECF4;color:#1A1D2B;padding:40px 24px 80px}
.wrap{max-width:1180px;margin:0 auto}
h1{font-size:30px;font-weight:800;letter-spacing:-.5px}
.lead{color:#5D6479;margin:6px 0 30px;font-size:14px}
h2{font-size:19px;font-weight:800;margin:44px 0 6px;display:flex;gap:10px;align-items:center}
h2 .n{background:#4A6CF7;color:#fff;border-radius:8px;font-size:12px;padding:3px 8px}
.desc{color:#5D6479;font-size:13px;margin-bottom:16px}
.panel{background:#fff;border-radius:22px;padding:24px;box-shadow:0 8px 24px rgba(63,74,126,.08)}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
.ion{font-family:Ionicons;font-style:normal;font-size:1.15em;line-height:1;display:inline-block;vertical-align:-.15em}

/* icons */
.assets{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px}
.asset{text-align:center}
.asset .frame{height:190px;border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;overflow:hidden}
.asset b{display:block;font-size:13px}.asset span{color:#8A91A8;font-size:12px}
.ios-mask{width:150px;height:150px;border-radius:34px;box-shadow:0 10px 24px rgba(0,0,0,.18)}
.circle{width:150px;height:150px;border-radius:50%;background:#4A6CF7;display:flex;align-items:center;justify-content:center;overflow:hidden}
.checker{background-color:#fff;background-image:linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%);background-size:20px 20px;background-position:0 0,10px 10px}
.sizes{display:flex;gap:18px;align-items:flex-end;justify-content:center;margin-top:18px;flex-wrap:wrap}
.sizes div{text-align:center;font-size:11px;color:#8A91A8}
.sizes .appicon{display:block;margin:0 auto 6px;border-radius:22%}
.appicon{background:url(${png('icon.png')}) center/cover}

/* tokens */
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:#8A91A8;font-weight:700;padding:8px;border-bottom:1px solid #E5E8F0}
td{padding:7px 8px;border-bottom:1px solid #F1F3F8;vertical-align:middle}
.sw{display:inline-block;width:22px;height:22px;border-radius:7px;vertical-align:middle;margin-right:8px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
td.note{color:#5D6479}
.tags{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px}
.tags div{text-align:center;font-size:12px}
.tags i{display:block;width:56px;height:56px;border-radius:16px;margin-bottom:6px}

/* type */
.type div{display:flex;align-items:baseline;gap:18px;padding:10px 0;border-bottom:1px solid #F1F3F8}
.type code{width:200px;color:#8A91A8;flex-shrink:0}

/* backgrounds */
.bgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:16px}
.bgs div{height:130px;border-radius:18px;display:flex;flex-direction:column;justify-content:flex-end;padding:12px;font-size:12px;font-weight:700;line-height:1.5}

/* ── themed components ── */
.theme{background:var(--bg);color:var(--text);border-radius:22px;padding:22px}
.theme + .theme{margin-top:18px}
.theme-title{font-size:13px;font-weight:800;color:var(--textMuted);margin-bottom:14px;letter-spacing:.4px}
.light{${vars(LIGHT)}--shadow:0 6px 14px rgba(63,74,126,.08);--cardBorder:none}
.dark{${vars(DARK)}--shadow:none;--cardBorder:1px solid #2A3042}
.theme .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.theme .col{display:flex;flex-direction:column;gap:10px}
.theme .label{font-size:12px;font-weight:700;color:var(--textMuted);margin-top:4px}
.muted{color:var(--textMuted)}.faint{color:var(--textFaint)}.brand{color:var(--brand)}.sm{font-size:12px}.b6{font-weight:600}
.card{background:var(--surface);border-radius:20px;padding:18px;box-shadow:var(--shadow);border:var(--cardBorder)}
.prog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.count{font-size:14px;margin-top:3px}.count b{font-size:17px;font-weight:800}
.pct{font-size:36px;font-weight:800;letter-spacing:-1px}.pct small{font-size:18px}
.track{height:12px;background:var(--surfaceMuted);border-radius:6px;overflow:hidden}
.fill{height:100%;background:var(--brand);border-radius:6px}
.streak{display:inline-block;margin-top:12px;background:var(--warningSoft);color:var(--warningText);border-radius:12px;padding:5px 11px;font-size:12px;font-weight:800}
.trial{display:flex;align-items:center;gap:8px;background:var(--brandSoft);color:var(--brand);border-radius:14px;padding:10px 13px;font-size:12px;font-weight:700}
.banner{background:var(--warningSoft);border-left:4px solid var(--warning);border-radius:16px;padding:12px 14px}
.banner-h{font-size:13px;font-weight:700;color:var(--warningText);margin-bottom:9px}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid;border-radius:18px;padding:5px 11px;font-size:12px;font-weight:600;margin-right:6px}
.dot{display:inline-block;width:8px;height:8px;border-radius:4px}
.alldone{background:var(--success);color:#fff;border-radius:16px;padding:13px;text-align:center;font-size:14px;font-weight:700}
.dose,.med{display:flex;align-items:center;background:var(--surface);border-radius:18px;box-shadow:var(--shadow);border:var(--cardBorder);overflow:hidden;min-height:72px}
.dose .bar{width:5px;align-self:stretch}
.info{flex:1;padding:12px 14px;min-width:0}
.nm{font-size:15px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.nm.done{text-decoration:line-through;color:var(--textFaint)}
.meta{font-size:12px;color:var(--textMuted);margin-top:2px}
.check{width:44px;height:44px;border-radius:22px;margin-right:14px;flex-shrink:0;background:var(--surfaceMuted);border:2px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-size:22px;color:var(--textFaint)}
.check.on{background:var(--success);border-color:var(--success);color:#fff}
.med{padding-right:14px}.med .info{padding-left:0}
.mi{width:42px;height:42px;border-radius:14px;margin:0 12px 0 14px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
.badge{border-radius:12px;padding:2px 9px;font-size:10px;font-weight:800;color:#fff}
.switch{display:inline-block;width:44px;height:26px;border-radius:13px;background:var(--surfaceMuted);position:relative;flex-shrink:0}
.switch::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.switch.on{background:var(--brand)}.switch.on::after{left:21px}
.btns{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.btn-primary{background:var(--brand);color:var(--onBrand);border-radius:16px;padding:14px 22px;font-size:15px;font-weight:700;display:inline-flex;gap:8px;align-items:center}
.fab{width:46px;height:46px;border-radius:23px;background:var(--brand);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 6px 14px rgba(74,108,247,.4)}
.btn-outline{border:1px solid var(--line);border-radius:16px;padding:12px 20px;font-size:14px;font-weight:600}
.btn-text{color:var(--textMuted);font-size:13px;font-weight:600;padding:12px 6px}
.btn-small{background:var(--brand);color:#fff;border-radius:12px;padding:9px 15px;font-size:12px;font-weight:700}
.del{background:var(--danger);color:#fff;border-radius:16px;width:64px;height:64px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px}
.del small{font-size:11px;font-weight:600;margin-top:2px}
.input{background:var(--inputBg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:14px}
.input.ph{color:var(--textFaint)}
.time{background:var(--brandSoft);border:1px solid var(--brandBorder);border-radius:12px;padding:12px 14px;color:var(--brand);font-size:17px;display:flex;gap:8px;align-items:center}
.chips{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.chip{border:1.5px solid var(--chipBorder);background:var(--inputBg);border-radius:20px;padding:7px 13px;font-size:12px;font-weight:600;color:var(--textMuted)}
.chip.on{border-color:var(--brand);background:var(--brandSoft);color:var(--brand)}
.chip.warn{background:var(--warning);border-color:var(--warning);color:#fff}
.freq{flex:1;min-width:40px;text-align:center;border:1.5px solid var(--chipBorder);border-radius:12px;padding:9px 0;font-size:12px;font-weight:600;color:var(--textMuted)}
.freq.on{border-color:var(--brand);background:var(--brandSoft);color:var(--brand)}
.day{width:36px;height:36px;border-radius:18px;border:1.5px solid var(--chipBorder);background:var(--inputBg);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--textMuted)}
.day.on{background:var(--brand);border-color:var(--brand);color:#fff}
.toggle{background:var(--surfaceMuted);color:var(--textMuted);border-radius:12px;padding:6px 14px;font-size:12px;font-weight:700}
.toggle.on{background:var(--brand);color:#fff}
.seg{display:flex;background:var(--surfaceMuted);border-radius:12px;padding:3px}
.seg span{flex:1;text-align:center;padding:8px 0;border-radius:10px;font-size:12px;font-weight:600;color:var(--textMuted)}
.seg span.on{background:var(--surface);color:var(--text)}
.tag{width:34px;height:34px;border-radius:17px;display:inline-flex;align-items:center;justify-content:center;color:#fff}
.tag.on{transform:scale(1.12);box-shadow:0 0 0 3px var(--surface),0 0 0 4px var(--line)}
.set{background:var(--surface);border-radius:18px;overflow:hidden;box-shadow:var(--shadow);border:var(--cardBorder)}
.srow{display:flex;align-items:center;gap:12px;padding:12px 14px}
.srow + .srow{border-top:1px solid var(--line)}
.si{width:34px;height:34px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.st{flex:1;font-size:14px}.st small{display:block;font-size:11px;color:var(--textMuted);margin-top:1px}
.rec{display:flex;align-items:center;gap:10px;background:var(--surface);border-radius:16px;padding:11px 14px;border-left:4px solid}
.rec b{font-size:12px}
.sd{width:9px;height:9px;border-radius:5px;display:inline-block}
.tabbar{display:flex;background:var(--surface);border-radius:18px;padding:10px 6px;border:var(--cardBorder);box-shadow:0 -4px 14px rgba(26,34,70,.06)}
.tabbar span{flex:1;text-align:center;color:var(--textMuted);font-size:21px}
.tabbar span small{display:block;font-size:10px;font-weight:600;margin-top:2px}
.tabbar span.on{color:var(--brand)}

/* icon grid */
.icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.icons div{border:1px solid #EEF0F5;border-radius:14px;padding:14px 8px;text-align:center}
.icons .ion{font-size:28px;color:#4A6CF7;display:block;margin:0 auto 8px}
.icons code{display:block;font-size:10px;color:#1A1D2B;word-break:break-all}
.icons span{font-size:11px;color:#8A91A8}
@media(max-width:760px){.theme .row{grid-template-columns:1fr}.type code{width:130px}}
</style></head><body><div class="wrap">

<h1>💊 MediRemind 디자인 자산</h1>
<p class="lead">앱 코드(<code>src/theme/theme.ts</code>, 각 화면 StyleSheet)와 <code>assets/</code> 폴더의 실제 값으로 만든 자산 시트입니다.</p>

<h2><span class="n">01</span>앱 아이콘 · 이미지</h2>
<p class="desc"><code>scripts/generate-icons.js</code>가 SVG에서 생성합니다. 캡슐 + 완료 체크, 인디고 그라데이션 배경.</p>
<div class="panel">
  <div class="assets">
    <div class="asset"><div class="frame" style="background:#F4F6FB"><div class="ios-mask appicon"></div></div><b>icon.png</b><span>1024×1024 · iOS 앱 아이콘</span></div>
    <div class="asset"><div class="frame" style="background:#F4F6FB"><div class="circle"><img src="${png('adaptive-icon.png')}" width="150" height="150"></div></div><b>adaptive-icon.png</b><span>Android 적응형 전경 · 배경 #4A6CF7</span></div>
    <div class="asset"><div class="frame" style="background:#4A6CF7"><img src="${png('splash-icon.png')}" width="130"></div><b>splash-icon.png</b><span>스플래시 · 배경 #4A6CF7</span></div>
    <div class="asset"><div class="frame" style="background:#1A1D2B"><img src="${png('notification-icon.png')}" width="72"></div><b>notification-icon.png</b><span>96×96 · Android 상태바 (흰색 단색)</span></div>
    <div class="asset"><div class="frame checker"><img src="${png('favicon.png')}" width="48" style="border-radius:10px"></div><b>favicon.png</b><span>48×48 · 웹</span></div>
  </div>
  <div class="sizes">
    ${[180, 120, 87, 60, 40].map((s) => `<div><i class="appicon" style="width:${s / 1.5}px;height:${s / 1.5}px"></i>${s}px</div>`).join('')}
  </div>
</div>

<h2><span class="n">02</span>컬러 토큰</h2>
<p class="desc">모든 화면은 이 토큰만 사용합니다. 다크 모드는 같은 이름에 다른 값이 들어갑니다.</p>
<div class="panel">
  <table><tr><th>토큰</th><th>라이트</th><th>다크</th><th>용도</th></tr>${tokenRows}</table>
  <div class="tags">${TAGS.map((c) => `<div><i style="background:${c}"></i><code>${c}</code></div>`).join('')}</div>
  <p class="desc" style="margin:10px 0 0">약 색상 태그 6개 (<code>COLOR_TAGS</code>) · 라이트/다크 공통</p>
</div>

<h2><span class="n">03</span>타이포그래피</h2>
<p class="desc">시스템 글꼴(iOS: SF Pro / Apple SD Gothic Neo).</p>
<div class="panel type">
  <div><code>대형 숫자 40 / 800</code><span style="font-size:40px;font-weight:800;letter-spacing:-1px;color:#4A6CF7">66%</span></div>
  <div><code>화면 제목 27 / 800</code><span style="font-size:27px;font-weight:800;letter-spacing:-.5px">오늘의 복용 현황</span></div>
  <div><code>결제 제목 24 / 800</code><span style="font-size:24px;font-weight:800">MediRemind 정식 버전</span></div>
  <div><code>버튼 17 / 700</code><span style="font-size:17px;font-weight:700">약 등록하기</span></div>
  <div><code>카드 제목 16 / 700</code><span style="font-size:16px;font-weight:700">종합비타민</span></div>
  <div><code>섹션 15 / 700 brand</code><span style="font-size:15px;font-weight:700;color:#4A6CF7">복용 시간</span></div>
  <div><code>라벨 14 / 600 muted</code><span style="font-size:14px;font-weight:600;color:#8A91A8">1회 복용량 *</span></div>
  <div><code>메타 13 / 400 muted</code><span style="font-size:13px;color:#8A91A8">오전 8:00 · 1정</span></div>
  <div><code>칩 12–13 / 600</code><span style="font-size:13px;font-weight:600;color:#4A6CF7">2정</span></div>
</div>

<h2><span class="n">04</span>컴포넌트 · 버튼 · 카드</h2>
<p class="desc">같은 컴포넌트를 라이트/다크 토큰으로 그렸습니다. 라운드: 카드 18–20, 배너 14–16, 입력 12, 칩 20.</p>
<div class="theme light"><div class="theme-title">LIGHT</div>${components()}</div>
<div class="theme dark"><div class="theme-title">DARK</div>${components()}</div>

<h2><span class="n">05</span>아이콘 (Ionicons)</h2>
<p class="desc"><code>@expo/vector-icons</code>의 Ionicons ${ICONS_USED.length}개와 MaterialCommunityIcons의 pill 1개.</p>
<div class="panel icons">
  <div><span class="ion" style="font-family:inherit;color:#4A6CF7;font-size:28px;display:block;margin:0 auto 8px">${pill('28px')}</span><code>pill (MaterialCommunityIcons)</code><span>탭: 내 약 · 약 카드</span></div>
  ${ICONS_USED.map(([n, d]) => `<div>${ic(n)}<code>${n}</code><span>${d}</span></div>`).join('')}
</div>

<h2><span class="n">06</span>배경 · 그림자</h2>
<p class="desc">화면 배경, 스플래시, 아이콘·스크린샷 배경과 카드 그림자 값.</p>
<div class="panel">
  <div class="bgs">
    <div style="background:#F4F6FB;color:#1A1D2B;box-shadow:inset 0 0 0 1px #E5E8F0">화면 배경 · 라이트<br>#F4F6FB</div>
    <div style="background:#0B0D14;color:#F3F5FA">화면 배경 · 다크<br>#0B0D14</div>
    <div style="background:#4A6CF7;color:#fff">스플래시<br>#4A6CF7</div>
    <div style="background:linear-gradient(135deg,#5B7CFA,#3B55E0);color:#fff">아이콘 · 스토어 배경<br>#5B7CFA → #3B55E0</div>
    <div style="background:#FFFBEB;color:#92400E;box-shadow:inset 0 0 0 1px #F5E6B8">경고 배너<br>#FFFBEB</div>
    <div style="background:#EDF1FE;color:#4A6CF7">브랜드 소프트<br>#EDF1FE</div>
  </div>
  <div class="bgs" style="margin-top:20px">
    <div style="background:#fff;box-shadow:0 6px 12px rgba(63,74,126,.07);color:#5D6479;font-weight:600">카드 그림자 (라이트)<br><code>#3F4A7E · y6 · blur12 · 7%</code></div>
    <div style="background:#fff;box-shadow:0 6px 10px rgba(74,108,247,.35);color:#5D6479;font-weight:600">FAB 그림자<br><code>#4A6CF7 · y6 · blur10 · 35%</code></div>
    <div style="background:#161A26;border:1px solid #2A3042;color:#9AA1B5;font-weight:600">카드 (다크)<br><code>그림자 대신 1px #2A3042</code></div>
  </div>
</div>

</div></body></html>`;

const out = path.join(ROOT, 'docs/design-assets.html');
fs.writeFileSync(out, html);
console.log('wrote', path.relative(ROOT, out), Math.round(html.length / 1024) + 'KB');

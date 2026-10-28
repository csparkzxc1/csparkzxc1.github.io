/**
 * Renders the app icon set from inline SVG with Playwright's Chromium.
 *   node scripts/generate-icons.js
 */
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '../assets');

// White capsule with a check, tilted, on the brand indigo.
const capsule = (stroke = '#4A6CF7') => `<g transform="translate(-50 -45)">
  <g transform="translate(512 512) rotate(-35)">
    <rect x="-300" y="-125" width="600" height="250" rx="125" fill="#FFFFFF"/>
    <path d="M0 -125 H175 a125 125 0 0 1 0 250 H0 Z" fill="#DCE3FD"/>
    <line x1="0" y1="-125" x2="0" y2="125" stroke="${stroke}" stroke-opacity="0.25" stroke-width="10"/>
  </g>
  <g transform="translate(640 650)">
    <circle r="150" fill="#10B981" stroke="#FFFFFF" stroke-width="28"/>
    <path d="M-70 0 L-20 50 L75 -55" fill="none" stroke="#FFFFFF" stroke-width="34"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g></g>`;

const bg = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5B7CFA"/>
      <stop offset="1" stop-color="#3B55E0"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>`;

const svg = (size, inner, viewBox = '0 0 1024 1024') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${inner}</svg>`;

// Monochrome silhouette for the Android status bar (must be white on transparent).
const mono = `
  <g transform="translate(512 512) rotate(-35)">
    <path d="M-16 -140 H-190 a140 140 0 0 0 0 280 H-16 Z" fill="#FFFFFF"/>
    <path d="M16 -140 H190 a140 140 0 0 1 0 280 H16 Z" fill="#FFFFFF"/>
  </g>`;

const ICONS = [
  { file: 'icon.png', size: 1024, body: bg + capsule(), opaque: true },
  // Adaptive foreground keeps art inside the 66% safe zone.
  { file: 'adaptive-icon.png', size: 1024, body: `<g transform="translate(174 174) scale(0.66)">${capsule()}</g>` },
  { file: 'splash-icon.png', size: 1024, body: capsule() },
  { file: 'notification-icon.png', size: 96, body: mono },
  { file: 'favicon.png', size: 48, body: bg + capsule(), opaque: true },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const icon of ICONS) {
    await page.setViewportSize({ width: icon.size, height: icon.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(icon.size, icon.body)}</body></html>`
    );
    await page.locator('svg').screenshot({
      path: path.join(OUT, icon.file),
      omitBackground: !icon.opaque,
    });
    console.log('wrote', icon.file);
  }
  await browser.close();
})();

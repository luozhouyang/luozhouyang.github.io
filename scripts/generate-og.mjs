import { chromium } from 'playwright-core';
import path from 'node:path';

const url = process.env.OG_URL ?? 'http://127.0.0.1:4321/';
const output = process.env.OG_OUT ?? 'public/og.png';
const isEnglish = process.env.OG_LANG === 'en';
const executablePath =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(Boolean);

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  console.log(`OG ${url} -> ${output} (lang=${isEnglish ? 'en' : 'zh'})`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-space-scene][data-ready]', { timeout: 15_000 });

  await page.evaluate((isEnglish) => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const hide = [
      'header',
      '.hero-copy',
      '.hero-hud',
      '.scene-side-label',
      '.scene-corners',
      '.scene-scanline',
      '.dossier',
      '.scene-tooltip',
      '.scene-hint',
      '.astronaut-tag',
    ];
    for (const selector of hide) {
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof HTMLElement) node.style.display = 'none';
      });
    }

    const overlay = document.createElement('div');
    overlay.id = 'og-overlay';
    const title = isEnglish
      ? 'BUILDING IN<br /><em>ZERO GRAVITY.</em>'
      : '在失重中，<br /><em>构建有用的东西。</em>';
    overlay.innerHTML = `
      <div class="og-scrim"></div>
      <div class="og-copy">
        <p class="og-eyebrow">PERSONAL LAB <span>/</span> LOST IN ORBIT</p>
        <h1>${title}</h1>
        <p class="og-sub">Rust · TypeScript · AI tooling<br />Hangzhou, China</p>
        <p class="og-foot">MISSION 01 <span>//</span> LOST IN ORBIT</p>
      </div>
      <div class="og-mark">
        <span class="og-dot"></span>
        <span>ORBIT // 01</span>
      </div>
    `;
    document.body.append(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #og-overlay {
        position: fixed;
        inset: 0;
        z-index: 999;
        overflow: hidden;
        pointer-events: none;
        font-family: 'Space Grotesk Variable', 'Noto Sans CJK SC', 'Noto Sans SC', sans-serif;
        color: #e9edff;
      }
      .og-scrim {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(3,5,12,.92) 0%, rgba(3,5,12,.78) 38%, rgba(3,5,12,.12) 72%, transparent 100%),
          linear-gradient(0deg, rgba(3,5,12,.6), transparent 35%);
      }
      .og-copy {
        position: absolute;
        left: 76px;
        top: 112px;
        width: 650px;
      }
      .og-eyebrow {
        margin: 0;
        font-family: 'JetBrains Mono Variable', monospace;
        font-size: 12px;
        letter-spacing: .24em;
        color: rgba(125,227,224,.8);
      }
      .og-eyebrow span { color: #667192; }
      h1 {
        margin: 26px 0 0;
        font-size: 70px;
        font-weight: 500;
        line-height: 1.02;
        letter-spacing: -.055em;
        color: #f3f6ff;
      }
      h1 em {
        font-style: normal;
        background: linear-gradient(94deg, #f5f8ff 4%, #9ff6f0 48%, #ffc78f 98%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .og-sub {
        margin: 28px 0 0;
        font-family: 'JetBrains Mono Variable', monospace;
        font-size: 13px;
        line-height: 1.8;
        letter-spacing: .06em;
        color: rgba(154,165,200,.75);
      }
      .og-foot {
        margin: 52px 0 0;
        font-family: 'JetBrains Mono Variable', monospace;
        font-size: 11px;
        letter-spacing: .14em;
        color: rgba(154,165,200,.45);
      }
      .og-foot span { color: rgba(125,227,224,.5); }
      .og-mark {
        position: absolute;
        right: 58px;
        top: 46px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'JetBrains Mono Variable', monospace;
        font-size: 10px;
        letter-spacing: .18em;
        color: rgba(233,237,255,.55);
      }
      .og-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #7de3e0;
        box-shadow: 0 0 14px 3px rgba(125,227,224,.4);
      }
    `;
    document.head.append(style);
  }, isEnglish);

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(output) });
  console.log(`Wrote ${output} (1200x630)`);
} finally {
  await browser.close();
}

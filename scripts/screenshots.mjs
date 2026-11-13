import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const url = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4321/';
const executablePath =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(Boolean);

const outDir = 'screenshots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox'],
});

try {
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['mobile', 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-space-scene][data-ready]', { timeout: 15_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${name}-hero.png` });
    await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });

    const state = await page.evaluate(() => window.__ORBIT_SCENE__?.state());
    console.log(`${name}:`, state, errors.length ? `errors=${errors.join(' | ')}` : 'no errors');
    await context.close();
  }
} finally {
  await browser.close();
}

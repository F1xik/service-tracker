/*
 * Screenshot generator for the design-system reference mockups.
 *
 * Renders each docs/mockups/*.html screen at mobile + desktop widths, in light and
 * dark, and writes PNGs to docs/mockups/images/. Playwright is invoked on demand
 * (npx) so nothing is added to the app's package.json.
 *
 * Usage:  node docs/mockups/capture.mjs
 * Deps :  npx -y playwright install chromium   (first run downloads the browser)
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'images');

const screens = [
  '01-auth',
  '02-log-income',
  '03-services',
  '04-stats',
  '05-import',
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

const themes = ['light', 'dark'];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
let count = 0;

try {
  for (const screen of screens) {
    const fileUrl = pathToFileURL(join(here, `${screen}.html`)).href;
    for (const vp of viewports) {
      for (const theme of themes) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          colorScheme: theme,
        });
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        // Toggle the .dark class exactly as the app's theme bootstrap does (§2.3).
        await page.evaluate((t) => {
          document.documentElement.classList.toggle('dark', t === 'dark');
        }, theme);
        // Full-page captures render sticky *bottom* bars mid-page, overlapping
        // content. Pin them statically so the whole screen is visible; the docked
        // behavior is still documented in the CSS/spec.
        await page.addStyleTag({
          content: '.tabbar,.confirm-bar{position:static !important;bottom:auto !important}',
        });
        // Desktop screens use the centered max-width wrappers.
        if (vp.name === 'desktop') {
          await page.evaluate((isForm) => {
            document.documentElement.classList.add('desktop');
            if (isForm) document.body.firstElementChild?.classList?.add?.('form-screen');
          }, screen === '01-auth');
        }
        const file = join(outDir, `${screen}.${vp.name}.${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        await page.close();
        count++;
        console.log(`✓ ${screen}.${vp.name}.${theme}.png`);
      }
    }
  }
} finally {
  await browser.close();
}

console.log(`\nWrote ${count} screenshots to ${outDir}`);

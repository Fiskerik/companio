import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.STORE_SCREENSHOT_URL || 'http://127.0.0.1:4173';
const outputRoot = resolve('store-assets/ios');
const screens = [
  ['01-discover', async (page) => {}],
  [
    '02-people',
    async (page) => {
      await page.getByRole('tab', { name: 'Hitta sällskap', exact: true }).click();
    },
  ],
  [
    '03-chat',
    async (page) => {
      await page.getByRole('tab', { name: 'Inkorg', exact: true }).click();
      const accept = page.getByRole('button', { name: 'Acceptera', exact: true });
      if (await accept.count()) await accept.click();
      await page.getByRole('button', { name: 'Sara & David', exact: true }).click();
    },
  ],
  [
    '04-event',
    async (page) => {
      await page.getByRole('tab', { name: 'Upptäck', exact: true }).click();
      await page.getByText('Fika & små äventyr i parken', { exact: true }).click();
    },
  ],
  [
    '05-profile',
    async (page) => {
      await page.getByRole('tab', { name: 'Profil', exact: true }).click();
    },
  ],
];

async function makeSet(name, width, height, scale) {
  const directory = resolve(outputRoot, name);
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Utforska demo', exact: true }).click();
  await page.getByRole('tab', { name: 'Upptäck', exact: true }).waitFor({ state: 'visible' });
  for (const [slug, action] of screens) {
    if (slug !== '01-discover') {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Utforska demo', exact: true }).click();
    }
    await action(page);
    await page.screenshot({ path: resolve(directory, `${slug}.png`), fullPage: false });
  }
  await browser.close();
}

await mkdir('store-assets', { recursive: true });
await sharp('assets/icon.png')
  .resize(1024, 1024, { fit: 'cover' })
  .flatten({ background: '#F8F7F2' })
  .png()
  .toFile('store-assets/AppStoreIcon-1024.png');
await makeSet('6.9-inch', 440, 956, 3);
await makeSet('6.5-inch', 414, 896, 3);
await writeFile(
  'store-assets/asset-manifest.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'Companio demo web build rendered with Playwright',
      screenshotSets: {
        '6.9-inch': { width: 1320, height: 2868 },
        '6.5-inch': { width: 1242, height: 2688 },
      },
      files: screens.map(([slug]) => `${slug}.png`),
    },
    null,
    2,
  ) + '\n',
);

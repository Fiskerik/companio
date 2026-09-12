import { test, expect } from '@playwright/test';

test('demo navigation, conversation and persistence', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Utforska demo', exact: true }).click();
  await expect(page.getByText('Demoläge · Alla profiler och träffar är exempel')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Upptäck', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.screenshot({ path: testInfo.outputPath('discover.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('tab', { name: 'Hitta sällskap', exact: true }).click();
  await page.getByRole('tab', { name: 'Favoriter', exact: true }).click();
  await page.getByRole('tab', { name: 'Inkorg', exact: true }).click();
  await page.getByRole('button', { name: 'Acceptera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Acceptera', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sara & David', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Skriv ett meddelande…', exact: true })
    .fill('Ska vi ses på en fika?');
  await page.getByRole('button', { name: 'Skicka', exact: true }).click();
  await expect(page.getByText('Ska vi ses på en fika?', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Utforska demo', exact: true }).click();
  await page.getByRole('tab', { name: 'Inkorg', exact: true }).click();
  await page.getByRole('button', { name: 'Sara & David', exact: true }).click();
  await expect(page.getByText('Ska vi ses på en fika?', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('English interface and event creation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Find your people', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create a meetup', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Sunday park coffee');
  await page.getByRole('textbox', { name: 'Meeting place', exact: true }).fill('Public park café');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Sunday park coffee', { exact: true })).toBeVisible();
});

test('privacy policy is available at the public route', async ({ page }) => {
  await page.goto('/privacy');
  await expect(
    page.getByRole('heading', { name: 'Integritetspolicy / Privacy policy', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Dina rättigheter', { exact: true })).toBeVisible();
});

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Fortsätt utan inloggning', exact: true }).click();
});

test('compact agenda expands a busy day and filters your own calendar', async ({ page }, testInfo) => {
  await expect(page.getByText('Lite mer sällskap.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await page
    .getByRole('button', { name: /^Visa alla \d+ aktiviteter/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Språkfika – öva svenska tillsammans', exact: true }).click();
  await expect(page.getByText('Vi pratar enkel svenska och hjälps åt.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Stäng', exact: true }).click();
  await page.getByRole('button', { name: 'Min kalender', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Vår fikastund vid vattnet', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fika & små äventyr i parken', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Min kalender', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('timeline.png') });
});

test('language exchange filter finds a Swedish learner and a template creates a real demo group', async ({
  page,
}, testInfo) => {
  await page.getByRole('tab', { name: 'Hitta sällskap', exact: true }).click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const exchange = page.getByText('Språkutbyte – vill öva eller hjälpa med', { exact: true }).locator('..');
  await exchange.getByRole('button', { name: 'Svenska', exact: true }).click();
  const kind = page.getByText('Hushållstyp', { exact: true }).locator('..');
  await kind.getByRole('button', { name: 'Par med barn', exact: true }).click();
  await page.getByRole('button', { name: 'Visa 1 hushåll', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Maja & Ali', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Emma & Johan', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('language-filter.png') });
  await page.getByRole('tab', { name: 'Upptäck', exact: true }).click();
  await page.getByRole('button', { name: 'Sammanhang', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Språkfika – svenska & fler språk', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('communities.png') });
  await page.getByRole('button', { name: 'Använd mall: Bokprat & kultur', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Sammanhangets namn', exact: true })).toHaveValue(
    'Bokprat & kultur',
  );
  await page.getByRole('textbox', { name: 'Sammanhangets namn', exact: true }).fill('Vår lokala bokcirkel');
  await page.getByRole('button', { name: 'Spara', exact: true }).click();
  await expect(page.getByText('Vår lokala bokcirkel', { exact: true }).first()).toBeVisible();
});

test('calendar and time choices create a meetup without typing dates', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Skapa träff', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Rubrik', exact: true }).fill('Kalenderfika');
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mötesplats', exact: true }).fill('Biblioteket');
  await page.getByRole('button', { name: /Start: Välj datum/ }).click();
  await page.getByRole('button', { name: 'Nästa månad', exact: true }).click();
  await page.getByRole('button', { name: 'Föregående månad', exact: true }).click();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page
    .getByRole('button', {
      name: tomorrow.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }),
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: /Start: Välj tid/ }).click();
  await page.getByRole('button', { name: '11', exact: true }).click();
  await page.getByRole('button', { name: 'Klar', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('calendar-form.png') });
  await page.getByRole('button', { name: 'Nästa', exact: true }).click();
  await page.getByRole('button', { name: 'Spara', exact: true }).click();
  await page
    .getByRole('button', { name: /^Visa alla \d+ aktiviteter/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Kalenderfika', exact: true })).toBeVisible();
});

test('accepted meetup opens a shared chat with an unsent greeting draft', async ({ page }) => {
  await page
    .getByRole('button', { name: /^Visa alla \d+ aktiviteter/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Fika & små äventyr i parken', exact: true }).click();
  await page.getByRole('button', { name: 'Häng med', exact: true }).click();
  await expect(page.getByText('Du är anmäld', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Öppna träffchatten', exact: true }).click();
  const message = page.getByRole('textbox', { name: 'Skriv ett meddelande…', exact: true });
  await expect(message).toHaveValue('Hej! Vi kommer gärna på träffen. Vi ser fram emot att ses.');
  await expect(page.getByRole('button', { name: 'Skicka', exact: true })).toBeVisible();
});

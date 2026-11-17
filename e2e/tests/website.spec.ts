import { expect, test } from '@playwright/test';
import { URLS } from '../support/env';

/** Public website: languages, navigation, legal pages. */
test.describe('Website', () => {
  test('home page loads in English with a booking button', async ({ page }) => {
    await page.goto(`${URLS.website}/en`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Book a ride' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a German browser is sent to /de on the first visit', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE', extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9' } });
    const page = await context.newPage();
    await page.goto(`${URLS.website}/`);
    await expect(page).toHaveURL(/\/de(\/|$)/);
    await context.close();
  });

  test('an unknown browser language falls back to English', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ja-JP', extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9' } });
    const page = await context.newPage();
    await page.goto(`${URLS.website}/`);
    await expect(page).toHaveURL(/\/en(\/|$)/);
    await context.close();
  });

  test('the language switcher changes language and the choice is remembered', async ({ page, context }) => {
    await page.goto(`${URLS.website}/en`);
    await page.getByLabel('Language').first().selectOption('da');
    await expect(page).toHaveURL(/\/da(\/|$)/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'da');

    const cookies = await context.cookies(URLS.website);
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('da');

    await page.goto(`${URLS.website}/`);
    await expect(page).toHaveURL(/\/da(\/|$)/);
  });

  test('switching language keeps the user on the booking page', async ({ page }) => {
    await page.goto(`${URLS.website}/en/book`);
    await page.getByLabel('Language').first().selectOption('de');
    await expect(page).toHaveURL(/\/de\/book/);
  });

  for (const lang of ['en', 'da', 'de', 'fr', 'es', 'it', 'rm']) {
    test(`booking page opens in ${lang}`, async ({ page }) => {
      const res = await page.goto(`${URLS.website}/${lang}/book`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('#pickup')).toBeVisible();
    });
  }

  for (const [slug, title] of [
    ['terms', 'Booking terms'],
    ['cancellation', 'Cancellation policy'],
    ['privacy', 'Privacy policy'],
    ['cookies', 'Cookie policy'],
    ['company', 'Company information'],
  ]) {
    test(`legal page "${title}" shows with the draft warning`, async ({ page }) => {
      await page.goto(`${URLS.website}/en/legal/${slug}`);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await expect(page.getByText(/DRAFT — not legally reviewed/)).toBeVisible();
    });
  }

  test('unknown pages answer 404', async ({ page }) => {
    const res = await page.goto(`${URLS.website}/en/this-page-does-not-exist`);
    expect(res?.status()).toBe(404);
  });

  test('every language has an SEO alternate link', async ({ page }) => {
    await page.goto(`${URLS.website}/en`);
    for (const lang of ['en', 'da', 'de', 'fr', 'es', 'it', 'rm', 'x-default']) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`).first()).toBeAttached();
    }
  });
});

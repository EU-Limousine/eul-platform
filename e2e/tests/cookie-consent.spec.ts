import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type BrowserContext } from '@playwright/test';
import { URLS } from '../support/env';

/**
 * Cookie consent. The banner exists only when the website has optional categories switched on
 * (NEXT_PUBLIC_CONSENT_CATEGORIES in apps/website/.env). Both modes are tested; the right set runs.
 */
function websiteCategories(): string {
  if (process.env.NEXT_PUBLIC_CONSENT_CATEGORIES !== undefined) return process.env.NEXT_PUBLIC_CONSENT_CATEGORIES;
  const file = path.resolve(__dirname, '../../apps/website/.env');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('NEXT_PUBLIC_CONSENT_CATEGORIES='));
  return (line?.split('=')[1] ?? '').replace(/["']/g, '').trim();
}

const STATISTICS_ON = websiteCategories().includes('statistics');

async function consentCookie(context: BrowserContext): Promise<{ v: number; choices: Record<string, boolean> } | undefined> {
  const cookie = (await context.cookies(URLS.website)).find((c) => c.name === 'eul_consent');
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : undefined;
}

test.describe('Cookie consent', () => {
  test('nothing optional is stored before the visitor chooses', async ({ page, context }) => {
    await page.goto(`${URLS.website}/en`);
    await page.waitForLoadState('networkidle');
    const names = (await context.cookies(URLS.website)).map((c) => c.name);
    expect(names.filter((n) => n !== 'NEXT_LOCALE')).toEqual([]);
  });

  test.describe('without optional categories', () => {
    test.skip(STATISTICS_ON, 'NEXT_PUBLIC_CONSENT_CATEGORIES is set');

    test('no banner and no settings link', async ({ page }) => {
      await page.goto(`${URLS.website}/en`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('region', { name: 'Your cookie choices' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cookie settings' })).toHaveCount(0);
    });
  });

  test.describe('with statistics switched on', () => {
    test.skip(!STATISTICS_ON, 'set NEXT_PUBLIC_CONSENT_CATEGORIES=statistics in apps/website/.env to test the banner');

    test('reject is as easy as accept, and the choice is remembered', async ({ page, context }) => {
      await page.goto(`${URLS.website}/en`);
      const banner = page.getByRole('region', { name: 'Your cookie choices' });
      await expect(banner).toBeVisible();
      await expect(banner.getByRole('button', { name: 'Accept all' })).toBeVisible();
      await banner.getByRole('button', { name: 'Reject all' }).click();
      await expect(banner).toHaveCount(0);
      expect((await consentCookie(context))?.choices.statistics).toBe(false);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('region', { name: 'Your cookie choices' })).toHaveCount(0);
    });

    test('accept all grants statistics', async ({ page, context }) => {
      await page.goto(`${URLS.website}/en/fleet`);
      await page.getByRole('button', { name: 'Accept all' }).click();
      expect((await consentCookie(context))?.choices.statistics).toBe(true);
    });

    test('settings: optional starts off, can be granted and withdrawn from the footer', async ({ page, context }) => {
      await page.goto(`${URLS.website}/en`);
      await page.getByRole('button', { name: 'Choose cookies' }).click();
      const dialog = page.getByRole('dialog', { name: 'Cookie settings' });
      await expect(dialog).toBeVisible();
      const statistics = dialog.getByRole('switch', { name: 'Statistics' });
      await expect(statistics).not.toBeChecked();
      await statistics.check();
      await dialog.getByRole('button', { name: 'Save my choices' }).click();
      await expect(dialog).toHaveCount(0);
      expect((await consentCookie(context))?.choices.statistics).toBe(true);

      // Withdraw: the page reloads so nothing that was loaded keeps running.
      await page.getByRole('contentinfo').getByRole('button', { name: 'Cookie settings' }).click();
      await expect(dialog.getByRole('switch', { name: 'Statistics' })).toBeChecked();
      await dialog.getByRole('switch', { name: 'Statistics' }).uncheck();
      await Promise.all([page.waitForEvent('load'), dialog.getByRole('button', { name: 'Save my choices' }).click()]);
      expect((await consentCookie(context))?.choices.statistics).toBe(false);
    });

    test('Escape closes the settings without saving', async ({ page, context }) => {
      await page.goto(`${URLS.website}/en`);
      await page.getByRole('button', { name: 'Choose cookies' }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toHaveCount(0);
      expect(await consentCookie(context)).toBeUndefined();
    });

    test('the banner is translated', async ({ page }) => {
      await page.goto(`${URLS.website}/da`);
      const banner = page.getByRole('region', { name: 'Dine valg om cookies' });
      await expect(banner.getByRole('button', { name: 'Afvis alle' })).toBeVisible();
    });
  });
});

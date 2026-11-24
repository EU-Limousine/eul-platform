import { expect, test } from '@playwright/test';
import { URLS, uniqueId } from '../support/env';

/** Public content pages, navigation, SEO files and the enquiry form. */
const PAGES: [path: string, h1: RegExp][] = [
  ['/services', /Chauffeur services in Copenhagen/],
  ['/services/airport-transfers', /Airport transfers/],
  ['/services/hourly-chauffeur', /Chauffeur by the hour/],
  ['/services/city-to-city', /City to city/],
  ['/services/vip-chauffeur', /VIP chauffeur/],
  ['/services/events-weddings', /Events and weddings/],
  ['/services/tours', /Tours and sightseeing/],
  ['/services/group-transport', /Group transport/],
  ['/business', /Business travel/],
  ['/fleet', /Our vehicle classes/],
  ['/service-areas', /Where we drive/],
  ['/about', /About EU Limousine/],
  ['/faq', /Frequently asked questions/],
  ['/contact', /Contact us/],
  ['/blog', /Travel notes/],
];

test.describe('Website pages', () => {
  for (const [path, h1] of PAGES) {
    test(`${path} loads with its heading and a canonical link`, async ({ page }) => {
      const res = await page.goto(`${URLS.website}/en${path}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/en${path}$`));
    });
  }

  test('service pages open in Danish too (English fallback for missing texts)', async ({ page }) => {
    const res = await page.goto(`${URLS.website}/da/services/airport-transfers`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'da');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('header navigation reaches the main pages', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${URLS.website}/en`);
    const nav = page.getByRole('banner');
    for (const [name, path] of [
      ['Business', '/en/business'],
      ['Fleet', '/en/fleet'],
      ['About', '/en/about'],
      ['Contact', '/en/contact'],
    ]) {
      await nav.getByRole('link', { name, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
  });

  test('the airport page links into the booking flow', async ({ page }) => {
    await page.goto(`${URLS.website}/en/services/airport-transfers`);
    await page.getByRole('link', { name: 'Get a price' }).first().click();
    await expect(page).toHaveURL(/\/en\/book/);
  });

  test('an enquiry-only service shows the form and no price button', async ({ page }) => {
    await page.goto(`${URLS.website}/en/services/hourly-chauffeur`);
    await expect(page.locator('#enquiry')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get a price' })).toHaveCount(0);
  });

  test('the FAQ answers open', async ({ page }) => {
    await page.goto(`${URLS.website}/en/faq`);
    await page.getByText('How do I book?').click();
    await expect(page.getByText(/Use Book a ride/)).toBeVisible();
  });

  test('the contact form checks fields, then sends', async ({ page }) => {
    await page.goto(`${URLS.website}/en/contact`);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();

    await page.locator('#enq-name').fill('E2E Tester');
    await page.locator('#enq-email').fill(`e2e-${uniqueId().toLowerCase()}@example.com`);
    await page.locator('#enq-message').fill('This is an automated test message from Playwright.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Thank you, we have your message')).toBeVisible();
  });

  test('the business form requires a company', async ({ page }) => {
    await page.goto(`${URLS.website}/en/business`);
    await page.locator('#enq-name').fill('E2E Tester');
    await page.locator('#enq-email').fill('e2e@example.com');
    await page.locator('#enq-message').fill('We need airport pickups for our guests.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Enter your company name.')).toBeVisible();
  });

  test('the enquiry API validates input and accepts a valid message', async ({ request }) => {
    const bad = await request.post(`${URLS.api}/public/enquiries`, { data: { type: 'GENERAL', name: 'X', email: 'nope', message: 'short' } });
    expect(bad.status()).toBe(422);
    const body = (await bad.json()) as { code: string; fieldErrors?: Record<string, string[]> };
    expect(Object.keys(body.fieldErrors ?? {})).toEqual(expect.arrayContaining(['name', 'email', 'message']));

    const ok = await request.post(`${URLS.api}/public/enquiries`, {
      data: { type: 'EVENT', name: 'E2E Tester', email: 'e2e@example.com', topic: 'events-weddings', message: 'Wedding on a Saturday, 40 guests.', language: 'en' },
    });
    expect(ok.status()).toBe(201);
    expect(await ok.json()).toEqual({ received: true });
  });

  test('sitemap lists the content pages and hides the booking flow', async ({ request }) => {
    const res = await request.get(`${URLS.website}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of ['/en/services/airport-transfers', '/da/fleet', '/en/contact', '/rm/faq']) expect(xml).toContain(path);
    expect(xml).not.toContain('/book');
  });

  test('robots.txt points to the sitemap', async ({ request }) => {
    const text = await (await request.get(`${URLS.website}/robots.txt`)).text();
    expect(text).toContain('Sitemap: https://eulimousine.com/sitemap.xml');
    expect(text).toContain('Disallow: /en/book');
  });

  test('an unknown service answers 404 with a way home', async ({ page }) => {
    const res = await page.goto(`${URLS.website}/en/services/does-not-exist`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to the home page' })).toBeVisible();
  });
});

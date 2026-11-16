import { expect, type Page } from '@playwright/test';
import { URLS } from './env';

/** YYYY-MM-DD in Copenhagen, `days` from today. */
export function copenhagenDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(date);
}

/** Types an address and picks the first suggestion (dev places or Google, whichever is configured). */
export async function chooseAddress(page: Page, fieldId: 'pickup' | 'dropoff', query: string): Promise<void> {
  const input = page.locator(`#${fieldId}`);
  await input.fill(query);
  const option = page.getByRole('option', { name: new RegExp(query, 'i') }).first();
  await option.click();
  await expect(input).toHaveValue(new RegExp(query.split(' ')[0] ?? query, 'i'));
}

export interface BookingInput {
  name: string;
  email: string;
  phone?: string;
  passengers?: number;
}

/** Steps 1–2: journey and vehicle, ending on the details step. Returns the chosen vehicle class. */
export async function bookUntilDetails(page: Page, passengers = 2): Promise<string> {
  await page.goto(`${URLS.website}/en/book`);

  // Step 1: journey
  await expect(page.getByRole('heading', { name: 'Where and when?' })).toBeVisible();
  await chooseAddress(page, 'pickup', 'Copenhagen Airport');
  await chooseAddress(page, 'dropoff', 'Nyhavn');
  await page.locator('#date').fill(copenhagenDate(3));
  await page.locator('#time').fill('10:00');
  await page.locator('#passengers').fill(String(passengers));
  await page.locator('label', { hasText: /^EUR$/ }).click(); // seeded prices are in EUR
  await page.getByRole('button', { name: 'See prices' }).click();

  // Step 2: vehicle
  await expect(page.getByRole('heading', { name: 'Choose your vehicle' })).toBeVisible();
  const firstOption = page.locator('label:has(input[name="vehicle"])').first();
  const className = ((await firstOption.locator('span.font-medium').first().textContent()) ?? '').trim();
  await firstOption.click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  return className;
}

/** Steps 1–4, ending on the test payment page. Returns the chosen vehicle class. */
export async function bookUntilPayment(page: Page, input: BookingInput): Promise<string> {
  const className = await bookUntilDetails(page, input.passengers);

  // Step 3: details
  await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
  await page.getByLabel('Full name').fill(input.name);
  await page.getByLabel('Email', { exact: true }).fill(input.email);
  await page.getByLabel('Mobile phone').fill(input.phone ?? '+45 12 34 56 78');
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  // Step 4: review and pay → test payment page on the API
  await expect(page.getByRole('heading', { name: 'Review and pay' })).toBeVisible();
  await expect(page.getByText(input.name)).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page).toHaveTitle('Test payment');
  return className;
}

/** Pays on the test payment page and returns the booking reference from the confirmation page. */
export async function payAndGetReference(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Booking received' })).toBeVisible({ timeout: 30_000 });
  const body = (await page.locator('main').textContent()) ?? '';
  const reference = /EUL-[A-Z0-9]{4,}/.exec(body)?.[0];
  expect(reference, 'booking reference on the confirmation page').toBeTruthy();
  return reference as string;
}

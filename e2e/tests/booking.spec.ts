import { expect, test } from '@playwright/test';
import { URLS, uniqueId } from '../support/env';
import { expectEmail } from '../support/mailpit';
import { bookUntilDetails, bookUntilPayment, chooseAddress, payAndGetReference } from '../support/website';

/** Customer booking flow on the website: journey → vehicle → details → payment → confirmation. */
test.describe('Booking flow', () => {
  test('empty journey form shows clear errors', async ({ page }) => {
    await page.goto(`${URLS.website}/en/book`);
    await page.getByRole('button', { name: 'See vehicles' }).click();
    await expect(page.getByText('Choose a pickup address from the list.')).toBeVisible();
    await expect(page.getByText('Choose a drop-off address from the list.')).toBeVisible();
    await expect(page.getByText('Choose a date.')).toBeVisible();
    await expect(page.getByText('Choose a time.')).toBeVisible();
  });

  test('pickup and drop-off cannot be the same place', async ({ page }) => {
    await page.goto(`${URLS.website}/en/book`);
    await chooseAddress(page, 'pickup', 'Nyhavn');
    await chooseAddress(page, 'dropoff', 'Nyhavn');
    await page.getByRole('button', { name: 'See vehicles' }).click();
    await expect(page.getByText('Pickup and drop-off must be different.')).toBeVisible();
  });

  test('address search works with the keyboard', async ({ page }) => {
    await page.goto(`${URLS.website}/en/book`);
    await page.locator('#pickup').fill('Tivoli');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.locator('#pickup').press('ArrowDown');
    await page.locator('#pickup').press('Enter');
    await expect(page.locator('#pickup')).toHaveValue(/Tivoli/i);
  });

  test('vehicle step shows no prices; details step shows the calculated price', async ({ page }) => {
    await bookUntilDetails(page);
    // Back to the vehicle list: classes are listed without a price.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Choose your vehicle' })).toBeVisible();
    await expect(page.locator('label:has(input[name="vehicle"])').first()).not.toContainText(/€|kr\.|DKK|\$/);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    // Details step: trip summary with distance, passengers and a total.
    const summary = page.getByRole('region', { name: 'Your trip and price' });
    await expect(summary).toContainText(/km/);
    await expect(summary).toContainText('2 passengers');
    await expect(summary.getByText('Total price')).toBeVisible({ timeout: 20_000 });
    await expect(summary).toContainText(/€\s?\d/);
  });

  test('details step validates email and phone', async ({ page }) => {
    await bookUntilDetails(page);
    await page.getByLabel('Full name').fill('E2E Validation');
    await page.getByLabel('Email', { exact: true }).fill('not-an-email');
    await page.getByLabel('Mobile phone').fill('12');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText(/Enter a valid phone number/)).toBeVisible();
  });

  test('full booking with test payment → confirmation and email', async ({ page, request }) => {
    const email = `e2e-${uniqueId()}@example.com`;
    await bookUntilPayment(page, { name: 'E2E Customer', email });
    const reference = await payAndGetReference(page);

    await expect(page.getByText('Your payment was successful.')).toBeVisible();
    await expectEmail(request, reference, 'booking received');
  });

  test('failed payment shows "Payment not completed" and no booking', async ({ page }) => {
    await bookUntilPayment(page, { name: 'E2E Failed Payment', email: `e2e-${uniqueId()}@example.com` });
    await page.getByRole('button', { name: 'Fail payment' }).click();
    await expect(page.getByRole('heading', { name: 'Payment not completed' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Try again' })).toBeVisible();
  });

  test('@mobile booking on a phone in under five steps', async ({ page }) => {
    await bookUntilPayment(page, { name: 'E2E Mobile', email: `e2e-${uniqueId()}@example.com` });
    const reference = await payAndGetReference(page);
    expect(reference).toMatch(/^EUL-/);
  });
});

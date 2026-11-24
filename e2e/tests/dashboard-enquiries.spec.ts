import { expect, test } from '@playwright/test';
import { loginToDashboard, sidebar } from '../support/dashboard';
import { URLS, uniqueId } from '../support/env';

/** A website message lands in the dashboard inbox; staff open it, mark it handled and reopen it. */
test.describe('Dashboard: enquiries inbox', () => {
  test('the inbox needs a login', async ({ request }) => {
    const res = await request.get(`${URLS.api}/enquiries`);
    expect(res.status()).toBe(401);
  });

  test('a website message can be found, handled and reopened', async ({ page, request }) => {
    const name = `E2E Inbox ${uniqueId()}`;
    const sent = await request.post(`${URLS.api}/public/enquiries`, {
      data: {
        type: 'BUSINESS',
        name,
        email: 'e2e-inbox@example.com',
        company: 'E2E Testing ApS',
        topic: 'business',
        message: 'We need airport pickups for visiting guests, about ten a month.',
        language: 'da',
      },
    });
    expect(sent.status()).toBe(201);

    await loginToDashboard(page);
    await sidebar(page).getByRole('link', { name: 'Enquiries' }).click();
    await expect(page.getByRole('heading', { name: 'Enquiries', level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'New' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('searchbox', { name: 'Search enquiries' }).fill(name);
    await page.getByRole('button', { name: `Open message from ${name}` }).click();

    const dialog = page.getByRole('dialog', { name: 'Business enquiry' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('E2E Testing ApS')).toBeVisible();
    await expect(dialog.getByText('Business page')).toBeVisible();
    await expect(dialog.getByText('DA', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', /^mailto:e2e-inbox@example\.com\?subject=/);

    await dialog.getByRole('button', { name: 'Mark handled' }).click();
    await expect(dialog.getByRole('button', { name: 'Reopen' })).toBeVisible();
    await expect(dialog.getByText(/^by .+, /)).toBeVisible();
    await page.keyboard.press('Escape');

    // Gone from "New", listed under "Handled".
    await expect(page.getByRole('button', { name: `Open message from ${name}` })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Handled' }).click();
    await expect(page).toHaveURL(/tab=handled/);
    await page.getByRole('button', { name: `Open message from ${name}` }).click();
    await dialog.getByRole('button', { name: 'Reopen' }).click();
    await expect(dialog.getByRole('button', { name: 'Mark handled' })).toBeVisible();
  });
});

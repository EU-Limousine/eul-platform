import { expect, test } from '@playwright/test';
import { ADMIN, URLS } from '../support/env';

/** Login screen. Two real login attempts only (the API allows 10 a minute). */
test.describe('Dashboard login', () => {
  test('signed-out users are sent to the login screen', async ({ page }) => {
    await page.goto(`${URLS.dashboard}/bookings`);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('the password can be shown and hidden', async ({ page }) => {
    await page.goto(`${URLS.dashboard}/login`);
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('secret-value');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('the theme toggle works on the login screen and is remembered', async ({ page }) => {
    await page.goto(`${URLS.dashboard}/login`);
    await expect(page.locator('html')).not.toHaveClass(/dark/); // light by default
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('a wrong password shows an error and stays on login', async ({ page }) => {
    await page.goto(`${URLS.dashboard}/login`);
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the right password opens the dashboard, survives a reload, and logs out', async ({ page }) => {
    await page.goto(`${URLS.dashboard}/login`);
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    await page.reload(); // refresh cookie keeps the session (access token is memory only)
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    await page.getByRole('banner').getByRole('button').last().click(); // user menu
    await page.getByRole('menuitem', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(`${URLS.dashboard}/`);
    await expect(page).toHaveURL(/\/login$/); // really signed out
  });
});
